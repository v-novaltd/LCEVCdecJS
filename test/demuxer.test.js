import Demuxer from '../src/demux/demuxer';
import ExpectedMp4Hashes from './assets/mp4-stream-demux.json';
import ExpectedWebmHashes from './assets/webm-stream-demux.json';
import ExpectedTsHashes from './assets/ts-stream-demux.json';
import { loadToBuffer, loadToScriptTag } from './utils/loaders';
import { MediaContainer } from '../src/globals/enums';

const TIMEOUT = 30000; // 30 seconds per test
const assetBaseUrl = 'http://localhost:9876/base/test/assets';

let demuxedFrames = [];
const demuxerWorkerMock = {
  postMessage(data) {
    demuxedFrames.push(data);
  }
};

/**
 * Compares the hashes of demuxed and expected model frames. In addition, hashes the demuxedFrames
 * before performing the comparison.
 *
 * @param {Array} demuxedFrames_ array of unhashed frames from the demuxer
 * @param {Array} expectedFrames array of expected model (SHA-256 hashed) frames
 */
async function checkHashes(demuxedFrames_, expectedFrames) {
  // Begin hashing the demuxed frames
  const hashComplete = demuxedFrames_.map(async (frame) => {
    const hash = await window.crypto.subtle.digest('SHA-256', frame.pssData);
    return { ...frame, hash };
  });

  const hashedFrames = await Promise.all(hashComplete);

  hashedFrames.sort((a, b) => a.frameSample[0] - b.frameSample[0]);
  expectedFrames.sort((a, b) => a.frameSample[0] - b.frameSample[0]);

  const hashes = hashedFrames.map((frame) => new Uint8Array(frame.hash));
  const expected = expectedFrames.map((frame) => new Uint8Array(frame.hash));

  for (let i = 0; i < hashes.length; i += 1) {
    expect(hashes[i])
      .withContext(`Demuxed hash for frame ${i} does not match (in range 0...${hashes.length})`)
      .toEqual(expected[i]);
  }
}

/**
 * Runs the demuxing test on the given args. It instantiates the demuxer, and may test MP4, WEBM
 * or TS stream demuxing, depending on the supplied args. Rather than comparing the demuxed frames
 * directly, it compares the hashes of the demuxed frames to save on storage space. The hashes
 * are generated using SHA-256.
 *
 * Demuxer does not return the demuxed frames, but rather calls postMessage with the demuxed
 * frames as an argument, since it is used as part of WebWorkers. Since it is asynchronous, we
 * allow 30 ms to demux 10 frames, which should end up in demuxedFrames via the demuxerWorkerMock.
 *
 * The demuxing test loads and controls the demuxer directly rather than through LCEVCdec. This
 * makes it more difficult to load the demuxing libraries MP4Box and EbmlDecoder. These are loaded
 * using importScripts, which is synchronous. However, it is difficult to mock this as a
 * synchronous method, since we may only use fetch(), which is asynchronous. This leads to
 * slightly unusual code in beforeAll.
 *
 * @param {ArrayBuffer} streamBuffer fragmented mp4 stream stored as an ArrayBuffer
 * @param {Array} expectedFrames array of expected (SHA-256 hashed) frames
 * @param {object} options any additional options, eg. container format
 */
async function runDemuxer(streamBuffer, expectedFrames, options) {
  demuxedFrames = [];

  const demuxer = new Demuxer(demuxerWorkerMock);
  demuxer._demuxInit();
  demuxer._resetLcevcMap();

  const arg = {
    ptsStart: undefined,
    ptsEnd: undefined,
    level: 0,
    containerFormat: options.format
  };

  demuxer._selectDemuxer(streamBuffer, arg.ptsStart, arg.ptsEnd, arg.level, arg.containerFormat);

  // Allow 30 ms to demux 10 frames
  await new Promise((resolve) => { setTimeout(resolve, 30); });

  expect(demuxedFrames.length)
    .withContext(`Demuxer demuxed ${demuxedFrames.length}/${expectedFrames.length} frames`)
    .toEqual(expectedFrames.length);

  await checkHashes(demuxedFrames, expectedFrames);
}

describe('Demuxer', () => {
  beforeAll(async () => {
    window.importedScripts = [];
    window.importScripts = async function (src) {
      if (window.importedScripts.includes(src)) return;
      window.importedScripts.push(src);
      await loadToScriptTag(src);
    };

    // Start MP4Box and EbmlDecoder loading directly
    Demuxer.MP4Demuxer.version = '0.5.2';
    Demuxer.WebMDemuxer.version = '3.0.0';

    Demuxer.MP4Demuxer.load();
    Demuxer.WebMDemuxer.load();

    while (typeof MP4Box === 'undefined' || typeof EbmlDecoder === 'undefined') {
      await new Promise((resolve) => { setTimeout(resolve, 800); });
    }
  }, TIMEOUT);

  afterAll(async () => {
    window.importedScripts = null;
    window.importScripts = null;
  }, TIMEOUT);

  it('Should correctly demux LCEVC data from an MP4 container', async () => {
    const streamBuffer = await loadToBuffer(`${assetBaseUrl}/mp4-stream.mp4`);

    await runDemuxer(
      streamBuffer,
      ExpectedMp4Hashes.frames,
      { format: MediaContainer.MP4 }
    );
  }, TIMEOUT);

  it('Should correctly demux LCEVC data from a WEBM container', async () => {
    const streamBuffer = await loadToBuffer(`${assetBaseUrl}/webm-stream.webm`);

    await runDemuxer(
      streamBuffer,
      ExpectedWebmHashes.frames,
      { format: MediaContainer.WEBM }
    );
  }, TIMEOUT);

  it('Should correctly demux LCEVC data from a TS container', async () => {
    await loadToScriptTag('https://cdn.jsdelivr.net/npm/mux.js@6.2.0/dist/mux.min.js');

    let transmuxDone;
    const transmuxProgress = new Promise((resolve) => { transmuxDone = resolve; });

    const transmuxer = new window.muxjs.mp4.Transmuxer();
    transmuxer.on('data', (segment) => {
      const data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
      data.set(segment.initSegment, 0);
      data.set(segment.data, segment.initSegment.byteLength);
      transmuxDone(data.buffer);
    });

    const unmuxed = await loadToBuffer(`${assetBaseUrl}/ts-stream.ts`);
    transmuxer.push(new Uint8Array(unmuxed));
    transmuxer.flush();

    const streamBuffer = await transmuxProgress;

    await runDemuxer(
      streamBuffer,
      ExpectedTsHashes.frames,
      { format: MediaContainer.TS }
    );
  }, TIMEOUT);

  it('Should correctly demux LCEVC data from NAL Units', async () => {
    demuxedFrames = [];

    const demuxer = new Demuxer(demuxerWorkerMock);
    demuxer._demuxInit();
    demuxer._resetLcevcMap();

    for (let i = 0; i < 10; i += 1) {
      const arg = {
        timestamp: i,
        naluFormat: 1
      };
      const bin = await loadToBuffer(`${assetBaseUrl}/nal-units/cactus-nal-unit-${i}.bin`);
      await demuxer._rawNalLcevcData(new Uint8Array(bin), arg.timestamp, arg.naluFormat);
    }

    // Allow 30 ms to demux 10 frames
    await new Promise((res) => { setTimeout(res, 30); });
    expect(demuxedFrames.length).toEqual(10);

    await checkHashes(demuxedFrames, ExpectedMp4Hashes.frames);
  }, TIMEOUT);
}, 40000);
