import cactusHistogram from './assets/conformance/cactus-1920x1080-histogram.json';

import { loadToBuffer } from './utils/loaders';
import { MediaContainer } from '../src/globals/enums';

const assetBaseUrl = 'http://localhost:9876/base/test/assets/conformance';

const TIMEOUT = 60000; // 60 seconds
let video;
let canvas;

/**
 * Runs the conformance test on the given args. Conformance may be tested by either matching the
 * pixel values exactly, or by generating a histogram of differences between the output from
 * LCEVCdec and the ideal output from the LTM (LCEVC Test Model). If the histogram stays the same,
 * or improves over time, LCEVCdec.js would be considered conformant to the LCEVC standard.
 *
 * The conformance test loads in the the supplied streamUrl using MediaSourceBuffers and plays it
 * back using LCEVCdec.js. It dumps WebGL framebuffers from LCEVCdec and compares these dumped
 * framebuffers against the model output from the LTM (LCEVC Test Model), and generates a histogram
 * of differences. This newly generated histogram is compared against a pre-generated histogram at
 * a certain point in time. If these histograms match, the test succeeds.
 *
 * The mp4 assets are encoded with linear upscaling, and dithering disabled. Some additional
 * processing is required of the dumped framebuffers, since the video frames are stored as
 * 4-packed inside the LCEVCdec.js shader pipeline. Rather than playing back the video and dumping
 * the frames, seek is used instead. The dumping operation is very slow, and frames would be
 * dropped otherwise.
 *
 * @param {string} streamUrl url of the stream to load, only fragmented mp4 is supported
 * @param {string} streamMimeType mime type of the stream
 * @param {string} modelUrl url of the model YUV file, the stream will be compared against this
 * @param {Array} modelHistogram array of expected difference histograms between stream and model
 * @param {object} options any additional options, eg. LCEVCdecConfig
 */
async function runConformance(streamUrl, streamMimeType, modelUrl, modelHistogram, options) {
  const stream = await loadToBuffer(streamUrl);
  const model = new Uint8Array(await loadToBuffer(modelUrl));

  let lcevcDec;
  await LCEVCdec.ready;

  // Allow some additional time for libDPI to load
  await new Promise((resolve) => { setTimeout(resolve, 3000); });

  // eslint-disable-next-line compat/compat -- MediaSource is not supported in iOS Safari 11.0-11.2
  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);

  const sourceBuffer = await new Promise((resolve, reject) => {
    const getSourceBuffer = () => {
      try {
        resolve(mediaSource.addSourceBuffer(streamMimeType));
      } catch (error) {
        reject(error);
      }
    };
    if (mediaSource.readyState === 'open') {
      getSourceBuffer();
    } else {
      mediaSource.addEventListener('sourceopen', getSourceBuffer);
    }
  });

  let resolveStreamReady;
  const streamReady = new Promise((resolve) => { resolveStreamReady = resolve; });
  sourceBuffer.addEventListener('updateend', () => {
    mediaSource.endOfStream();

    lcevcDec = new LCEVCdec.LCEVCdec(video, canvas, options.config);
    lcevcDec.setContainerFormat(options.format);
    lcevcDec.setLevelSwitching(0, 0);
    lcevcDec.setCurrentLevel(0);
    lcevcDec.appendBuffer(stream, 'audiovideo', 0, options.timestampOffset);

    // Linear upscaling kernel should be used to match the model data
    lcevcDec.shaderKernel0 = [0, 0, 1, 0];
    lcevcDec.shaderKernel1 = [0, 1, 0, 0];

    // Set the correct color space and color range within LCEVCdec.js to match the assets
    lcevcDec.setProfileIn('BT709.TV');
    lcevcDec.setProfileOut('BT709.TV');

    resolveStreamReady();
  });

  sourceBuffer.appendBuffer(stream);
  await streamReady;

  // Allow some additional time for LCEVCdec to parse LCEVC, may need to be increased for Firefox
  await new Promise((resolve) => { setTimeout(resolve, 3000); });

  /**
   * Dump the given texture object, containing a WebGL framebuffer and return it as Uint8Array.
   *
   * @param {object} texture the object containing a WebGL framebuffer
   * @returns {object} object with the dumped WebGL framebuffer as Uint8Array
   */
  function dump(texture) {
    const { width, height, framebuffer } = texture;
    const pixels = new Uint8Array(width * height * 4);

    const gl = canvas.getContext('webgl');
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    return { width, height, pixels };
  }

  /**
   * Unpack the given texture stored as an Uint8Array. In the shader pipeline, the textures
   * are stored as 4-packed and therefore need unpacking back into the original shape.
   *
   * @param {object} dump_ object containing a dumped WebGL framebuffer as a Uint8Array
   * @returns {Array} the unpacked texture as an Array
   */
  function unpack(dump_) {
    const unpacked = [];
    const { width, height, pixels } = dump_;

    const upper = [];
    const lower = [];

    for (let i = 0; i < height * width * 4; i += 4) {
      upper.push(pixels[i + 0], pixels[i + 1]);
      lower.push(pixels[i + 2], pixels[i + 3]);
    }

    for (let i = 0; i < height * width * 4; i += width * 2) {
      unpacked.push(...upper.slice(i, i + width * 2));
      unpacked.push(...lower.slice(i, i + width * 2));
    }

    return unpacked;
  }

  let done;
  let seekComplete = new Promise((resolve) => { done = resolve; });
  video.onseeked = () => { done(); };

  // Perform frame comparison
  for (let i = 0; i < modelHistogram.length; i += 1) {
    const histogram = {};

    const time = modelHistogram[i].samplingTime;
    video.currentTime = time;

    await seekComplete;
    seekComplete = new Promise((resolve) => { done = resolve; }); // eslint-disable-line

    // Allow shaders some time to update before dumping the frame
    await new Promise((resolve) => { setTimeout(resolve, 180); });

    const texture = lcevcDec.internal_dumpFrame(true).fboStates.fboApplyY;
    const frame = new Uint8Array(unpack(dump(texture)));

    const yChunkSize = frame.length;
    const uvChunkSize = frame.length / 2;
    const yuvChunkSize = yChunkSize + uvChunkSize;

    const modelOffset = yuvChunkSize * i;

    for (let pixel = 0; pixel < yChunkSize; pixel += 1) {
      const difference = frame[pixel] - model[modelOffset + pixel];
      histogram[difference] = (histogram[difference] || 0) + 1;
    }

    expect(histogram)
      .withContext(`Histogram for frame ${i} does not match`)
      .toEqual(modelHistogram[i].histogram);
  }
}

describe('Conformance', () => {
  // Potential fix for libDPIModule is not defined in the CI environment
  beforeAll(async () => {
    while (typeof LCEVCdec === 'undefined' || typeof libDPIModule === 'undefined') {
      await new Promise((resolve) => { setTimeout(resolve, 800); });
    }
    await LCEVCdec.ready;
    await new Promise((resolve) => { setTimeout(resolve, 800); });
  }, TIMEOUT);

  /* eslint-disable compat/compat -- document.body() is not supported in Firefox 52 */
  beforeEach(() => {
    video = document.createElement('video');
    canvas = document.createElement('canvas');

    document.body.appendChild(video);
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.removeChild(video);
    document.body.removeChild(canvas);
  });
  /* eslint-enable compat/compat */

  it('Should playback an MP4 stream correctly', async () => {
    await runConformance(
      `${assetBaseUrl}/cactus-1920x1080.mp4`,
      'video/mp4; codecs="avc1.64001f"',
      `${assetBaseUrl}/cactus-1920x1080-model.yuv`,
      cactusHistogram.frames,
      {
        config: { dps: false },
        format: MediaContainer.MP4,
        timestampOffset: -0.066
      }
    );
  }, TIMEOUT);
});
