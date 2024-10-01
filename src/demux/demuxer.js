/**
 * Copyright (c) V-Nova International Limited 2014 - 2024
 * All rights reserved.
 *
 * This software is licensed under the BSD-3-Clause-Clear License. No patent licenses
 * are granted under this license. For enquiries about patent licenses, please contact
 * legal@v-nova.com. The LCEVCdecJS software is a stand-alone project and is NOT A
 * CONTRIBUTION to any other project.
 *
 * If the software is incorporated into another project, THE TERMS OF THE
 * BSD-3-CLAUSE-CLEAR LICENSE AND THE ADDITIONAL LICENSING INFORMATION CONTAINED IN
 * THIS FILE MUST BE MAINTAINED, AND THE SOFTWARE DOES NOT AND MUST NOT ADOPT THE
 * LICENSE OF THE INCORPORATING PROJECT. However, the software may be incorporated
 * into a project under a compatible license provided the requirements of the
 * BSD-3-Clause-Clear license are respected, and V-Nova International Limited remains
 * licensor of the software ONLY UNDER the BSD-3-Clause-Clear license (not the
 * compatible license).
 *
 * ANY ONWARD DISTRIBUTION, WHETHER STAND-ALONE OR AS PART OF ANY OTHER PROJECT,
 * REMAINS SUBJECT TO THE EXCLUSION OF PATENT LICENSES PROVISION OF THE
 * BSD-3-CLAUSE-CLEAR LICENSE.
 */

// //@ts-check

import { Log } from '../log.ts';
import { Codec } from '../globals/enums';
import DataViewReader from './data_view_reader';
import DemuxerData from './demuxer_data';
import DemuxerLoader from './demuxer_loader';

let now;
try {
  // eslint-disable-next-line
  now = self.performance.now.bind(global.performance);
} catch (err) {
  // eslint-disable-next-line
  now = self.Date.now;
}

/** @private @type {ArrayBuffer} */
const lcevcUUID = new Uint8Array([
  0xa7,
  0xc4,
  0x6d,
  0xed,
  0x49,
  0xd8,
  0x38,
  0xeb,
  0x9a,
  0xad,
  0x6d,
  0xa6,
  0x84,
  0x97,
  0xa7,
  0x54
]);

/** @private @type {ArrayBuffer} */
const lcevcITU = new Uint8Array([0xb4, 0x00, 0x50, 0x00]);

/** @private @type {object} */
const BoxTypes = {
  FTYP: 1718909296,
  MDAT: 1835295092,
  MFHD: 1835427940,
  MOOF: 1836019558,
  MOOV: 1836019574,
  SAIO: 1935763823,
  SAIZ: 1935763834,
  SBGP: 1935828848,
  SGPD: 1936158820,
  SIDX: 1936286840,
  STYP: 1937013104,
  SUBS: 1937072755,
  TFDT: 1952867444,
  TFHD: 1952868452,
  TRAF: 1953653094,
  TRUN: 1953658222
};

class Demuxer {
  /** @private @type {Map} */
  #lcevcMap = null;

  /** @private @type {number} */
  #filepos = 0;

  /** @private @type {number} */
  #baseMediaDecodeTime = 0;

  /** @private @type {boolean} */
  #timeStampOffsetFound = false;

  /** @private @type {MP4Box} */
  #mp4box = null;

  /** @private @type {Decoder} */
  #ebml = null;

  /** @private @type {number} */
  #webmTimecode = 0;

  /** @private @type {number} */
  #webmTimecodeOffset = 0;

  /** @private @type {number} */
  #webmBlockDuration = 0;

  /** @private @type {number} */
  #webmDuration = 0;

  /** @private @type {number} */
  #webmTimeScale = 0;

  /** @private @type {number} */
  #webmBlockAddId = 0;

  /** @private @type {number} */
  #ptsStart = 0;

  /** @private @type {number} */
  #ptsEnd = 0;

  /** @private @type {number} */
  #level = -1;

  /** @private @type {boolean} */
  #isRawLcevc = false;

  /** @private @type {number} */
  #mp4SampleCount = 0

  /** @private @type {DataViewReader} */
  #dataViewReader = null;

  /** @private @type {number} */
  #previousSampleCount = 0;

  /** @private @type {number} */
  #prevTimeStampOffset = 0;

  /** @private @type {number} */
  #mp4mdatSize = 0;

  /** @private @type {number} */
  #workerSelf = null;

  constructor(workerSelf) {
    this.#workerSelf = workerSelf;
  }

  /**
   *
   * @returns {Map}
   * @readonly
   * @memberof Demuxer
   */
  get lcevcMap() {
    return this.#lcevcMap;
  }

  /**
   * Returns true if the arrays are identical else false.
   *
   * @param {Uint8Array} arrayOne The first array.
   * @param {Uint8Array} arrayTwo The second array.
   * @returns {boolean} True if arrays are equal, otherwise false.
   * @memberof Demuxer
   * @private
   */
  static compareArrays(arrayOne, arrayTwo) {
    if (arrayOne.length !== arrayTwo.length) {
      return false;
    }
    const { length } = arrayOne;
    for (let i = 0; i < length; i += 1) {
      if (arrayOne[i] !== arrayTwo[i]) {
        return false;
      }
    }
    return true;
  }

  /**
  * Callback from EBML Decoder for parsing Data for lcevc extraction
  *
  * @param {Uint8Array} sample WebM parsed sample.
  * @memberof Demuxer
  * @private
  */
  #onEbmlData(sample) {
    this.#previousSampleCount = 0;

    if (sample.length <= 1) {
      return;
    }

    const sampleName = sample[1].name;

    const handleTimecodeScale = () => {
      this.#webmTimeScale = sample[1].value / 1000;
    };

    const handleTimecode = () => {
      this.#webmTimecodeOffset = sample[1].value * 1;
    };

    const handleBlockAddID = () => {
      this.#webmBlockAddId = sample[1].data[0];
    };

    const handleBlock = () => {
      this.#webmTimecode = this.#webmTimecodeOffset + (sample[1].value * 1);
      this.#webmDuration = sample[1].value - this.#webmBlockDuration;
      this.#webmBlockDuration = sample[1].value;
    };

    const handleBlockAdditional = () => {
      if (this.#baseMediaDecodeTime !== this.#prevTimeStampOffset) {
        this.#previousSampleCount = 0;
      }

      if (this.#timeStampOffsetFound) {
        const dts = this.#baseMediaDecodeTime + this.#previousSampleCount * this.#webmBlockDuration;
        this.#webmTimecode = this.#baseMediaDecodeTime
          + this.#webmTimecode - dts + this.#previousSampleCount * this.#webmBlockDuration;
      }

      const frameSample = [
        this.#webmTimecode,
        this.#webmTimeScale,
        this.#webmDuration,
        this.#baseMediaDecodeTime,
        false,
        1
      ];

      this.#findAndStoreLcevcDataWebm(sample[1].data, frameSample, this.#level);
      this.#prevTimeStampOffset = this.#baseMediaDecodeTime;

      Log.debug(`Base Media Decode Time: ${this.#baseMediaDecodeTime}`);
    };

    const validSampleNames = [
      'Timecode',
      'TimecodeScale',
      'Block',
      'BlockAddID',
      'BlockAdditional'
    ];

    if (validSampleNames.includes(sampleName)) {
      switch (sampleName) {
        case 'TimecodeScale':
          handleTimecodeScale();
          break;
        case 'Timecode':
          handleTimecode();
          break;
        case 'BlockAddID':
          handleBlockAddID();
          break;
        case 'Block':
          handleBlock();
          break;
        case 'BlockAdditional':
          handleBlockAdditional();
          break;
        default:
          Log.debug('Skipping Sample');
      }
    }
  }

  /**
   * Resets the lcevc Map.
   *
   * @memberof Demuxer
   * @public
   */
  _resetLcevcMap() {
    this.#lcevcMap = new Map();
  }

  /**
   * Initialises the demuxer.
   *
   * @memberof Demuxer
   * @public
   */
  _demuxInit() {
    // When we create a worker, it gets executed twice. The first time in the global context,
    // The second time in the context of the worker, where importScripts is available
    if (typeof importScripts !== 'function') return;

    // Synchronous load of MP4Box, only loaded once
    if (Demuxer.MP4Demuxer.loadOnStartup && Demuxer.MP4Demuxer.isWaiting()) {
      Demuxer.MP4Demuxer.load();
    }

    if (Demuxer.WebMDemuxer.loadOnStartup && Demuxer.WebMDemuxer.isWaiting()) {
      Demuxer.WebMDemuxer.promise = Demuxer.WebMDemuxer.load().then(() => this._demuxInit());
    }

    this.#previousSampleCount = 0;
    this._resetLcevcMap();

    if (Demuxer.WebMDemuxer.isLoaded()) {
      this.#ebml = new EbmlDecoder(); // eslint-disable-line no-undef
      this.#ebml.on('data', this.#onEbmlData.bind(this));
    }

    if (Demuxer.MP4Demuxer.isLoaded()) {
      this.#mp4box = MP4Box.createFile(); // eslint-disable-line no-undef
      this.#filepos = 0;

      this.#mp4box.onError = (e) => {
        Log.debug('mp4box failed to parse data.');
        Log.error(e);
      };

      this.#mp4box.onMoovStart = (info) => {
        Log.debug('Starting to receive File Information');
        Log.debug(info);
      };

      this.#mp4box.onReady = (info) => {
        Log.debug('Received File Information');
        this.#mp4box.setExtractionOptions(info.tracks[0].id, this, {
          nbSamples: 1000
        });
        this.#mp4box.start();
      };

      this.#mp4box.onSamples = (id, user, samples, level) => {
        let i = 0;
        let duration = 0;

        do {
          if (samples[i]) {
            ({ duration } = samples[i]);
          } else {
            break;
          }
          i += 1;
        } while (duration < 2 || duration > 7200);

        if (this.#baseMediaDecodeTime !== this.#prevTimeStampOffset) {
          this.#previousSampleCount = 0;
        }

        Log.debug(`Base Media Decode Time: ${this.#baseMediaDecodeTime}`);

        // Loop through samples.
        for (i = samples.length; i > 0; i -= 1) {
          const x = samples.length - i;

          // Calulation to correct timestamps when seeking.
          if (this.#timeStampOffsetFound) {
            // eslint-disable-next-line no-param-reassign
            samples[x].dts = this.#baseMediaDecodeTime + (x + this.#previousSampleCount) * duration;
            // eslint-disable-next-line no-param-reassign
            samples[x].cts = this.#baseMediaDecodeTime
              + samples[x].cts - samples[x].dts + (x + this.#previousSampleCount) * duration;
          }

          if (typeof level === 'undefined') {
            // eslint-disable-next-line no-param-reassign
            level = this.#level;
          }

          const { data } = samples[x];
          const mapKey = samples[x].cts;
          const frameSample = [
            samples[x].cts,
            samples[x].timescale,
            samples[x].duration,
            this.#baseMediaDecodeTime,
            samples[x].is_sync,
            0
          ];

          // Raw LCEVC data can be directly passed to the residual store, whereas encapsulated
          // LCEVC data will need further demuxing and processing
          if (this.#isRawLcevc) {
            this._demuxedLcevcData(data, ...frameSample.slice(0, -1), level);
          } else {
            Demuxer.convertLengthPrefixToAnnexB(data);
            this.#findAndStoreLcevcDataAnnexB(data, mapKey, frameSample, level);
          }
        }
        this.#previousSampleCount = samples.length;
        this.#prevTimeStampOffset = this.#baseMediaDecodeTime;
      };
    }
  }

  /**
   * Reads in an MP4 file array buffer.
   *
   * @param {ArrayBuffer} arrayBuffer A MP4 file or fragments in the form of an ArrayBuffer.
   * @param {!number} ptsStart Start of the buffer.
   * @param {!number} ptsEnd End of the buffer.
   * @param {!number} level End of the buffer.
   * @memberof Demuxer
   * @private
   */
  async #readMP4StreamData(arrayBuffer, ptsStart, ptsEnd, level) {
    // Synchronous load of MP4Box once MP4/TS content is being played
    // No need to use MP4Demuxer.promise or check isLoading() since this is a synchronous load
    if (Demuxer.MP4Demuxer.isWaiting()) {
      Demuxer.MP4Demuxer.load();
      this._demuxInit();
    }
    if (arrayBuffer.length > 0 || arrayBuffer.byteLength > 0) {
      this.#timeStampOffsetFound = this.#getSegTimeStampOffset(arrayBuffer);
      arrayBuffer.fileStart =  this.#filepos; // eslint-disable-line
      this.#ptsStart = ptsStart;
      this.#ptsEnd = ptsEnd;
      this.#level = level;
      this.#filepos = this.#mp4box.appendBuffer(arrayBuffer, false, level, ptsStart, ptsEnd);
    }
  }

  /**
     * Apprehends the data and passes the data on to the required demuxer
     *
     * @param {ArrayBuffer} arrayBuffer A MP4 file or fragments in the form of an ArrayBuffer.
     * @param {!number} ptsStart Start of the buffer.
     * @param {!number} ptsEnd End of the buffer.
     * @param {!number} level Profile being played.
     * @param {!number} containerFormat is the stream webm.
     * @memberof Demuxer
     * @public
     */
  async _selectDemuxer(arrayBuffer, ptsStart, ptsEnd, level, containerFormat) {
    const demuxInit = (err) => {
      Log.debug(err);
      this._demuxInit();
      if (containerFormat === 1) {
        this.#readWebmStreamData(arrayBuffer, ptsStart, ptsEnd, level);
      } else {
        this.#readMP4StreamData(arrayBuffer, ptsStart, ptsEnd, level);
      }
    };

    if (containerFormat === 1) {
      this.#readWebmStreamData(arrayBuffer, ptsStart, ptsEnd, level).catch((e) => demuxInit(e));
    } else {
      this.#readMP4StreamData(arrayBuffer, ptsStart, ptsEnd, level).catch((e) => demuxInit(e));
    }
  }

  /**
     * Directly Feeds the LCEVC data to residual store
     *
     * @param {ArrayBuffer} lcevcData A MP4 file or fragments in the form of an ArrayBuffer.
     * @param {!number} timestamp Timestamp associated with the frame
     * @param {!number} timescale Timescale associated with the timestamp
     * @param {!number} duration duration of the buffer
     * @param {!number} baseDecodeTime base frame decode time
     * @param {!boolean} keyframe true if frame is a keyframe
     * @param {!number} level profile for the appended LCEVC data
     * @memberof Demuxer
     * @public
     */
  async _demuxedLcevcData(lcevcData, timestamp, timescale, duration, baseDecodeTime, keyframe,
    level) {
    const frameSample = [
      timestamp,
      timescale,
      duration,
      baseDecodeTime,
      keyframe,
      0
    ];
    this.#workerSelf.postMessage({
      id: 'lcevcData',
      end: false,
      level,
      frameSample,
      pssData: lcevcData
    });
  }

  /**
     * Directly Feeds the LCEVC data to parse NAL units and feed to residual store
     *
     * @param {ArrayBuffer} lcevcData A MP4 file or fragments in the form of an ArrayBuffer.
     * @param {!number} timestamp Timestamp associated with the frame
     * @param {!number} naluFormat Nal Unit Format - 1: AVCC 2: Annex-B
     * @memberof Demuxer
     * @public
     */
  async _rawNalLcevcData(lcevcData, timestamp, naluFormat) {
    const frameSample = [
      timestamp,
      1,
      Number.NaN,
      Number.NaN,
      true,
      0
    ];
    if (naluFormat !== 2) {
      Demuxer.convertLengthPrefixToAnnexB(lcevcData);
    }
    this.#findAndStoreLcevcDataAnnexB(lcevcData, timestamp, frameSample, -1);
  }

  /**
   * Reads in an Webm file array buffer.
   *
   * @param {ArrayBuffer} arrayBuffer A MP4 file or fragments in the form of an ArrayBuffer.
   * @param {!number} ptsStart Start of the buffer.
   * @param {!number} ptsEnd End of the buffer.
   * @param {!number} level End of the buffer.
   * @memberof Demuxer
   * @private
   */
  async #readWebmStreamData(arrayBuffer, ptsStart, ptsEnd, level) {
    // Asynchronous load of EBML once WebM content is being played
    // Incoming array buffers will be queued for demuxing once EBML has finished loading.
    // Difficult to make this synchronous since we use fetch() which is async
    if (Demuxer.WebMDemuxer.isWaiting()) {
      Demuxer.WebMDemuxer.promise = Demuxer.WebMDemuxer.load().then(() => this._demuxInit());
      Demuxer.WebMDemuxer.promise
        .then(() => this.#readWebmStreamData(arrayBuffer, ptsStart, ptsEnd, level));
      return;
    }
    if (Demuxer.WebMDemuxer.isLoading()) {
      Demuxer.WebMDemuxer.promise
        .then(() => this.#readWebmStreamData(arrayBuffer, ptsStart, ptsEnd, level));
      return;
    }
    if (arrayBuffer.length > 0 || arrayBuffer.byteLength > 0) {
      this.#ptsStart = ptsStart;
      this.#ptsEnd = ptsEnd;
      this.#level = level;
      this.#ebml.write(Buffer.from(arrayBuffer));
      this.#timeStampOffsetFound = this.#getSegTimeStampOffset(arrayBuffer);
    }
  }

  /**
   * Extracts and stores lcevc data from an Annex-B (ISO/IEC 14496-10)
   * formatted H264, H265, and H266 frame.
   *
   * @param {ArrayBuffer} frame
   * @param {Map} mapKey
   * @param {object} frameSample
   * @param {number} levelVar
   * @returns {boolean} True if lcevc data was found else false.
   * @memberof Demuxer
   * @private
   */
  #findAndStoreLcevcDataAnnexB(frame, mapKey, frameSample, levelVar) {
    const frameSize = frame.length;
    for (let i = 0; i < frameSize; i += 1) {
      let seiLength = 0;

      // Look for the start of NAL Unit
      if (!Demuxer.isNalUnitHeader(frame, i)) {
        continue; // eslint-disable-line
      }

      // Check if this NAL Unit is a SEI Segment, since LCEVC is stored in SEI segments
      // If yes, header will contain the parsed info
      const header = Demuxer.isNalUnitSeiSegment(frame, i);
      if (!header.isSeiSegment) {
        continue; // eslint-disable-line
      }

      // Move past the NAL Unit header
      i += header.headerLength;

      // Read the SEI Payload Size.
      do {
        seiLength += frame[i];
      } while (frame[i++] === 0xff); // eslint-disable-line

      if (
        (!header.registered && seiLength > lcevcUUID.length)
      || (header.registered && seiLength > lcevcITU.length)
      ) {
        /* Look for lcevc Data */
        let pssData;
        if (!header.registered) {
          const slice = frame.subarray(i, i + lcevcUUID.length);
          if (Demuxer.compareArrays(slice, lcevcUUID)) {
            i += lcevcUUID.length;
            pssData = new Uint8Array(seiLength - lcevcUUID.length);
          } else {
            i += seiLength;
            continue; // eslint-disable-line
          }
        } else if (header.registered) {
          const slice = frame.subarray(i, i + lcevcITU.length);
          if (Demuxer.compareArrays(slice, lcevcITU)) {
            i += lcevcITU.length;
            pssData = new Uint8Array(seiLength - lcevcITU.length);
          } else {
            i += seiLength;
            continue; // eslint-disable-line
          }
        }

        let currentPos = i;
        for (let j = 0; j < pssData.length; j += 1) {
          // Remove the emulation prevention bytes.
          if (
            frame[currentPos - 2] === 0x00
          && frame[currentPos - 1] === 0x00
          && frame[currentPos] === 0x03
          ) {
            currentPos += 1;
          }
          pssData[j] = frame[currentPos];
          currentPos += 1;
        }

        this.#workerSelf.postMessage({
          id: 'lcevcData',
          end: false,
          level: levelVar,
          frameSample,
          pssData
        });

        return true;
      }
      i += seiLength;
    }
    return false;
  }

  /**
   * Extracts and stores lcevc data from a webm Sample Additions
   * for VP8,VP9 and AV1 blocks
   *
   * @param {ArrayBuffer} frame
   * @param {object} frameSampleIn
   * @param {number} levelVar
   * @returns {boolean} True if lcevc data was found else false.
   * @memberof Demuxer
   * @private
   */
  #findAndStoreLcevcDataWebm(frame, frameSampleIn, levelVar) {
    let foundType = 0; // 0: not found, 1: unregistered, 2: registered.

    const frameSample = frameSampleIn;
    const frameSize = frame.length;
    if (this.#webmBlockAddId === 5) {
      for (let i = 0; i < frameSize; i += 1) {
        if (frame[i] === 0x00
          && frame[i + 1] === 0x00
          && frame[i + 2] === 0x01
          && (frame[i + 3] === 0x79
          || frame[i + 3] === 0x7B)) {
          /*
          NAL Header structure for WebM data
          |0|1|2|3|4|5|6|7|0|1|2|3|4|5|6|7|
          |F|F|NALType  |Reserved         |

          According to LCEVC spec:
          1. F are forbidden bits.
          2. NALType contains type of RBSP data structure contained in the NAL unit.
          3. Reserved are reserved bits and should be 1.

          In WebM, NALType = 28 represents non-IDR segment (not a keyframe).
          NALType = 29 represents IDR segment (keyframe).

          With these conditions, if the value immediately after a header sequence of 0x000001 is
          equal to 0x7B (decimal 123), this is an IDR segment. Alternatively, if 0x79 (decimal 121)
          this is a non-IDR segment.

          Although it seems that not every IDR segment results in a successful parse. When decoding,
          dpi.js accounts for this when parsing from a keyframe.
          */

          // value of true signals an IDR segment (keyframe) for the decoder
          frameSample[4] = frame[i + 3] === 0x7B;
          foundType = 2;
          break;
        }
      }
      if (foundType === 2) {
        const pssData = frame;
        this.#workerSelf.postMessage({
          id: 'lcevcData',
          end: false,
          level: levelVar,
          frameSample,
          pssData
        });
      }
      return true;
    }
    return false;
  }

  /**
   * Get the base media decode time.
   *
   * @private
   * @param {!ArrayBuffer} mp4Data
   * @returns {boolean}
   * @memberof Demuxer
   * @private
   */
  #getSegTimeStampOffset(mp4Data) {
    this.#dataViewReader = new DataViewReader(mp4Data, false);
    const DATA_IN_SIZE = this.#dataViewReader.getLength();
    let foundTFDT = false;
    let foundMDAT = false;

    const box = new DemuxerData();

    const readBoxHeader = (dataViewReader) => {
      box.startPosition = dataViewReader.getPosition();
      box.size = dataViewReader.readUint32();
      box.type = dataViewReader.readUint32();
    };

    const gotoNextBox = (dataViewReader) => {
      if (dataViewReader.getPosition() !== box.startPosition) {
        dataViewReader.setPosition(box.startPosition);
      }
      dataViewReader.skip(box.size);
    };

    /*
    +--------------------------------------+
    |moov                                  |
    +--------------------------------------+
    |ftyp                                  |
    +--------------------------------------+
    |       +------+----+----+----+----++  |
    | moof  |traf  |tfhd|sbgp|subs|saio||  |
    |       |      +----+----+----+----+|  |
    |+----+ |      |trun|sgpd|saiz|tfdt||  |
    ||mfhd| |      +----+----+----+----+|  |
    |+----+ +---------------------------+  |
    +--------------------------------------+
    |mdat                                  |
    +--------------------------------------+
    */
    do {
      readBoxHeader(this.#dataViewReader);

      if (box.type === BoxTypes.FTYP) {
        gotoNextBox(this.#dataViewReader);
        readBoxHeader(this.#dataViewReader);
      }

      if (box.type === BoxTypes.MOOV) {
        // If the 'moov' box is found assume and init segment was found.
        this._demuxInit();
        gotoNextBox(this.#dataViewReader);

        if (this.#dataViewReader.hasMoreData()) {
          readBoxHeader(this.#dataViewReader);
        }
      }

      if (box.type === BoxTypes.MOOF) {
        readBoxHeader(this.#dataViewReader);

        if (box.type === BoxTypes.MFHD) {
          gotoNextBox(this.#dataViewReader);
          readBoxHeader(this.#dataViewReader);
        }

        if (box.type === BoxTypes.TRAF) {
          while (this.#dataViewReader.hasMoreData()) {
            readBoxHeader(this.#dataViewReader);

            if (box.type === BoxTypes.TRUN) {
              this.#dataViewReader.rewind(1);
              const sampleCount = this.#dataViewReader.readUint32();
              this.#mp4SampleCount = sampleCount;

              gotoNextBox(this.#dataViewReader);
            } else if (box.type === BoxTypes.TFDT) {
              foundTFDT = true;
              if (this.#dataViewReader.readUint8() === 1) {
                this.#dataViewReader.skip(3);
                this.#baseMediaDecodeTime = this.#dataViewReader.readInt64();
              } else {
                this.#dataViewReader.skip(3);
                this.#baseMediaDecodeTime = this.#dataViewReader.readInt32();
              }
              // break;
            } else if (box.type === BoxTypes.TFHD) {
              gotoNextBox(this.#dataViewReader);
            } else if (box.type === BoxTypes.SBGP) {
              gotoNextBox(this.#dataViewReader);
            } else if (box.type === BoxTypes.SUBS) {
              gotoNextBox(this.#dataViewReader);
            } else if (box.type === BoxTypes.SAIO) {
              gotoNextBox(this.#dataViewReader);
            } else if (box.type === BoxTypes.SGPD) {
              gotoNextBox(this.#dataViewReader);
            } else if (box.type === BoxTypes.SAIZ) {
              gotoNextBox(this.#dataViewReader);
            } else {
              break;
            }
          }
        }
      }

      if (box.type === BoxTypes.MDAT) {
        foundMDAT = true;
        this.#mp4mdatSize = box.size;
        if (foundTFDT) {
          break;
        }
      }

      if (box.startPosition + box.size >= DATA_IN_SIZE) {
        break;
      } else {
        gotoNextBox(this.#dataViewReader);
      }
    } while (this.#dataViewReader.hasMoreData());

    /*
     * If the mdat box is in a seperate segment such is the
     * case after hls.js transmuxes a Transport Stream to fmp4.
     * Then keep using the Base Media Decode Time of the previous
     * segment.
     */
    if (foundMDAT && !foundTFDT) {
      return this.#timeStampOffsetFound;
    }

    return foundTFDT;
  }

  /**
   * Set if passed buffers contain raw LCEVC data.
   *
   * @param {boolean} value true if buffers contain raw LCEVC data
   * @memberof Demuxer
   * @public
   */
  _setIsRawLcevc(value) {
    this.#isRawLcevc = value;
  }

  /**
   * Converts length prefix formatted buffers to AnnexB (ISO/IEC 14496-10)
   * format. This may need to be done if the stream packager does not correctly
   * follow the AVCC standard and leaves start codes mixed with NALU sizes.
   *
   * @param {ArrayBuffer} frameData
   * @memberof Demuxer
   * @private
   */
  static convertLengthPrefixToAnnexB(frameData) {
    let i = 0;
    let naluSize = 0;
    do {
      naluSize = 0;
      naluSize |= frameData[i];
      naluSize = (naluSize << 8) | frameData[i + 1];
      naluSize = (naluSize << 8) | frameData[i + 2];
      naluSize = (naluSize << 8) | frameData[i + 3];

      frameData[i] = 0x00; // eslint-disable-line
      i += 1;
      frameData[i] = 0x00; // eslint-disable-line
      i += 1;
      frameData[i] = 0x00; // eslint-disable-line
      i += 1;
      frameData[i] = 0x01; // eslint-disable-line
      i += 1;

      i += naluSize;
    } while (i < frameData.length);
  }

  /**
   * Checks for NAL Unit header [0x00, 0x00, 0x01] at the given position in array
   *
   * @param {ArrayBuffer} frame the array to check
   * @param {number} index the index
   * @returns {boolean} true if the current index points to the start of NAL Unit header
   * @memberof Demuxer
   * @private
   */
  static isNalUnitHeader(frame, index) {
    return frame[index] === 0x00
      && frame[index + 1] === 0x00
      && frame[index + 2] === 0x01;
  }

  /**
   * Checks if given NAL Unit is a SEI segment, since LCEVC data is enclosed in SEI segments
   * If yes, additional info will be returned such as codec and header length.
   * Assumes NAL Unit header [0x00, 0x00, 0x01] has already been found at this position in array.
   *
   * @param {ArrayBuffer} frame the array to parse from
   * @param {number} index the index
   * @returns {object} the parsed header object, including codec and header length
   * @memberof Demuxer
   * @private
   */
  static isNalUnitSeiSegment(frame, index) {
    /*
    NAL Header structure for H264
    |0|1|2|3|4|5|6|7|
    |F|NR |NALType  |

    In H264, NALType = 6 represents SEI segment. According to H264 spec:
     1. F should always be 0
     2. When NALType = 6, NR should be 0
    Therefore, it is enough to check whether the 1st byte equals 0x06 to find SEI.

    NAL Header structure for H265
    |0|1|2|3|4|5|6|7|0|1|2|3|4|5|6|7|
    |F|NALType    |R6bits     |TIDP |

    In H265, NALType = 39 represents SEI segment. According to H265 spec:
     1. F should always be 0
     2. R6bits are reserved and should be 0.
    With these conditions, to find SEI the 1st byte should then equal (39 << 1), which is 0x4E.

    NAL Header structure for H266
    |0|1|2|3|4|5|6|7|0|1|2|3|4|5|6|7|
    |F|R|LayerID    |NALType  |TIDP |

    In H266, NALType = 23 represents SEI segment. However, the NALType is
    located in the 2nd byte. Also, since TIDP may take on a range of values,
    a right unsigned shift is needed to extract the NALType.
    */

    let codec;
    let headerLength;
    let registered;

    const headerStart = index + 3;
    if (frame[headerStart] === 0x06) {
      codec = Codec.H264;
      headerLength = 5;
    } else if (frame[headerStart] === 0x4E) {
      codec = Codec.H265;
      headerLength = 6;
    } else if ((frame[headerStart + 1] >>> 3) === 0x17) {
      codec = Codec.H266;
      headerLength = 6;
    } else {
      return {};
    }

    const lastByte = index + headerLength - 1;
    if (frame[lastByte] === 0x04) {
      registered = true; // registered, should look for LCEVC ITU
    } else if (frame[lastByte] === 0x05) {
      registered = false; // unregistered, should look for LCEVC UUID
    } else {
      return {};
    }

    return {
      isSeiSegment: true, codec, headerLength, registered
    };
  }

  /** @static @type {DemuxerLoader} */
  static MP4Demuxer = new DemuxerLoader(
    (version) => `https://cdn.jsdelivr.net/npm/mp4box@${version}/dist/mp4box.all.min.js`,
    (url, done) => {
      importScripts(url);
      done();
    }
  );

  /** @static @type {DemuxerLoader} */
  static WebMDemuxer = new DemuxerLoader(
    (version) => `https://cdn.jsdelivr.net/npm/ebml@${version}/lib/ebml.esm.min.js`,
    (url, done) => fetch(url)
      .then((response) => response.blob())
      .then((binary) => binary.text())
      .then((code) => {
        const replaced = code
          .replace(/require\("debug"\).*?\)/g, 'function(arg) { console.log(arg); }')
          .replace(/export\{.*Decoder.*;/g, '')
          .replace(/sourceMappingURL.*map/g, '');
        const binary = new Blob([replaced], { type: 'text/javascript' });
        return URL.createObjectURL(binary);
      })
      .then((localUrl) => {
        importScripts(localUrl);
        done();
      })
  );
}

export default Demuxer;
