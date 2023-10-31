/* global shaka */

const manifests = {
  FMP4_HLS: 'https://dyctis843rxh5.cloudfront.net/vnQf3PXxVLuXohrr/master.m3u8',
  FMP4_DASH: 'https://dyctis843rxh5.cloudfront.net/vnQf3PXxVLuXohrr/master.mpd',
  TS_HLS: 'https://dyctis843rxh5.cloudfront.net/vnIPjhbcfnThQdZl/master.m3u8'
};

const TIMEOUT = 60000; // 60 seconds
let video;
let canvas;

const seekTimestamps = [1.8, 1.95, 2.1, 2.25, 2.4, 2.55, 2.7, 2.85, 3, 3.15, 3.3];

const uniqueFrameCount = 21;
const baseCoordOffset = 35;
const residualCoordOffset = 70;
const detectionThreshold = 150;

const testPassedThreshold = 0.9; // test will pass if 90% of checked frames are in sync (playback)

/**
 * Residual sync tests make use of carefully crafted content, as such a detailed explanation is
 * provided.
 *
 * The frames are hand-crafted in such a way that we do not require comparing against a model
 * decode, but instead can immediately check the sync from the dumped frame itself. Furthermore,
 * rather than requiring the whole frame, we require the first row of pixels only. This provides a
 * large performance boost, allowing almost all frames to be checked and allows fewer frames to be
 * dropped.
 *
 * The test content consists of two columns next to each other. One thick, and one thin. These two
 * columns will move together, N pixels to the right each frame. The coordinates of these two
 * columns at any given frame may be retrieved using getCoord(frame) and adding baseCoordOffset or
 * residualCoordOffset respectively.
 *
 * The idea behind these two columns is that the thick column will never have any residuals. The
 * thin column will always generate residuals.
 *
 * We can then check for the thick column every N pixels to find which base frame we are on. Once
 * we know the base frame, we can check the brightness of the thin column. Depending if the
 * residuals are in sync or out of sync, the thin column will have a different brightness.
 *
 * If the content is in sync, the thin column is brighter. If the content is out of sync, the thin
 * column is darker. The brightness is detected via detectionThreshold. Due to different color
 * spaces used in different browsers, we cannot check for exact RGB/YUV values. Therefore, we use
 * a threshold.
 *
 * The two columns are setup to move to the right a specific number of times before they wrap
 * around back to the left side of the frame. This is defined by uniqueFrameCount.
 */

/**
 * Configure LCEVCdec. Currently this switches the upscaling kernels to nearest neighbor.
 * This is required before running a test since we are expecting residuals in exact positions
 * and do not want them to be smoothed out over multiple pixels.
 */
async function configureLCEVCdec() {
  // Linear upscaling kernel should be used to match the data
  window.LCEVCdec.instance.shaderKernel0 = [0, 0, 1, 0];
  window.LCEVCdec.instance.shaderKernel1 = [0, 1, 0, 0];
}

/**
 * Load Shaka Player. This is a minimal setup required for Shaka player to playback a manifest
 * with LCEVC enabled.
 *
 * @param {HTMLVideoElement} video_ the video tag
 * @param {HTMLCanvasElement} canvas_ the canvas tag
 * @param {string} manifestUri the manifest URI
 */
async function loadShakaPlayer(video_, canvas_, manifestUri) {
  const player = new shaka.Player(video_);

  player.configure('lcevc.enabled', true);
  player.configure('streaming.useNativeHlsOnSafari', false);
  player.configure('mediaSource.forceTransmux', true);

  player.attachCanvas(canvas_);

  await player.load(manifestUri);
  await new Promise((resolve) => { setTimeout(resolve, 1000); });

  await configureLCEVCdec();

  while (!window.LCEVCdec.loadeddata) {
    await new Promise((resolve) => { setTimeout(resolve, 800); });
  }

  // Wait 10s when running on BrowserStack to allow the video to fully load
  await new Promise((resolve) => { setTimeout(resolve, 10000); });
}

/**
 * Dump the given texture object, containing a WebGL framebuffer and return it as Uint8Array.
 * This specifically dumps only the first row of pixels as the tests check pixel values within
 * the first row only. This provides a large performance boost, allowing almost all frames to
 * be checked.
 *
 * @param {HTMLCanvasElement} canvas_ the canvas tag
 * @param {object} texture the object containing a WebGL framebuffer
 * @returns {object} object with the dumped WebGL framebuffer as Uint8Array (first row only)
 */
function dump(canvas_, texture) {
  const { width, framebuffer } = texture;
  const height = 1; // dump only the first row of pixels
  const pixels = new Uint8Array(width * height * 4);

  const gl = canvas_.getContext('webgl');
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

/**
 * The residual sync test content is made up of n unique frames, resulting in n unique positions.
 * getCoord allows us to get the coordinates of the n'th unique position.
 *
 * @param {number} n the unique frame number
 * @returns {number} the coordinate of the n'th unique position
 */
function getCoord(n) {
  const _x = 0;
  const shift = 90; // the shift is predefined when the contents are being generated
  return _x + (shift * n);
}

/**
 * Check whether the currently rendered frame is in sync. This iterates over the n unique positions
 * to figure out which base frame we are on. Due to the way the content is generated, the residual
 * should be nearby, with a coordinate offset defined by the residualCoordOffset. If the residual
 * is there, the content is in sync. If the residual was not found, the content is out of sync
 * and false will be returned.
 *
 * @param {HTMLCanvasElement} canvas_ the canvas tag
 * @param {LCEVCdec} lcevcDec lcevcDec instance
 * @returns {bool} true if the frame was in sync, false otherwise
 */
function checkInSync(canvas_, lcevcDec) {
  const texture = lcevcDec.internal_dumpFrame().fboStates.fboApplyY;
  const frame = new Uint8Array(unpack(dump(canvas_, texture)));

  for (let f = 0; f < uniqueFrameCount; f += 1) {
    const x = getCoord(f);
    if (frame[x + baseCoordOffset] > detectionThreshold
      && frame[x + residualCoordOffset] > detectionThreshold
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Get a random number in range min to max.
 *
 * @param {number} min the lower bound of the range
 * @param {number} max the higher bound of the range
 * @returns {number} random number in range min (inclusive) to max (exclusive)
 */
function getRandomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Get an array of random numbers in range min to max, rounded to two decimal places.
 *
 * @param {number} min the lower bound of the range
 * @param {number} max the higher bound of the range
 * @param {number} length the length of the returned array
 * @returns {number} array filled with random numbers in range min (inclusive) to max (exclusive)
 */
function arrayInRange(min, max, length) {
  return [...Array(length)].map(() => Math.round(getRandomInRange(min, max) * 100) / 100);
}

/**
 * Launches a residual sync playback test. This will playback the whole video and compare
 * every single frame up until the video ends and 'onended' event is fired. The test will pass
 * if 90% of frames were in sync. It relies on the checkInSync(...) method to check whether a given
 * frame is in sync.
 *
 * @param {HTMLVideoElement} video_ the video tag
 */
async function residualSyncPlaybackTest(video_) {
  let frameCount = 0;
  let inSyncCount = 0;

  let testPassed;
  let testFailed;

  // eslint-disable-next-line no-param-reassign
  video_.onended = () => {
    console.log(`Checked ${frameCount} frames, ${inSyncCount} frames were in sync.`);
    if (frameCount * testPassedThreshold > inSyncCount) {
      testFailed();
    } else {
      testPassed();
    }
  };
  video_.play();

  const callback = () => {
    const inSync = checkInSync(canvas, window.LCEVCdec.instance);
    if (inSync) {
      inSyncCount += 1;
    }
    frameCount += 1;
    video_.requestVideoFrameCallback(callback);
  };
  video_.requestVideoFrameCallback(callback);

  await new Promise((resolve, reject) => {
    testPassed = resolve;
    testFailed = reject;
  });
}

/**
 * Launches a residual sync seek test. This will seek the video to the specified timestamps.
 * If any of these frames are out of sync, the test will fail. It relies on the checkInSync(...)
 * method to check whether a given frame is in sync.
 *
 * @param {HTMLVideoElement} video_ the video tag
 * @param {Array} timestamps an array of timestamps to seek to
 */
async function residualSyncSeekTest(video_, timestamps) {
  video_.play();
  await new Promise((resolve) => { setTimeout(resolve, 1000); });
  video_.pause();

  // eslint-disable-next-line no-restricted-syntax
  for (const timestamp of timestamps) {
    // eslint-disable-next-line no-param-reassign
    video_.currentTime = timestamp;
    await new Promise((resolve) => { setTimeout(resolve, 1000); });
    const inSync = checkInSync(canvas, window.LCEVCdec.instance);

    if (!inSync) {
      throw new Error(`Seek test failed. Content was not in sync @ ${timestamp} in ${timestamps}`);
    }
  }
}

describe('Residual Synchronisation', () => {
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

    video.muted = true;
    video.controls = true;

    document.body.appendChild(video);
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.removeChild(video);
    document.body.removeChild(canvas);
  });
  /* eslint-enable compat/compat */

  /* FMP4 HLS Tests */

  it('| Shaka Player | HLS Manifest | fMP4 | 1920x1080 | 30fps | Play Test |', async () => {
    await loadShakaPlayer(video, canvas, manifests.FMP4_HLS);
    await residualSyncPlaybackTest(video);
  }, TIMEOUT);

  it('| Shaka Player | HLS Manifest | fMP4 | 1920x1080 | 30fps | Seek Forward |', async () => {
    await loadShakaPlayer(video, canvas, manifests.FMP4_HLS);
    await residualSyncSeekTest(video, seekTimestamps);
  }, TIMEOUT);

  it('| Shaka Player | HLS Manifest | fMP4 | 1920x1080 | 30fps | Seek Backward |', async () => {
    await loadShakaPlayer(video, canvas, manifests.FMP4_HLS);
    await residualSyncSeekTest(video, seekTimestamps.reverse());
  }, TIMEOUT);

  xit('| Shaka Player | HLS Manifest | fMP4 | 1920x1080 | 30fps | Seek Random |', async () => {
    await loadShakaPlayer(video, canvas, manifests.FMP4_HLS);
    await residualSyncSeekTest(video, arrayInRange(1.0, 3.0, 10));
  }, TIMEOUT);

  /* FMP4 DASH Tests */

  it('| Shaka Player | DASH Manifest | fMP4 | 1920x1080 | 30fps | Play Test |', async () => {
    await loadShakaPlayer(video, canvas, manifests.FMP4_DASH);
    await residualSyncPlaybackTest(video);
  }, TIMEOUT);

  it('| Shaka Player | DASH Manifest | fMP4 | 1920x1080 | 30fps | Seek Forward |', async () => {
    await loadShakaPlayer(video, canvas, manifests.FMP4_DASH);
    await residualSyncSeekTest(video, seekTimestamps);
  }, TIMEOUT);

  it('| Shaka Player | DASH Manifest | fMP4 | 1920x1080 | 30fps | Seek Backward |', async () => {
    await loadShakaPlayer(video, canvas, manifests.FMP4_DASH);
    await residualSyncSeekTest(video, seekTimestamps.reverse());
  }, TIMEOUT);

  xit('| Shaka Player | DASH Manifest | fMP4 | 1920x1080 | 30fps | Seek Random |', async () => {
    await loadShakaPlayer(video, canvas, manifests.FMP4_DASH);
    await residualSyncSeekTest(video, arrayInRange(1.0, 3.0, 10));
  }, TIMEOUT);

  /* TS HLS Tests */

  it('| Shaka Player | HLS Manifest | TS | 1920x1080 | 30fps | Play Test |', async () => {
    await loadShakaPlayer(video, canvas, manifests.TS_HLS);
    await residualSyncPlaybackTest(video);
  }, TIMEOUT);

  it('| Shaka Player | HLS Manifest | TS | 1920x1080 | 30fps | Seek Forward |', async () => {
    await loadShakaPlayer(video, canvas, manifests.TS_HLS);
    await residualSyncSeekTest(video, seekTimestamps);
  }, TIMEOUT);

  it('| Shaka Player | HLS Manifest | TS | 1920x1080 | 30fps | Seek Backward |', async () => {
    await loadShakaPlayer(video, canvas, manifests.TS_HLS);
    await residualSyncSeekTest(video, seekTimestamps.reverse());
  }, TIMEOUT);

  xit('| Shaka Player | HLS Manifest | TS | 1920x1080 | 30fps | Seek Random |', async () => {
    await loadShakaPlayer(video, canvas, manifests.TS_HLS);
    await residualSyncSeekTest(video, arrayInRange(1.0, 3.0, 10));
  }, TIMEOUT);
});
