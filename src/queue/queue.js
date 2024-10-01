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

import { Log } from '../log.ts';
import {
  LcevcStatus,
  LoqIndex, Result, ShaderPaths, Player, MediaContainer, StreamingFormat
} from '../globals/enums';
import { libDPI } from '../globals/libdpi.ts';
import {
  _createFBO,
  _createTexture,
  _deleteFBO,
  _deleteTexture
} from '../graphics/webgl';
import QueueFrame from './queue_frame';
import Offsets from './offsets';
import EnvironmentUtils from '../utils/environment_utils';

/**
 * The Queue class stores the frames into a queue for later be rendered.
 *
 * Storing the frames on a queue makes it decouple from the base video and adds
 * a delay, however, it improve the performance due to the overhead added for
 * using V-Nova LCEVC DPI.
 *
 * The queue size is fixed, once a frame is added to the queue, it is never
 * deleted, instead it is reused for later because deleting is slower.
 *
 * @class Queue
 */
class Queue {
  /** @private @type {LCEVCdec} */
  #lcevcDec = null;

  /** @private @type {WebGLRenderingContext} */
  #gl = null;

  /** @private @type {number} */
  #queueLength = 0;

  /** @private @type {number} */
  #queueLengthMax = 10;

  /** @private @type {QueueFrame[]} */
  #queueFrames = [];

  /** @private @type {Object} */
  #offsets = null;

  /** @private @type {Offsets} */
  #offsetObj = null;

  /** @private @type {number} */
  #presentationDelay = 0.1;

  /** @private @type {number} */
  #presentationTimeSync = null;

  /** @private @type {boolean} */
  #initComplete = false;

  /** @private @type {number} */
  #displayFrameIndex = -1;

  /** @private @type {number} */
  #recentMediaTimeInput = -1;

  /** @private @type {number} */
  #recentFrameRate = 0;

  /** @private @type {WebGLTexture} */
  #texVid = null;

  /** @private @type {WebGLTexture} */
  #texBase = null;

  /** @private @type {WebGLTexture} */
  #texHigh = null;

  /** @private @type {number} */
  #idCount = 0;

  /** @private @type {boolean} */
  #lcevcParsed = false;

  /** @private @type {boolean} */
  #lastFrameLcevcParsed = false;

  /** @private @type {number} */
  #audioDelay = 0.01;

  /** @private @type {number} */
  #currentLcevcWidth = 0;

  /** @private @type {number} */
  #currentLcevcHeight = 0;

  /** @private @type {number} */
  #currentBaseWidth = 0;

  /** @private @type {number} */
  #currentBaseHeight = 0;

  /** @private @type {boolean} */
  #is1D = false;

  /** @private @type {string} */
  #browser = '';

  /** @private @type {string} */
  #player = '';

  /** @private @type {Array} */
  #previousRenderTimes = [];

  /** @private @type {number} */
  #previousRenderTimesLength = 100;

  /**
   * Creates a Queue instance object.
   *
   * @param {LCEVCdec} lcevcDec The LCEVCdec object.
   * @param {WebGLRenderingContext} gl The WebGL rendering context.
   * @memberof Queue
   */
  constructor(lcevcDec, gl) {
    this.#lcevcDec = lcevcDec;
    this.#gl = gl;

    this.#texVid = _createTexture(this.#gl);
    this.#texBase = _createTexture(this.#gl);
    this.#texHigh = _createTexture(this.#gl);

    this.#initComplete = true;

    this.#player = EnvironmentUtils.detectPlayer();
    this.#browser = this.#lcevcDec.currentBrowser.browser;
    this.#offsetObj = new Offsets(this.#browser, this.#player);
    this.#offsets = this.#offsetObj.getOffsets(this.#lcevcDec.containerFormat,
      this.#lcevcDec.isLive);

    return Result.OK;
  }

  /**
   * Returns the framerate of the last frame that was added to the queue.
   *
   * @returns {number} The framerate.
   * @readonly
   * @memberof Queue
   * @public
   */
  get _displayFrame() {
    return this.#queueFrames[this.#displayFrameIndex];
  }

  /**
   * Returns if the frame is 1D
   *
   * @returns {number} is 1D.
   * @readonly
   * @memberof Queue
   * @public
   */
  get _is1D() {
    return this.#is1D;
  }

  /**
   *
   * @readonly
   * @returns {number}
   * @memberof Queue
   * @public
   */
  get _getAudioDelay() {
    return this.#audioDelay;
  }

  /**
   *
   * @readonly
   * @returns {number}
   * @memberof Queue
   * @public
   */
  get _recentFrameRate() {
    return this.#recentFrameRate;
  }

  /**
   * Returns if LCEVC was parsed in the last frame that was added to the queue.
   *
   * @returns {boolean} `true` if parsed, otherwise `false`.
   * @readonly
   * @memberof Queue
   * @public
   */
  get _isLcevcParsed() {
    return this.#lcevcParsed;
  }

  /**
   *
   * @returns {boolean}
   * @readonly
   * @memberof Queue
   * @public
   */
  get _isQueueRendered() {
    const frame = this.#queueFrames[this.#displayFrameIndex];
    return frame ? !frame.available && frame.rendered : true;
  }

  /**
   * Close this object and free memory.
   *
   * @returns {Result}
   * @memberof Queue
   * @public
   */
  _close() {
    const gl = this.#gl;

    // Aggressively clear framebuffers.
    this.#queueFrames.forEach((queueFrame) => {
      _deleteFBO(gl, queueFrame.fbo);
      queueFrame.presentationTime = -1; // eslint-disable-line
    });

    // Clear textures.
    _deleteTexture(gl, this.#texVid);
    _deleteTexture(gl, this.#texBase);
    _deleteTexture(gl, this.#texHigh);

    this.#gl = null;
    this.#lcevcDec = null;

    return Result.OK;
  }

  /**
   * Unsync the video mediaTime to the presentation time.
   *
   * This will cause it to be re-synced the next time a frame is ingested.
   * The purpose of syncing is to let our code control the pulldown, rather than
   * relying on browser decisions.
   *
   * You can call this function almost as often as you want without any
   * consequences except reverting to browser based pulldown.
   *
   * When no LCEVC is applied this function should be call, but it shouldn't
   * be done when LCEVC is applied because it will cause residual mismatch.
   *
   * @returns {Result} The result code.
   * @memberof Queue
   * @public
   */
  _unsyncPresentationTime() {
    this.#presentationTimeSync = null;
    return Result.OK;
  }

  /**
   * Add a new frame to the queue.
   *
   * Select an available QueueFrame and if not it creates a new one. If queue is
   * full it will fail.
   *
   * Set the time to the QueueFrame. If this one is the same as the last one
   * that was added then it will stop because it is already in the Queue.
   *
   * From the video it will capture the texture and the get an adjusted
   * media time.
   *
   * With this media time it will see if LCEVC is enable or the shader is not
   * the simple one and then do one of this three options:
   *  - If there is a drift or DPS is active, it won't parse anything.
   *  - If video is paused or on the last inputed frame LCEVC wasn't parsed,
   *    it will parse the data using the `_parseLcevcDataFromKeyframe`.
   *  - Else the before, parse the data covering 10 frames using
   *    `_parseLcevcDataContinuous`.
   *
   * Then, depending if LCEVC was parsed or not we will do:
   * If LCEVC was parsed:
   *  - Get the info from LCEVC about the frame: width, height, 1D, etc.
   *  - Determine the real width and height depending is 1D or not.
   *  - Get the Dither strength.
   *  - If LoQ0 is enable, decode the LoQ0.
   *  - If LoQ1 is enable, decode the LoQ1.
   *
   * If LCEVC wasn't parsed:
   *  - If the aspect ratio is known, set the width and height using previous
   *    frames.
   *  - If the aspect ratio is unknown, use the width and height of the
   *    HTMLVideoElement.
   *
   * Depending the shader and if it is 1D or not, render the frame and get a
   * merge texture with the video, LoQ0 and LoQ1.
   *
   * Return the generated QueueFrame.
   *
   * @param {!Renderer} renderer
   * @param {!ResidualStore} residualStore
   * @param {!HTMLMediaElement} video
   * @param {?object} frameMetadataIn
   * @param {!DPI} decoder
   * @param {?boolean} [onlyReturn=false]
   *   `true` to only return the frame and not input into the queue.
   * @param {?boolean} [force=false]
   * @param {?number} [drift=0]
   * @param {?number} [state=0]
   * @returns {QueueFrame} The QueueFrame added.
   * @memberof Queue
   * @public
   */
  async _inputFrame(
    renderer,
    residualStore,
    video,
    frameMetadataIn,
    decoder,
    onlyReturn = false,
    force = false,
    drift = 0,
    state = 0
  ) {
    let timingUploadBase0 = 0;
    let timingUploadBase1 = 0;
    let timingParse0 = 0;
    let timingParse1 = 0;
    let timingDecodeResidualBase0 = 0;
    let timingDecodeResidualBase1 = 0;
    let timingUploadResidualBase0 = 0;
    let timingUploadResidualBase1 = 0;
    let timingDecodeResidualHigh0 = 0;
    let timingDecodeResidualHigh1 = 0;
    let timingUploadResidualHigh0 = 0;
    let timingUploadResidualHigh1 = 0;
    let timingRender0 = 0;
    let timingRender1 = 0;
    const frameMetadata = frameMetadataIn;
    // Check we have been initialised
    if (!this.#initComplete) {
      Log.error('Queue not initialised.');
      return null;
    }

    // Get available frame
    let queueFrame;
    if (onlyReturn) {
      queueFrame = new QueueFrame();
      queueFrame.fbo = _createFBO(this.#gl, 1, 1);
    } else {
      queueFrame = this.#getEmptyFrame();
      if (queueFrame === null) {
        Log.error('No empty Frame in Queue.');
        return null;
      }
    }

    // Determine time.
    let now = performance.now();
    if (frameMetadata) {
      // In some Browsers like Safari 15+ the metadata mediaTime is 0 due to which LCEVC
      // will not be decoded. hence the reassigning of the medaitime with the current
      // time of the video.
      if (frameMetadata.mediaTime === 0) {
        frameMetadata.mediaTime = video.currentTime;
      }
      queueFrame.mediaTime = frameMetadata.mediaTime;
      ({ now } = frameMetadata);
      this.#currentBaseWidth = frameMetadata.width;
      this.#currentBaseHeight = frameMetadata.height;
    } else {
      queueFrame.mediaTime = video.currentTime;
      this.#currentBaseWidth = video.videoWidth;
      this.#currentBaseHeight = video.videoHeight;
    }

    // The below logic handles cases when multiple profiles (levels) have the same resolution.
    // It checks whether profiles have been switched and applies LCEVC from the appropriate profile.
    if (this.#lcevcDec.renderBufferCheck) {
      if (
        this.#currentBaseWidth !== (this.#currentLcevcWidth / 2)
        || (this.#lcevcDec.currentLevel !== this.#lcevcDec.nextLevel
          && !this.#lcevcDec.isLcevcPresentlyDecoded)
      ) {
        if (!decoder._getrefreshDpi) {
          this.#lcevcDec.useTimestampOffsetForNextProfile();
          this.#lcevcDec.setCurrentLevelBufferSwitch();
          decoder._refreshDpi();
        }
      }
    }

    // Set presentation time.
    // NOTE: This comparison is supposed to be with NULL. Don't refactor to 0 or false!
    if (this.#presentationTimeSync === null) {
      this.#presentationTimeSync = now - queueFrame.mediaTime * 1000;
    }
    queueFrame.presentationTime = queueFrame.mediaTime * 1000
      + this.#presentationTimeSync
      + this.#presentationDelay * 1000;

    // drift and id config
    queueFrame.id = this.#idCount;
    this.#idCount += 1;
    queueFrame.drift = drift;
    queueFrame.totalOffset = this.#lcevcDec.totalOffset;

    // Abort if this was the same as the previous frame input.
    if (!force && queueFrame.mediaTime === this.#recentMediaTimeInput) {
      Log.msg('Already input this frame.');
      return null;
    }
    this.#recentMediaTimeInput = queueFrame.mediaTime;

    // Get shader path.
    const shaderPath = this.#lcevcDec.getConfigOption('shaderPath');

    timingUploadBase0 = performance.now(); // Timing.

    // capture video texture first
    const gl = this.#gl;
    gl.bindTexture(gl.TEXTURE_2D, this.#texVid);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    timingUploadBase1 = performance.now(); // Timing.
    let mediaTimeAdjusted = 0;

    // Adjust timing info
    const {
      offset: _offset,
      drift: _drift,
      correctFirstKeyframe
    } = this.#getQueueOffset(queueFrame);

    mediaTimeAdjusted = queueFrame.mediaTime + _drift + _offset
      + (window.DEBUG_FAKETIMEOFFSET || 0);

    if (correctFirstKeyframe) {
      mediaTimeAdjusted = mediaTimeAdjusted === this.#lcevcDec.totalOffset
        ? this.#lcevcDec.firstKeyframeOffset : mediaTimeAdjusted;
    }

    timingParse0 = performance.now(); // Timing.

    if (this.#lcevcDec.rtpTimestampSync && frameMetadata && frameMetadata.rtpTimestamp) {
      mediaTimeAdjusted = frameMetadata.rtpTimestamp;
    }

    // For residual sync this check happens in case of pause or seek based on offset bypass.
    if (state === 1 && this.#offsets.bypass) {
      return null;
    }
    // Run parse function.
    let parseResult = null;
    if (this.#lcevcDec.isLcevcEnabled && shaderPath !== ShaderPaths.SIMPLE) {
      if (queueFrame.drift !== 0
          || (this.#lcevcDec.isPerformanceScalingEnabled
          && this.#lcevcDec.isPerformanceScalingActive)) {
        parseResult = null;
      } else if (video.paused || !this.#lastFrameLcevcParsed) {
        // If seek while pausing or last frame we lose LCEVC.
        // Restore all residuals since last keyframe (up to 5 seconds ago).
        // When paused we do not need the offseting that is done for playback. This
        // causes a lot of residual out of sync issues.
        if (state === 1) {
          mediaTimeAdjusted += this.#offsets.seek;
        }
        if (state === 2) {
          mediaTimeAdjusted += this.#offsets.pause;
        }

        parseResult = decoder._parseLcevcDataFromKeyframe(
          residualStore, mediaTimeAdjusted, 5, onlyReturn
        );
      } else {
        mediaTimeAdjusted += this.#offsets.play;

        // This offset is for a corner-case condition that happens with HLS.js when playing
        // MPEG-2 TS Container from a duration of 10sec to 20 sec, the residual shifts backwards
        // This might be due to offsetted timestamps that HLS.js has for the second chunk. Hence,
        // an additional offset is added from 10 to 20 sec of the TS content to avoid this.
        if (this.#player === Player.HLS_JS
          && this.#lcevcDec.containerFormat === MediaContainer.TS
          && mediaTimeAdjusted >= 10
          && mediaTimeAdjusted < 20) {
          mediaTimeAdjusted += 0.06;
        }
        // Normal play.
        // Cover up to 10 frames of missing lcevc residuals.
        parseResult = decoder._parseLcevcDataContinuous(residualStore, mediaTimeAdjusted, 10);
      }
    }

    timingParse1 = performance.now(); // Timing.

    if (parseResult !== null && parseResult.flags.parse === 0) {
      // Lcevc detected.
      queueFrame.hasLcevc = true;

      const { lcevcInfo } = queueFrame;
      lcevcInfo.parse = parseResult.flags.parse === 0;
      lcevcInfo.width = parseResult.lcevc.width;
      lcevcInfo.height = parseResult.lcevc.height;
      this.#currentLcevcWidth = lcevcInfo.width;
      this.#currentLcevcHeight = lcevcInfo.height;
      lcevcInfo.is1D = parseResult.lcevc.is1D === 1;
      this.#is1D = parseResult.lcevc.is1D === 1;
      lcevcInfo.hasBase = parseResult.lcevc.hasBase === 1;
      lcevcInfo.hasHigh = parseResult.lcevc.hasHigh === 1;
      lcevcInfo.parseLog = parseResult.parseLog;

      // Store recent aspect ratio.
      decoder._lcevcAspectRatio = lcevcInfo.width / lcevcInfo.height; // eslint-disable-line

      // Framerate.
      queueFrame.frameRate = parseResult.group.frameRate;
      this.#recentFrameRate = queueFrame.frameRate;

      // Keyframe.
      queueFrame.keyframe = parseResult.group.keyframe;

      // Determine output size.
      queueFrame.outputWidth = queueFrame.lcevcInfo.width;
      queueFrame.outputHeight = queueFrame.lcevcInfo.height;

      // Determine input (Chrome and Firefox give different values).
      if (lcevcInfo.is1D) {
        if (frameMetadata) {
          queueFrame.inputWidthTrue = frameMetadata.width;
          queueFrame.inputHeightTrue = frameMetadata.height;
          queueFrame.inputWidth = queueFrame.inputWidthTrue << 1;
          queueFrame.inputHeight = queueFrame.inputHeightTrue;
        } else {
          queueFrame.inputWidth = video.videoWidth;
          queueFrame.inputHeight = video.videoHeight;
          queueFrame.inputWidthTrue = queueFrame.inputWidth >> 1;
          queueFrame.inputHeightTrue = queueFrame.inputHeight;
        }
      } else {
        queueFrame.inputWidth = video.videoWidth;
        queueFrame.inputHeight = video.videoHeight;
        queueFrame.inputWidthTrue = queueFrame.inputWidth;
        queueFrame.inputHeightTrue = queueFrame.inputHeight;
      }

      this.#lcevcParsed = true;
      this.#lastFrameLcevcParsed = true;

      const emPointer = decoder._lcevcDecoderPointer;

      // Get residual textures.
      let success;
      let dataPointer;
      let dataBytes;

      // Get additional render values.
      // eslint-disable-next-line
      queueFrame.lcevcInfo.ditherStrength = libDPI._perseus_decoder_get_dither_strength(emPointer);

      // Decode base.
      if (queueFrame.lcevcInfo.hasBase) {
        timingDecodeResidualBase0 = performance.now(); // Timing.

        success = false;
        if (parseResult.flags.decodeBase === 0) {
          // Check sizes match.
          const pixelCount = libDPI._perseus_decoder_get_surface_size(emPointer, 0);
          if (pixelCount === queueFrame.inputWidthTrue * queueFrame.inputHeightTrue) {
            success = true;

            // Get pointer to memory block containing base pixels.
            dataPointer = libDPI._perseus_decoder_get_surface(emPointer, 0, LoqIndex.PSS_LOQ_1);
            dataBytes = new Uint8Array(libDPI.HEAPU8.buffer, dataPointer, pixelCount);
          } else {
            Log.warn('Lcevc base size mismatch.');
          }
        } else {
          Log.warn(`Lcevc base not decoded (ERROR:${parseResult.flags.decodeBase}).`);
        }

        timingDecodeResidualBase1 = performance.now(); // Timing.
        timingUploadResidualBase0 = timingDecodeResidualBase1; // Timing.

        if (success) {
          // Upload base residual image.
          gl.bindTexture(gl.TEXTURE_2D, this.#texBase);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.ALPHA,
            queueFrame.inputWidthTrue,
            queueFrame.inputHeightTrue,
            0,
            gl.ALPHA,
            gl.UNSIGNED_BYTE,
            dataBytes
          );
        } else {
          // Clear base texture in GPU.
          queueFrame.lcevcInfo.hasBase = false;
          gl.bindTexture(gl.TEXTURE_2D, this.#texBase);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        timingUploadResidualBase1 = performance.now(); // Timing.
      }

      // Decode high.
      if (queueFrame.lcevcInfo.hasHigh) {
        timingDecodeResidualHigh0 = performance.now(); // Timing.

        success = false;
        if (parseResult.flags.decodeHigh === 0) {
          // Check sizes match.
          // eslint-disable-next-line
          const pixelCount = libDPI._perseus_decoder_get_surface_size(emPointer, 1);
          if (pixelCount === queueFrame.outputWidth * queueFrame.outputHeight) {
            success = true;

            // Get pointer to memory block containing high pixels.
            // eslint-disable-next-line
            dataPointer = libDPI._perseus_decoder_get_surface(emPointer, 0, LoqIndex.PSS_LOQ_0);
            dataBytes = new Uint8Array(libDPI.HEAPU8.buffer, dataPointer, pixelCount);
          } else {
            Log.warn('Lcevc high size mismatch.');
          }
        } else {
          Log.warn(`Lcevc high not decoded (ERROR:${parseResult.flags.decodeHigh}).`);
        }

        timingDecodeResidualHigh1 = performance.now(); // Timing.
        timingUploadResidualHigh0 = timingDecodeResidualHigh1; // Timing.

        if (success) {
          // pack residuals into RGBA texture if using full shader
          const packTexture = (shaderPath === ShaderPaths.FULL && lcevcInfo.is1D === false);

          // Upload high residual image.
          gl.bindTexture(gl.TEXTURE_2D, this.#texHigh);
          if (packTexture) {
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              queueFrame.outputWidth >> 2, // eslint-disable-line
              queueFrame.outputHeight,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              dataBytes
            );
          } else {
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.ALPHA,
              queueFrame.outputWidth,
              queueFrame.outputHeight,
              0,
              gl.ALPHA,
              gl.UNSIGNED_BYTE,
              dataBytes
            );
          }
        } else {
          // Clear high texture in gpu.
          queueFrame.lcevcInfo.hasHigh = false;
          gl.bindTexture(gl.TEXTURE_2D, this.#texHigh);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        timingUploadResidualHigh1 = performance.now(); // Timing.
      }
    } else {
      this.#lastFrameLcevcParsed = false;

      // No lcevc detected.
      // This could just be a temporary glitch, where lcevc wasn't read, or it
      // could be a permanent feature of this chunk of video.
      queueFrame.hasLcevc = false;

      // Impossible for us to know frame rate, so we use the previous one.
      queueFrame.frameRate = this.#recentFrameRate || 0;

      // Determine size of input.
      if (decoder._lcevcAspectRatio > 0) {
        // Guess correct input size. Assume that the aspect ratio will match previous frames.
        // there is no way to get the true width and height of the input video, because on
        // Chrome it will report the value of the raw pixels but on Firefox it will report
        // the value of the aspect-ratio corrected display video. So there is no way to
        // determine if 1D was supposed to be used or not.
        // Therefore make an educated guess.

        // eslint-disable-next-line no-param-reassign
        decoder._lcevcAspectRatio = video.videoWidth / video.videoHeight;

        queueFrame.inputHeight = video.videoHeight;
        queueFrame.inputHeightTrue = queueFrame.inputHeight;
        queueFrame.inputWidth = queueFrame.inputHeight * decoder._lcevcAspectRatio;
        if (frameMetadata) {
          if (queueFrame.inputWidth === frameMetadata.width) {
            queueFrame.lcevcInfo.is1D = false;
            queueFrame.inputWidthTrue = queueFrame.inputWidth;
          } else {
            queueFrame.lcevcInfo.is1D = true;
            queueFrame.inputWidthTrue = queueFrame.inputWidth >> 1;
          }
        } else {
          queueFrame.inputWidthTrue = queueFrame.inputWidth;
        }
      } else {
        queueFrame.inputWidth = video.videoWidth;
        queueFrame.inputHeight = video.videoHeight;
        queueFrame.inputWidthTrue = queueFrame.inputWidth;
        queueFrame.inputHeightTrue = queueFrame.inputHeight;
      }

      // Output size is same as input.
      queueFrame.outputWidth = queueFrame.inputWidth;
      queueFrame.outputHeight = queueFrame.inputHeight;
    }

    timingRender0 = performance.now(); // Timing.

    // Render frame.
    switch (shaderPath) {
      case ShaderPaths.FULL:
        if (queueFrame.lcevcInfo.is1D) {
          renderer._renderFrame1D(decoder, queueFrame, this.#texVid, this.#texBase, this.#texHigh);
        } else {
          renderer._renderFrame(decoder, queueFrame, this.#texVid, this.#texBase, this.#texHigh);
        }
        break;
      case ShaderPaths.DEBUG:
        renderer._renderDebug(decoder, queueFrame, this.#texVid, this.#texBase, this.#texHigh);
        break;
      case ShaderPaths.SIMPLE:
      default:
        renderer._renderSimple(decoder, queueFrame, this.#texVid, this.#texBase, this.#texHigh);
        break;
    }

    timingRender1 = performance.now(); // Timing.

    queueFrame.timingStats.uploadBase = timingUploadBase1 - timingUploadBase0;
    queueFrame.timingStats.decodeResidual = (timingParse1 - timingParse0)
      + (timingDecodeResidualBase1 - timingDecodeResidualBase0)
      + (timingDecodeResidualHigh1 - timingDecodeResidualHigh0);
    queueFrame.timingStats.uploadResidual = (timingUploadResidualBase1 - timingUploadResidualBase0)
      + (timingUploadResidualHigh1 - timingUploadResidualHigh0);
    queueFrame.timingStats.renderShader = timingRender1 - timingRender0;

    queueFrame.available = false;
    // Random seed is used to generate dither for this queueframe.
    queueFrame.randomSeed = Math.abs(Math.sin(queueFrame.mediaTime)) % 1;

    // Calculate the audio delay by keeping track of the time it took to render the previous N
    // frames. The average of these timings will be set as the audio delay.
    const renderTime = (performance.now() - now) / 1000;

    if (this.#previousRenderTimes.length < this.#previousRenderTimesLength) {
      this.#previousRenderTimes = [renderTime].concat(this.#previousRenderTimes);
    } else {
      // Use only second half of the timings to avoid an incorrect delay at the start of playback
      this.#previousRenderTimes = this.#previousRenderTimes.slice(0,
        Math.floor(this.#previousRenderTimesLength * 0.5));
      // Calculate the average of previous timings
      const audioDelay = this.#previousRenderTimes.reduce((prev, curr) => prev + curr, 0)
        / this.#previousRenderTimes.length;
      this.#previousRenderTimes = [];

      this.#audioDelay = audioDelay;
      this.#lcevcDec._updateAudioParams(this.#audioDelay);
    }

    return queueFrame;
  }

  getInternalTextures() {
    return {
      texVid: this.#texVid,
      texBase: this.#texBase,
      texHigh: this.#texHigh
    };
  }

  /**
   * Get the next empty queue frame or create a new one.
   *
   * If a QueuFrame was used and it is not needed anymore, it will return that
   * so it can be reused.
   *
   * If there aren't any more QueueFrame in the queue, returns null.
   *
   * @returns {?QueueFrame} A QueueFrame or null if the queue is full.
   * @memberof Queue
   * @private
   */
  #getEmptyFrame() {
    for (let i = 0; i < this.#queueLength; i += 1) {
      const queueFrame = this.#queueFrames[i];
      if (queueFrame.available) return queueFrame;
    }

    // Create new frame.
    if (this.#queueLength < this.#queueLengthMax) {
      const queueFrame = new QueueFrame();
      queueFrame.fbo = _createFBO(this.#gl, 1, 1);

      this.#queueFrames.push(queueFrame);
      this.#queueLength = this.#queueFrames.length;

      return queueFrame;
    }

    // No room.
    return null;
  }

  /**
   * Updates the queue and remove all frames that have passed to free them up.
   *
   * Set the next frame to be rendered based if they haven't been used and when
   * they weren't added after the current time. From all of those one, it
   * select the one that was first added (minimun presentantion time).
   *
   * Update the Stats with the current status of the QueueFrames of the queue
   * and residual store.
   *
   * All those QueueFrames that has been used or are no longer needed are
   * reset to be reused later.
   *
   * @param {!Stats} stats The Stats class.
   * @param {!HTMLMediaElement} video The HTMLVideoElement.
   * @param {!ResidualStore} residualStore The ResidualStore class.
   * @returns {Result} The status code.
   * @memberof Queue
   * @public
   */
  _updateQueue(stats, video, residualStore) {
    const now = performance.now();
    this.#offsets = this.#offsetObj.getOffsets(this.#lcevcDec.containerFormat,
      this.#lcevcDec.isLive, this.#recentFrameRate);
    // Collect all frames whos presentation time has passed.
    const oldFrames = [];
    let recentIndex = -1;
    let recentPresentationTime = -1;
    for (let i = 0; i < this.#queueFrames.length; i += 1) {
      const queueFrame = this.#queueFrames[i];
      if (!queueFrame.available && queueFrame.presentationTime < now) {
        oldFrames.push(i);

        if (recentIndex === -1 || queueFrame.presentationTime > recentPresentationTime) {
          recentIndex = i;
          recentPresentationTime = queueFrame.presentationTime;
        }
      }
    }

    // Keep the current frame, as it may still be on screen.
    if (recentIndex !== -1) {
      this.#displayFrameIndex = recentIndex;
    }

    // Stats
    if (!video.paused) {
      stats._processQueue(this.#queueFrames, recentIndex, now, residualStore);
    }

    // Reset all old frames.
    for (let o = 0; o < oldFrames.length; o += 1) {
      const i = oldFrames[o];
      if (i !== recentIndex) {
        // Reset.
        const queueFrame = this.#queueFrames[i];
        this.#resetFrame(queueFrame);
      }
    }

    return Result.OK;
  }

  /**
   * Reset a QueueFrame to its original empty state.
   *
   * @param {!QueueFrame} queueFrame The QueueFrame to be reset.
   * @param {boolean} [freeFBO=false] `true` to delete the FBO.
   * @returns {Result} The status code.
   * @memberof Queue
   * @private
   */
  #resetFrame(queueFrame, freeFBO = false) {
    // reset timing
    queueFrame.id = 0; // eslint-disable-line no-param-reassign
    queueFrame.frameRate = 0; // eslint-disable-line no-param-reassign
    queueFrame.mediaTime = -1; // eslint-disable-line no-param-reassign
    queueFrame.presentationTime = -1; // eslint-disable-line no-param-reassign
    queueFrame.keyframe = false; // eslint-disable-line no-param-reassign
    queueFrame.drift = 0; // eslint-disable-line no-param-reassign

    // reset size
    queueFrame.inputWidth = 0; // eslint-disable-line no-param-reassign
    queueFrame.inputHeight = 0; // eslint-disable-line no-param-reassign
    queueFrame.inputWidthTrue = 0; // eslint-disable-line no-param-reassign
    queueFrame.inputHeightTrue = 0; // eslint-disable-line no-param-reassign
    queueFrame.outputWidth = 0; // eslint-disable-line no-param-reassign
    queueFrame.outputHeight = 0; // eslint-disable-line no-param-reassign

    // Reset lcevc data.
    queueFrame.hasLcevc = false; // eslint-disable-line no-param-reassign
    const { lcevcInfo } = queueFrame;
    lcevcInfo.parse = false;
    lcevcInfo.width = 0;
    lcevcInfo.height = 0;
    lcevcInfo.is1D = false;
    lcevcInfo.hasBase = false;
    lcevcInfo.hasHigh = false;
    lcevcInfo.ditherStrength = 0;
    lcevcInfo.parseLog = null;

    // Reset timing.
    const { timingStats } = queueFrame;
    timingStats.uploadBase = 0;
    timingStats.decodeResidual = 0;
    timingStats.uploadResidual = 0;
    timingStats.renderShader = 0;
    timingStats.presentationShader = 0;
    timingStats.displayCount = 0;
    timingStats.displayFirst = 0;
    timingStats.displayRecent = 0;

    // reset flags
    queueFrame.available = true; // eslint-disable-line no-param-reassign
    queueFrame.rendered = false; // eslint-disable-line no-param-reassign
    queueFrame.randomSeed = Math.random(); // eslint-disable-line no-param-reassign

    // Free webgl memory.
    if (queueFrame.fbo && freeFBO) {
      _deleteFBO(this.#gl, queueFrame.fbo);
      queueFrame.fbo = _createFBO(this.#gl, 1, 1); // eslint-disable-line no-param-reassign
    }

    return Result.OK;
  }

  /**
   * Reset the entire queue.
   *
   * @returns {Result} The status code.
   * @memberof Queue
   * @public
   */
  _resetQueue() {
    this.#queueLength = 0;
    this.#queueFrames = [];
    this.#recentMediaTimeInput = -1;
    this.#displayFrameIndex = -1;
    this.#lastFrameLcevcParsed = false;
    this._unsyncPresentationTime();
    return Result.OK;
  }

  /**
   * Render the current frame.
   *
   * `_updateQueue` should be call before this in order to render the next
   * frame on the queue.
   *
   * If a QueueFrame is passed it will render that one instead the next frame
   * on the queue.
   *
   * First it will set the canvas internal size to match the current frame. If
   * the size of the frame is bigger than the canvas and the
   * `renderAtDisplaySize` is set to `true` it will use the canvas size, but
   * with the aspect ratio of the frame.
   *
   * Finally, it will render the frame and set that frame as rendered.
   *
   * @param {!DPI} decoder The DPI object.
   * @param {!Renderer} renderer The Rendered object.
   * @param {!HTMLCanvasElement} outputCanvas The canvas to render the image.
   * @param {!Stats} stats The Stats object.
   * @param {!boolean} renderAtDisplaySize `true` to render using the Canvas size.
   * @param {!boolean} renderAtPixelRatio `true` to use device pixel ratio.
   * @param {!HTMLElement} parentElement The parent element of the canvas.
   * @param {?QueueFrame} frame A QueueFrame to force to render it instead of the next one.
   * @returns {LcevcStatus} The status code.
   * @memberof Queue
   * @public
   */
  _presentFrame(
    decoder,
    renderer,
    outputCanvas,
    stats,
    renderAtDisplaySize,
    renderAtPixelRatio,
    parentElement,
    frame = null
  ) {
    const queueFrame = frame || this.#queueFrames[this.#displayFrameIndex];
    if (!queueFrame) {
      Log.debug(`Invalid queueFrame or index (${this.#displayFrameIndex})`);
      return LcevcStatus.ERROR;
    }

    // If no LCEVC data sync with the browser
    if (!queueFrame.lcevcInfo.parse) {
      this._unsyncPresentationTime();
    }

    // Resize output canvas.

    // All of the 1D stuff or changing scales and size based on lcevc data should be done
    // earlier - this has nothing to do with that - the pixels have already been rendered.
    // This is purely about taking the rendered lcevc frame and putting it on the screen
    // with final effects (dithering).

    // Do not change the frame size here.
    // Do not change the aspect ratio here.
    const aspect = queueFrame.fbo.width / queueFrame.fbo.height;
    let { width } = queueFrame.fbo;
    let { height } = queueFrame.fbo;

    // Scale to container size.
    if (renderAtDisplaySize) {
      // lcevc_dec.js sets the canvas width/height to 100%. In rare cases, this may result
      // in canvas.width and canvas.offsetWidth having two different values (diff <= 1.0),
      // causing an infinite resizing loop with flickering.
      const shouldResize = Math.abs(outputCanvas.width - outputCanvas.offsetWidth) > 1;
      width = shouldResize ? outputCanvas.offsetWidth : outputCanvas.width;
      height = width / aspect >> 0;

      // Device pixel ratio correction.
      if (renderAtPixelRatio
          && !(this.#lcevcDec.isPerformanceScalingEnabled
          && this.#lcevcDec.isPerformanceScalingActive)) {
        const pixelRatio = window.devicePixelRatio;
        width *= pixelRatio;
        height *= pixelRatio;
      }
    }

    // eslint-disable-next-line
    const parentHeight = outputCanvas.offsetHeight <= 0 ? height : outputCanvas.offsetHeight;
    height = height > parentHeight ? parentHeight : height;

    // Final output size.
    outputCanvas.width = width; // eslint-disable-line
    outputCanvas.height = height; // eslint-disable-line

    // Display to screen.
    const timingPresentation0 = performance.now(); // Timing.

    renderer._renderToScreen(
      decoder,
      queueFrame.fbo.texture,
      queueFrame.fbo.width,
      queueFrame.fbo.height,
      width,
      height,
      queueFrame.randomSeed,
      queueFrame.lcevcInfo.ditherStrength
    );

    const timingPresentation1 = performance.now(); // Timing.

    // Stats.
    const now = performance.now();
    const { timingStats } = queueFrame;

    if (timingStats.displayFirst === 0) {
      timingStats.displayFirst = now;
    }

    timingStats.displayRecent = now;
    timingStats.displayCount += 1;
    timingStats.presentationShader = timingPresentation1 - timingPresentation0;

    stats._setPresentationFrame(queueFrame);

    queueFrame.rendered = true;

    return queueFrame.lcevcInfo.parse ? LcevcStatus.APPLIED : LcevcStatus.NOT_APPLIED;
  }

  /**
   * Clear previous render times. This is needed when, for example,
   * we exit PiP mode, since the render times during PiP mode will be incorrect.
   *
   * @memberof Queue
   * @public
   */
  _clearPreviousRenderTimes() {
    this.#previousRenderTimes = [];
  }

  /**
   * Check whether the current environment (player, streamingFormat, containerFormat)
   * matches the environment provided in the arguments.
   *
   * @param {Player} player the Player enum for matching
   * @param {StreamingFormat} streamingFormat the StreamingFormat enum for matching
   * @param {MediaContainer} containerFormat the ContainerFormat enum for matching
   * @returns {boolean} true if environments match
   * @memberof Queue
   * @private
   */
  #env(player, streamingFormat, containerFormat) {
    return (this.#player === player
      && this.#lcevcDec.streamingFormat === streamingFormat
      && this.#lcevcDec.containerFormat === containerFormat);
  }

  /**
   * Check whether the content is live.
   *
   * @returns {boolean} true if content is live
   */
  #live() {
    return this.#lcevcDec.isLive;
  }

  /**
   * Get the queue offset. Different environments may require the offsets being handled
   * differently, e.g. not all environments require both the firstKeyFrameOffset and the
   * timestampOffset together. Some require neither of them.
   *
   * The returned object contains offset, drift, and correctFirstKeyframe properties. Live contents
   * may not always require the first keyframe to be corrected.
   *
   * @param {QueueFrame} queueFrame the queue frame
   * @returns {object} the object containing offsets (offset, drift, etc.)
   */
  #getQueueOffset(queueFrame) {
    const defaults = {
      offset: this.#lcevcDec.totalOffset,
      drift: queueFrame.drift,
      correctFirstKeyframe: true
    };

    if (this.#live() && this.#env(Player.SHAKA, StreamingFormat.DASH, MediaContainer.MP4)) {
      // fixed offset of 0.08 is needed for MP4 dash contents
      return { offset: 0.08, drift: 0, correctFirstKeyframe: false };
    }
    if (this.#live() && this.#env(Player.SHAKA, StreamingFormat.HLS, MediaContainer.MP4)) {
      // Value of 0.066 refers to the firstKeyframeOffset, which is usually set by the packager
      // and should remain the same for the majority of cases. It can be calculated dynamically
      // by firstKeyframeOffset + first append timestampOffset - second append timestampOffset.
      return {
        ...defaults,
        offset: this.#lcevcDec.timestampOffset + 0.066,
        correctFirstKeyframe: false
      };
    }
    if (this.#live() && this.#env(Player.SHAKA, StreamingFormat.HLS, MediaContainer.TS)) {
      return { ...defaults, offset: this.#lcevcDec.timestampOffset, correctFirstKeyframe: false };
    }
    if (!this.#live() && this.#env(Player.SHAKA, StreamingFormat.DASH, MediaContainer.MP4)) {
      return { offset: this.#lcevcDec.firstKeyframeOffset, drift: 0, correctFirstKeyframe: false };
    }
    // Compensate for different packagers having different firstKeyframe
    if (!this.#live() && this.#env(Player.SHAKA, StreamingFormat.HLS, MediaContainer.TS)) {
      const defaultPackagerOffset = 0.1;
      const packagerOffset = defaultPackagerOffset - this.#lcevcDec.firstKeyframeOffset;
      return { ...defaults, offset: defaults.offset + packagerOffset };
    }

    return defaults;
  }
}

export default Queue;
