/* eslint-disable max-len */
/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

import DemuxerWorker from 'web-worker:./demux/demuxer_worker.js'; // eslint-disable-line
import {
  Result, Events, LcevcStatus, Browser, DPSMode
} from './globals/enums';
import { libDPI } from './globals/libdpi.ts';
import { Log, setLogLevel, getLogLevel } from './log.ts';
import DPI from './dpi';
import Queue from './queue/queue';
import Renderer from './renderer';
import ResidualStore from './residuals/residual_store';
import Stats from './stats';
import VideoControls from './controllers/video_controller';
import VisibilityController from './controllers/visibility_controller';
import { _binaryPositionSearch } from './algorithms/binary_position_search.ts';
import { lcevcImg } from './controllers/lcevc_assets.ts';
import { _deleteFBO } from './graphics/webgl';
import { mergeConfigurations } from './config.ts';
import EnvironmentUtils from './utils/environment_utils';
import Fullscreen from './fullscreen/fullscreen';

const PERFORMANCE_MIN_COUNT = 300;
const PERFORMANCE_SCALE_FACTOR = 2;
const POSTER_TRIES = 100;

/**
 * V-Nova LCEVC High Level Integration Layer.
 *
 * @class LCEVCdec
 */
class LCEVCdec {
  /** @private @type {HTMLVideoElement} */
  #video = null;

  /** @private @type {number} */
  #lastCurrentTime = -1;

  /** @private @type {HTMLCanvasElement} */
  #canvas = null;

  /** @private @type {HTMLElement} */
  #objError = null;

  /** @private @type {VisibilityController} */
  #visibilityController = null;

  /** @private @type {Object} */
  #configOptions = {};

  /** @private @type {!boolean} */
  #firstLcevcSegmentLoaded = false;

  /** @private @type {!boolean} */
  #lcevcEnabled = true;

  /** @private @type {!boolean} */
  #firstLcevcFound = true;

  /** @private @type {?DPI} */
  #lcevcDecoder = null;

  /** @private @type {boolean} */
  #lcevcDataDetected = false;

  /** @private @type {AudioContext} */
  #audioCtx = null;

  /** @private @type {MediaElementAudioSourceNode} */
  #audioVideoElement = null;

  /** @private @type {GainNode} */
  #audioNodeGain = null;

  /** @private @type {Object} */
  #currentBrowser = {
    browser: 'unknown',
    version: 'unknown'
  };

  /** @private @type {boolean} */
  #isSafari = false;

  /** @private @type {!number} */
  #currentLevel = -1;

  /** @private @type {!number} */
  containerFormat = 0;

  /** @private @type {!number} */
  streamingFormat = -1;

  /** @private @type {!boolean} */
  #lcevcPresentlyDecoded = false;

  /** @private @type {!number} */
  #nextLevel = -1;

  /** @private @type {number} */
  #reportedFrameRate = 0;

  /** @private @type {object} */
  #driftMap = {
    audio: [],
    video: [],
    audioData: new Map(),
    videoData: new Map()
  };

  /** @private @type {number} */
  #driftStartOffset = 2;

  /** @private @type {number} */
  #driftEndOffset = 0;

  /** @private @type {number} */
  #firstKeyframeOffset = 0.0;

  /** @private @type {number} */
  #timestampOffset = 0.0;

  /** @private @type {boolean} */
  #timestampOffsetReceived = false;

  /** @private @type {number} */
  #timestampOffsetForNextProfile = 0.0;

  /** @private @type {bool} */
  #rtpTimestampSync = false;

  /** @private @type {Object} */
  #eventHandler = {};

  /** @private @type {boolean} */
  #fullscreen = false;

  /** @private @type {boolean} */
  #firstPlay = false;

  /** @private @type {boolean} */
  #showPosterFrame = false;

  /** @private @type {number} */
  #posterTimestamp = 0;

  /** @private @type {number} */
  #posterTries = 0;

  /**
   * @typedef {object} PerformanceScaling
   * @property {boolean} enabled Indicates if it is enabled.
   * @property {boolean} active Indicates if it is active.
   * @property {number} resetCounter Indicates the reset counter.
   */
  /** @private @type {PerformanceScaling} */
  #performanceScaling = {
    enabled: true,
    active: false,
    resetCounter: 0,
    mode: DPSMode.OFF
  };

  /** @private @type {number} */
  #performanceScalingCounter = PERFORMANCE_MIN_COUNT;

  /** @private @type {number} */
  #lastPerformanceScalingEnableTime = 0;

  /** @private @type {boolean} */
  #videoFrameCallbackSupported = false;

  /** @private @type {boolean} */
  #videoFrameCallbackEnabled = false;

  /** @private @type {number} */
  #videoFrameCallbackId = null

  /** @private @type {Stats} */
  #stats = null

  /** @private @type {Queue} */
  #queue = null

  /** @private @type {ResidualStore} */
  #residualStore = null

  /** @private @type {Renderer} */
  #renderer = null

  /** @private @type {VideoControls} */
  #controls = null;

  /** @private @type {number} */
  #loopAnimationId = -1;

  /** @private @type {Worker} */
  #lcevcWorker = null;

  /** @private @type {Function} */
  #onDemuxerMessage = null;

  /** @private @type {object} */
  #events = {};

  /** @private @type {Function} */
  #boundEventFunction = null;

  /** @private @type {string[]} */
  #boundEventList = null;

  /** @private @type {number} */
  #ptsStart = 0;

  /** @private @type {number} */
  #ptsEnd = 0;

  /** @private @type {HTMLElement} */
  #logoElement = null;

  /** @private @type {number} */
  #lastTimeupdate = null;

  /** @private @type {number} */
  #logoOffset = 0;

  /** @private @type {boolean} */
  #progressOnce = true;

  /** @private @type {boolean} */
  #pausedFrame = null;

  /** @private @type {number} */
  #catchUpCount = 0;

  /** @private @type {number} */
  #renderBufferCheck = 0;

  /** @private @type {boolean} */
  #videoIsPaused = true;

  /** @private @type {boolean} */
  #recentlySeeked = false;

  /** @private @type {boolean} */
  #safariSeekFramePaused = false;

  /** @public @type {boolean} */
  seekedForFirstKeyframe = false;

  /** @private @type {number} */
  #previousLevel = -1;

  /** @private @type {object} */
  #fullscreenUtils = null;

  /**
   * Construct the LCEVCdec object.
   *
   * @class
   * @param {!HTMLVideoElement} video A video object.
   * @param {!HTMLCanvasElement} canvas The canvas to be used to display the stream.
   * @param {?object} configOptions An object containing values that override default settings.
   */
  constructor(video, canvas, configOptions) {
    // Create style sheets.
    if (!document.getElementById('lcevc-styles')) {
      const style = document.createElement('style');
      style.id = 'lcevc-styles';
      style.setAttribute('type', 'text/css');
      style.innerHTML = `
      /* debug tools */
      #lcevc-stats-infobox,
      #lcevc-stats-infobox-content,
      #lcevc-stats-infobox-btn,
      #lcevc-stats-infobox-advanced {
        display: block;
        left: 0;
        top: 0;
        font-size: 12px;
        font-family: monospace;
        color: #fff;
        white-space: pre;
      }
      #lcevc-stats-infobox {
        position: absolute;
        padding: 8px;
      }
      #lcevc-stats-infobox-content {
        position: relative;
      }
      #lcevc-stats-infobox-btn {
        position: relative;
        padding: 2px 8px;
        margin-top: 10px;
        width:fit-content;
        font-size: 10px;
        background-color: #333;
        border: 1px solid #555;
        border-radius: 4px;
        cursor: pointer;
      }
      #lcevc-stats-infobox-advanced {
        height: fit-content;
        white-space: normal;
        pointer-events: none;
      }
      #lcevc-stats-infobox-advanced table {
        display: inline-block;
        vertical-align: top;
        border: 4px solid #fff;
        border-collapse: collapse;
        font-size: 11px;
      }
      #lcevc-stats-infobox-advanced td {
        border: 1px solid rgba(255,255,255,0.15);
        padding: 4px;
        vertical-align: top;
        white-space: pre;
      }
      #lcevc-stats-infobox-advanced-frame {
        background-color: #06435f;
        color: #3eecf4;
      }
      #lcevc-stats-infobox-advanced-queue {
        background-color: #123423;
        color: #3ef4a8;
      }
      #lcevc-stats-infobox-advanced-residuals {
        background-color: #84391c;
        color: #f8bf1e;
        min-height: 1600px;
      }
      `;
      document.getElementsByTagName('head')[0].appendChild(style);
    }

    if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype) && 'getVideoPlaybackQuality' in HTMLVideoElement.prototype) {
      let currentTimeHistory = [0, 0, 0];
      let predictedTime = 0;

      const getFrameRate = (function () {
        if (this.#reportedFrameRate > 0) {
          return this.#reportedFrameRate;
        }
        // If reportedFrameRate is 0, the video has not been played.
        // Fallback to default frame rate of 30
        return 30;
      }).bind(this);

      const isRecentlySeeked = (function () {
        return this.#recentlySeeked;
      }).bind(this);

      const clearRecentlySeeked = (function () {
        this.#recentlySeeked = false;
      }).bind(this);

      HTMLVideoElement.prototype._rvfcpolyfillmap = {};
      HTMLVideoElement.prototype.requestVideoFrameCallback = function (callback) {
        const quality = this.getVideoPlaybackQuality();
        const baseline = this.mozPresentedFrames || this.mozPaintedFrames || quality.totalVideoFrames - quality.droppedVideoFrames;

        const check = (old, now) => {
          const newquality = this.getVideoPlaybackQuality();
          const presentedFrames = this.mozPresentedFrames || this.mozPaintedFrames || newquality.totalVideoFrames - newquality.droppedVideoFrames;
          if (presentedFrames > baseline) {
            const processingDuration = this.mozFrameDelay || (newquality.totalFrameDelay - quality.totalFrameDelay) || 0;
            // Precise difference in milliseconds between invocations of check, runs at 60 fps
            const timediff = now - old;

            // Property this.currentTime is very inaccurate on Firefox, and sometimes returns
            // the same value twice, even though the video frame has already changed. Therefore,
            // we keep track of the currentTime ourselves, and resync it to the video once the same
            // timestamp is encountered twice, as this gives an indication of the true timestamp. We
            // also resync if the video has been seeked.
            currentTimeHistory = [this.currentTime].concat(currentTimeHistory);
            currentTimeHistory.pop();

            const currentTime = currentTimeHistory[0];
            if (isRecentlySeeked()) {
              clearRecentlySeeked();
              predictedTime = this.currentTime;
            } else if (currentTime === currentTimeHistory[1]
              && currentTime !== currentTimeHistory[2]) {
              predictedTime = this.currentTime;
            } else if (Math.abs(predictedTime - this.currentTime) > 0.1) {
              predictedTime = this.currentTime;
            } else {
              predictedTime += 1 / getFrameRate();
            }
            callback(now, {
              presentationTime: now + processingDuration * 1000,
              expectedDisplayTime: now + timediff,
              width: this.videoWidth,
              height: this.videoHeight,
              mediaTime: predictedTime,
              presentedFrames,
              processingDuration
            });
            // eslint-disable-next-line no-use-before-define
            delete this._rvfcpolyfillmap[handle];
          } else {
            // eslint-disable-next-line no-use-before-define
            this._rvfcpolyfillmap[handle] = requestAnimationFrame((newer) => check(now, newer));
          }
        };

        const handle = Date.now();
        const now = performance.now();
        this._rvfcpolyfillmap[handle] = requestAnimationFrame((newer) => check(now, newer));
        return handle; // spec says long, not doube, so can't re-use performance.now
      };

      HTMLVideoElement.prototype.cancelVideoFrameCallback = function (handle) {
        cancelAnimationFrame(this._rvfcpolyfillmap[handle]);
        delete this._rvfcpolyfillmap[handle];
      };
    }
    // Check if video and canvas has the right type.
    if (video.constructor.name !== 'HTMLVideoElement'
      || canvas.constructor.name !== 'HTMLCanvasElement') {
      throw new TypeError('The LCEVCdec constructor requires a HTMLVideoElement and a '
        + 'HLTMCanvasElement to be passed to it.');
    }

    this.#video = video;
    this.#canvas = canvas;

    // Set the initial canvas size to match the video size.
    this.#canvas.style.width = '100%';

    // this.#canvas.style.height = 'auto';
    this.#canvas.style.height = '100%';

    // Inverts CSS's auto sizing to preserve the video ratio depending on the viewer's ratio.
    this.#addListener(document, 'fullscreenchange', (e) => this.#morphingAjustments(e));

    // The Webkit vendor prefix is requried for fullscreenchange on Safari.
    this.#addListener(document, 'webkitfullscreenchange', (e) => this.#morphingAjustments(e));
    this.#addListener(window, 'orientationchange', (e) => this.#morphingAjustments(e));

    this.#visibilityController = new VisibilityController(this.clearTemporal.bind(this));

    // #region Set all configurable values.
    // Override with received values.
    this.#configOptions = mergeConfigurations(configOptions);

    this.enablePerformanceScaling(this.#configOptions.dps);
    // #endregion

    this.#showPosterFrame = this.#configOptions.poster;
    this.#video.loop = this.#configOptions.loop;

    window.driftEndOffset = this.#driftEndOffset;

    this.#clearDriftMap();

    // #region video frame callback
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      Log.info('requestVideoFrameCallback supported.');

      // API is supported
      this.#videoFrameCallbackSupported = true;
    }
    // #endregion

    // #region Init main object classes.
    /** @private @type {DPI} */
    this.#lcevcDecoder = new DPI(this);
    this.#lcevcDecoder._openLcevcDecoder(this.#video, this.#canvas);
    const gl = this.#lcevcDecoder._gl;

    this.#controls = new VideoControls(this, this.#configOptions.playerControls);
    this.#stats = new Stats(this, this.#configOptions.debugStats, this.#canvas.parentElement);
    this.#queue = new Queue(this, gl);
    this.#residualStore = new ResidualStore(this);
    this.#renderer = new Renderer(gl);
    this.#fullscreenUtils = new Fullscreen(this);

    this.#browserDetection();

    // Video listeners.
    this.#unbindVideoEvents();
    this.#bindVideoEvents();

    // #region Setup worker.
    this.#lcevcWorker = new DemuxerWorker();
    this.#onDemuxerMessage = this.#onWorkerMessage.bind(this);

    this.#addListener(this.#lcevcWorker, 'message', this.#onDemuxerMessage);

    this.#lcevcWorker.postMessage(
      {
        id: 'userConfig',
        config: this.#configOptions
      }
    );

    setLogLevel(this.#configOptions.logLevel);
    // #endregion

    this.resetBuffer();
    // #endregion

    if (this.#configOptions.logo) {
      this.#initLogo();
    }

    this.#loopStart();

    /**
     * Resize multiple video instances
     *
     * Add the global resizer only if it does not exist.
     */
    if (!window.__lcevcDecResizer) window.__lcevcDecResizer = this.#lcevcDecResizerPartial();

    // Call the resizer
    window.__lcevcDecResizer(canvas.parentElement, (...args) => this.#resizeHandler(...args));

    window.LCEVCdec.instance = this;
  }

  /**
   * Return the `HTMLVideoElement` used for the video.
   *
   * @readonly
   * @returns {HTMLVideoElement} The `HTMLVideoElement`.
   * @memberof LCEVCdec
   * @exports
   */
  get video() {
    return this.#video;
  }

  /**
   * Return the `Current Browser`.
   *
   * @readonly
   * @returns {Object} The `Current Browser`.
   * @memberof LCEVCdec
   * @exports
   */
  get currentBrowser() {
    this.#browserDetection();
    return this.#currentBrowser;
  }

  /**
   * Returns the fullscreen status from the video controls.
   *
   * @readonly
   * @returns {boolean} Return `true` if the video is fullscreen, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  get isFullscreen() {
    return this.#fullscreen || this.#controls._isFullscreen;
  }

  /**
   * Returns if the video is live or not.
   *
   * @readonly
   * @returns {boolean} Return `true` if the video is live, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  get isLcevcPresentlyDecoded() {
    return this.#lcevcPresentlyDecoded;
  }

  /**
   * Returns if the video is live or not.
   *
   * @readonly
   * @returns {boolean} Return `true` if the video is live, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  get isLive() {
    return this.#controls._isLive;
  }

  /**
   * Returns the video controls.
   *
   * @readonly
   * @returns {VideoControls} video controls
   * @memberof LCEVCdec
   * @exports
   */
  get controls() {
    return this.#controls;
  }

  /**
   * Returns if the DPS is enabled or not.
   *
   * @readonly
   * @returns {boolean} Return `true` if dynamic performance scaling is enabled, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  get isPerformanceScalingEnabled() {
    return this.#performanceScaling.enabled;
  }

  /**
   * Get if videoFrameCallback is enabled
   *
   * @readonly
   * @returns {boolean} Return `true` if videoFrameCallback is enabled, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  get videoFrameCallbackEnabled() {
    return this.#videoFrameCallbackEnabled;
  }

  /**
   * Enable or disable the DPS.
   *
   * @param {!boolean} value `true` to enable it, `false` to disable it.
   * @memberof LCEVCdec
   * @exports
   */
  enablePerformanceScaling(value) {
    this.#performanceScaling.enabled = value;
  }

  /**
   * Return if LCEVC is enable or not.
   *
   * @returns {boolean} `true` if LCEVC is enable, otherwise `false`.
   * @readonly
   * @memberof LCEVCdec
   */
  get isLcevcEnabled() {
    return this.#lcevcEnabled;
  }

  /**
   * Returns if the DPS is active or not.
   *
   * @readonly
   * @returns {boolean} Return `true` if the performance scaling is active, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  get isPerformanceScalingActive() {
    return this.#performanceScaling.active;
  }

  /**
   * Returns if LCEVC data was detected in the stream.
   *
   * @readonly
   * @returns {boolean} Return `true` if lcevc data is detected in the video, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  get lcevcDataDetected() {
    return this.#lcevcDataDetected;
  }

  /**
   * Return the width size of the displayed frame.
   *
   * @readonly
   * @returns {number} The width size.
   * @memberof LCEVCdec
   * @exports
   */
  get frameWidth() {
    return this.#renderer && this.#renderer._presentationFrameWidth;
  }

  /**
   * Return the height size of the displayed frame.
   *
   * @readonly
   * @returns {number} The height size.
   * @memberof LCEVCdec
   * @exports
   */
  get frameHeight() {
    return this.#renderer && this.#renderer._presentationFrameHeight;
  }

  /**
   * Return the number value of the current level.
   *
   * @readonly
   * @returns {number} The current level.
   * @memberof LCEVCdec
   * @exports
   */
  get currentLevel() {
    return this.#currentLevel;
  }

  /**
   * Return the number value of the next level.
   *
   * @readonly
   * @returns {number} The current level.
   * @memberof LCEVCdec
   * @exports
   */
  get nextLevel() {
    return this.#nextLevel;
  }

  /**
   * Returns if the first LCEVC data from the stream is found.
   *
   * @readonly
   * @returns {boolean} Return `true` if a segment with lcevc has been loaded, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  get firstLcevcSegmentLoaded() {
    return this.#firstLcevcSegmentLoaded;
  }

  /**
   * Returns the value of the aspect ratio of the video.
   *
   * @readonly
   * @returns {number} The aspect ratio.
   * @memberof LCEVCdec
   * @exports
   */
  get aspectRatio() {
    return this.#lcevcDecoder._lcevcAspectRatio;
  }

  /**
   * Returns the if frame is 1D.
   *
   * @readonly
   * @returns {boolean} the 1D status.
   * @memberof LCEVCdec
   * @exports
   */
  get is1D() {
    return this.#queue._is1D;
  }

  /**
   * Returns the frame rate of the video.
   *
   * @readonly
   * @returns {number} The frame rate.
   * @memberof LCEVCdec
   * @exports
   */
  get frameRate() {
    return this.#reportedFrameRate;
  }

  /**
   * An offset applied to residuals to account for the delay between 0 and the first keyframe
   * of the video/stream.
   *
   * @readonly
   * @returns {!number}
   * @memberof LCEVCdec
   * @exports
   */
  get firstKeyframeOffset() {
    return this.#firstKeyframeOffset;
  }

  /**
   * An optional additional offset applied to residuals, defaults to 0.
   *
   * @readonly
   * @returns {!number}
   * @memberof LCEVCdec
   * @exports
   */
  get timestampOffset() {
    return this.#timestampOffset;
  }

  /**
   * Sum of firstKeyframeOffset and timestampOffset, i.e. total offset applied to residuals.
   *
   * @readonly
   * @returns {!number}
   * @memberof LCEVCdec
   * @exports
   */
  get totalOffset() {
    return this.#firstKeyframeOffset + this.#timestampOffset;
  }

  /**
   *
   * @readonly
   * @returns {!bool}
   * @memberof LCEVCdec
   * @exports
   */
  get rtpTimestampSync() {
    return this.#rtpTimestampSync;
  }

  /**
   *
   * @readonly
   * @returns {!number}
   * @memberof LCEVCdec
   * @exports
   */
  get renderBufferCheck() {
    return this.#renderBufferCheck;
  }

  /**
   * Set shaderKernel0 used for upscaling
   *
   * @param {Array} kernel The kernel.
   * @memberof DPI
   * @public
   */
  set shaderKernel0(kernel) {
    this.#lcevcDecoder.shaderKernel0 = kernel;
  }

  /**
   * Set shaderKernel1 used for upscaling
   *
   * @param {Array} kernel The kernel.
   * @memberof DPI
   * @public
   */
  set shaderKernel1(kernel) {
    this.#lcevcDecoder.shaderKernel1 = kernel;
  }

  /**
   * An offset applied to residuals to account for the delay between 0 and the first keyframe
   * of the video/stream.
   *
   * @param {!number} offset
   * @memberof LCEVCdec
   * @exports
   */
  setFirstKeyframeOffset(offset) {
    this.#firstKeyframeOffset = offset;
  }

  /**
   * An optional additional offset applied to residuals, defaults to 0.
   *
   * @param {!number} offset
   * @memberof LCEVCdec
   * @exports
   */
  setTimestampOffset(offset) {
    this.#timestampOffset = offset;
  }

  /**
   * If called, we signal that a profile was switched,
   * and apply the new timestampOffset associated with that profile
   * that was passed in appendBuffer.
   *
   * @memberof LCEVCdec
   * @exports
   */
  useTimestampOffsetForNextProfile() {
    this.setTimestampOffset(this.#timestampOffsetForNextProfile);
  }

  /**
   * Get the value of the option of the lcevc configuration.
   *
   * @param {!string} option The name of the option.
   * @returns {?any}
   * @memberof LCEVCdec
   * @exports
   */
  getConfigOption(option) {
    return this.#configOptions[option];
  }

  /**
   * Set the option with the value to the lcevc configuration.
   *
   * @param {!string} option
   * @param {!number} value
   * @memberof LCEVCdec
   * @exports
   */
  setConfigOption(option, value) {
    if (Object.prototype.hasOwnProperty.call(this.#configOptions, option)) {
      this.#configOptions[option] = value;
    } else {
      Error('Wrong config option.');
    }
  }

  /**
   * Returns the input color profile.
   *
   * @readonly
   * @returns {string} The color profile.
   * @memberof DPI
   * @exports
   */
  get profileIn() {
    return this.#lcevcDecoder._profileIn;
  }

  /**
   * Set the input color profile.
   *
   * @param {!string} profileName The new color profile name.
   * @memberof LCEVCdec
   * @exports
   */
  setProfileIn(profileName) {
    this.#lcevcDecoder._setProfileIn = profileName;
  }

  /**
   * Returns the output color profile.
   *
   * @readonly
   * @returns {string} The color profile.
   * @memberof DPI
   * @exports
   */
  get profileOut() {
    return this.#lcevcDecoder._profileOut;
  }

  /**
   * Set the output color profile.
   *
   * @param {!string} profileName The new color profile name.
   * @memberof LCEVCdec
   * @exports
   */
  setProfileOut(profileName) {
    this.#lcevcDecoder._setProfileOut = profileName;
  }

  /**
   * Set the video loop property.
   * (Internal use only)
   *
   * @param {!boolean} onOff
   * @memberof LCEVCdec
   * @exports
   */
  _internal_setVideoLoop(onOff) { // eslint-disable-line camelcase
    this.#video.loop = onOff;
  }

  /**
   *
   * @param {!number} start
   * @param {!number} end
   * @param {?number} level
   * @param {?'video'|'audio'} type
   * @param {?number} drift
   * @memberof LCEVCdec
   * @exports
   */
  newPts(start, end, level, type, drift = Number.NaN) {
    if (!type || (type && type === 'video')) {
      this.#ptsStart = start;
      this.#ptsEnd = end;
    }
    if (!Number.isNaN(drift)) {
      this.#addDrift(type, drift, start, end, level);
    }
  }

  /**
   * Set the status of the debug stats.
   *
   * @param {!boolean} enable The status.
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  _internal_setDebugStats(enable) { // eslint-disable-line camelcase
    this.#configOptions.debugStats = enable;
    this.#stats._enable(this.#configOptions.debugStats, this.#canvas.parentElement);
    return Result.OK;
  }

  /**
   * Tell LCEVCdec that the player has trigger a fullscreen event.
   *
   * @param {boolean} enable `true` when enter fullscreen, otherwise `false`.
   * @memberof LCEVCdec
   * @exports
   */
  onFullscreen(enable) {
    this.#fullscreen = enable;
    if (enable) {
      this.#playStarted();
    }
  }

  #initLogo() {
    const canvasParent = this.#canvas.parentElement;
    this.#logoElement = new Image();
    this.#logoElement.src = lcevcImg;
    this.#logoElement.style.zIndex = '100';
    this.#logoElement.style.position = 'absolute';
    this.#logoElement.style.width = '15%';
    this.#logoElement.style.margin = '10px 10px';
    this.#logoElement.hidden = true;
    canvasParent.prepend(this.#logoElement);
  }

  /**
   * Show or hide the logo.
   *
   * @param {boolean} onOff `true` to show it and `false` to hide it.
   * @returns {Result}
   * @memberof LCEVCdec
   * @public
   */
  _toggleLogo(onOff) {
    if (!this.#configOptions.logo || !this.#logoElement || this.#logoElement.hidden === !onOff) {
      return Result.ERROR;
    }
    if (onOff === false) {
      this.#logoOffset += 1;
    }
    if (!onOff && this.#logoOffset <= 3) {
      return Result.OK;
    }
    this.#logoOffset = 0;
    this.#logoElement.hidden = !onOff;
    this.#lcevcPresentlyDecoded = onOff;
    return Result.OK;
  }

  /**
   * Enable or disable LCEVC.
   * Also, it calls to `_toggleLogo`.
   *
   * @param {boolean} onOff `true` to enable it and `false` to disable it.
   * @memberof LCEVCdec
   * @public
   */
  _enableLcevc(onOff) {
    this.#lcevcEnabled = onOff;
    this._toggleLogo(onOff);
  }

  /**
   *
   * @readonly
   * @returns {Array}
   * @memberof LCEVCdec
   * @exports
   */
  get _internal_decoderParseStats() { // eslint-disable-line
    // This absurdly convoluted code is to get stats from the decoder lcevc parse function
    // for use in the stats object.
    return this.#lcevcDecoder._parseStats;
  }

  /**
   * Sets options depending on the browser.
   *
   * @memberof LCEVCdec
   * @returns {Result} The result code.
   * @private
   */
  #browserDetection() {
    const browser = EnvironmentUtils.detectBrowser();
    this.#currentBrowser.browser = browser;

    if (browser === Browser.FIREFOX) {
      // This existed which did not make any difference in performance when commented.
      // But kept in the code for reference
      // this.#lcevcDecoder._setGLOptions({ preserveDrawingBuffer: true });
    } else if (browser === Browser.SAFARI) {
      // This existed which did not make any difference in performance when commented.
      // But kept in the code for reference
      // this.#lcevcDecoder._setGLOptions({ preserveDrawingBuffer: true });
      this.#isSafari = true;
    }

    return Result.OK;
  }

  // #region Main loop
  #videoFrameCallback(now, metadataIn) {
    const metadata = metadataIn;
    // If videoFrameCallback crash use the interval behaviour.
    if (!now && !metadata) {
      this.#videoFrameCallbackSupported = false;
      this.#videoFrameCallbackEnabled = false;
    }

    if (!this.#videoFrameCallbackEnabled) {
      this.#video.cancelVideoFrameCallback(this.#videoFrameCallbackId);
      return;
    }
    if (metadata.mediaTime === 0) {
      metadata.mediaTime = this.#video.currentTime;
    }
    let frameRate = null;
    if (this.#video.frameMetadata) {
      const t0 = this.#video.frameMetadata.mediaTime;
      const t1 = metadata.mediaTime;
      frameRate = 1 / (t1 - t0);
      if (this.#queue._recentFrameRate) this.#reportedFrameRate = this.#queue._recentFrameRate;
      else this.#reportedFrameRate = frameRate;
    }

    const frameMetadata = metadata;
    frameMetadata.frameRate = frameRate;
    frameMetadata.now = now;
    this.#video.frameMetadata = frameMetadata;

    // Some browsers may fire a videoFrameCallback after the video has been paused
    if (!this.#videoIsPaused) {
      this.#queue._inputFrame(
        this.#renderer, this.#residualStore, this.#video, frameMetadata, this.#lcevcDecoder
      );
    }

    // Loop.
    this.#videoFrameCallbackId = this.#video.requestVideoFrameCallback(
      this.#videoFrameCallback.bind(this)
    );
  }

  /**
   * This is the core of the app. The update loop will feed video frames
   * into the queue, which will then either render them immediately or
   * defer their rendering for smooth playback
   *
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @private
   */
  #loopStart() {
    window.cancelAnimationFrame(this.#loopAnimationId);

    if (this.#videoFrameCallbackSupported && !this.#videoFrameCallbackEnabled) {
      this.#videoFrameCallbackEnabled = true;
      this.#videoFrameCallbackId = this.#video.requestVideoFrameCallback(
        this.#videoFrameCallback.bind(this)
      );
    }

    this.#loopAnimationId = window.requestAnimationFrame(this.#loopUpdate.bind(this));

    return Result.OK;
  }

  /**
   * Loop main function.
   *
   * @memberof LCEVCdec
   * @private
   */
  #loopUpdate() {
    // Get video information.
    const video = this.#video;

    // Cancel previous scheduled loops.
    window.cancelAnimationFrame(this.#loopAnimationId);

    if (!this.#queue) {
      window.clearTimeout(this.#loopAnimationId);
    } else {
      // If no framemetadata use standard frame input.
      if (!this.#videoFrameCallbackEnabled) {
        if (this.#lastCurrentTime !== video.currentTime) {
          this.#queue._inputFrame(
            this.#renderer, this.#residualStore, video, null, this.#lcevcDecoder
          );
          if (this.#queue._recentFrameRate) this.#reportedFrameRate = this.#queue._recentFrameRate;
        }
      }

      if (this.#firstPlay) {
        // Present frame.
        this.#queue._updateQueue(this.#stats, this.#video, this.#residualStore);
        if (!this.#queue._isQueueRendered) {
          const presentStatus = this.#queue._presentFrame(
            this.#lcevcDecoder,
            this.#renderer,
            this.#canvas,
            this.#stats,
            this.#configOptions.renderAtDisplaySize,
            this.#configOptions.renderAtPixelRatio,
            this.#canvas.parentElement
          );
          this.#lcevcPresentlyDecoded = presentStatus === LcevcStatus.APPLIED;

          if (this.#configOptions.logo) {
            this._toggleLogo(presentStatus === LcevcStatus.APPLIED);
          }

          if (presentStatus === LcevcStatus.ERROR) {
            // Re-add frame.
            this.#queue._inputFrame(
              this.#renderer, this.#residualStore, video, video.frameMetadata, this.#lcevcDecoder
            );
          }
        } else {
          this.#pausedFrame = this.#queue._displayFrame
            ? this.#queue._displayFrame : this.#pausedFrame;
        }
      }

      // Controls.
      this.#controls._update();

      // Stats.
      this.#stats._update();

      // Performace scaling.
      if (this.isPerformanceScalingEnabled) {
        this.#performanceScalingUpdate();
      }

      this.#lastCurrentTime = video.currentTime;
      if (this.#videoFrameCallbackEnabled || this.#queue._recentFrameRate === 0) {
        this.#loopAnimationId = window.requestAnimationFrame(
          this.#loopUpdate.bind(this)
        );
      } else {
        this.#loopAnimationId = setTimeout(this.#loopUpdate.bind(this), 100 / this.#queue._recentFrameRate);
      }
    }
    this.#morphingAjustments();
  }

  /**
   * Stops the main loop.
   *
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @private
   */
  #loopStop() {
    window.cancelAnimationFrame(this.#loopAnimationId);
    return Result.OK;
  }
  // #endregion

  // #region Audio

  /**
   * Update the audio params.
   *
   * @param {!number} audioDelay The audio delay.
   * @returns {Result} The status code.
   * @memberof LCEVCdec
   * @public
   */
  _updateAudioParams(audioDelay) {
    if (this.#audioVideoElement !== null) {
      this.audioNodeDelay.delayTime.value = audioDelay > 0 ? audioDelay : 0;
    }

    return Result.OK;
  }

  /**
   * Initialise the audio parameters.
   *
   * @returns {Result} The status code.
   * @memberof LCEVCdec
   * @private
   */
  #initialiseAudioParams() {
    if (this.#setAudioContext() === Result.OK) {
      // get context
      if (this.#audioVideoElement === null) {
        try {
          this.#audioVideoElement = this.#audioCtx.createMediaElementSource(this.video);
        } catch (err) {
          Error(err);
        }
      }

      // gain node (for mute)
      this.#audioNodeGain = this.#audioCtx.createGain();
      this.#audioNodeGain.connect(this.#audioCtx.destination);

      // delay node
      this.audioNodeDelay = this.#audioCtx.createDelay(10);
      this.audioNodeDelay.connect(this.#audioNodeGain);
      this.audioNodeDelay.delayTime.value = this.#queue._getAudioDelay;

      try {
      // connect to video
        this.#audioVideoElement.connect(this.audioNodeDelay);
      } catch (err) {
        Error(err);
      }
    }

    return Result.OK;
  }

  /**
   * Set the audio context.
   *
   * @returns {Result} The status code.
   * @memberof LCEVCdec
   * @private
   */
  #setAudioContext() {
    // Existing context already created.
    if (this.#audioCtx == null) {
      // New context.
      if (window.AudioContext) {
        this.#audioCtx = new AudioContext();
      } else if (window.webkitAudioContext) {
        // eslint-disable-next-line new-cap
        this.#audioCtx = new window.webkitAudioContext();
      } else {
        return Result.ERROR;
      }
    }

    return Result.OK;
  }
  // #endregion

  /**
   * Force to render a frame and then delete it.
   *
   * @param {!QueueFrame} frame The queue frame.
   * @returns {Result} The status code.
   */
  #presentAndDeleteFrame(frame) {
    if (this.#queue === null) {
      return Result.OK;
    }
    const presentStatus = this.#queue._presentFrame(
      this.#lcevcDecoder,
      this.#renderer,
      this.#canvas,
      this.#stats,
      this.#configOptions.renderAtDisplaySize,
      this.#configOptions.renderAtPixelRatio,
      this.#canvas.parentElement,
      frame
    );

    if (this.#configOptions.logo) {
      this._toggleLogo(presentStatus === LcevcStatus.APPLIED);
    }

    _deleteFBO(this.#lcevcDecoder._gl, frame.fbo);

    return Result.OK;
  }

  /**
   * Sets the given frame as #pausedFrame and renders the frame.
   *
   * @param {Object} queryFrame The QueueFrame.
   * @returns {Result} The status code.
   * @memberof LCEVCdec
   * @private
   */
  #renderOnPaused(queryFrame) {
    this.#pausedFrame = queryFrame;
    if (this.#queue === null) {
      return Result.OK;
    }
    const presentStatus = this.#queue._presentFrame(
      this.#lcevcDecoder,
      this.#renderer,
      this.#canvas,
      this.#stats,
      this.#configOptions.renderAtDisplaySize,
      this.#configOptions.renderAtPixelRatio,
      this.#canvas.parentElement,
      queryFrame
    );

    if (this.#configOptions.logo) {
      this._toggleLogo(presentStatus === LcevcStatus.APPLIED);
    }

    return Result.OK;
  }

  /**
   * Get a frame from the video to use it as a poster.
   *
   * Try to get it with LCEVC data. If in 1 second no LCEVC data is available for the selected
   * timestamp, it get it without it.
   *
   * @returns {Result} The status code.
   * @memberof LCEVCdec
   */
  async #renderPosterFrame() {
    // If LCEVC data is loaded in the desired poster timestamp, grab it.
    if (this.#residualStore && this.#residualStore._hasLcevcData(this.#posterTimestamp)) {
      this.#queue._inputFrame(
        this.#renderer, this.#residualStore, this.#video, null, this.#lcevcDecoder, true, true
      ).then((frame) => {
        this.#renderOnPaused(frame);
      });
      if (this.isLcevcPresentlyDecoded) {
        return Result.OK;
      }
    }
    this.#posterTries += 1;

    if (this.#posterTries < POSTER_TRIES) {
      setTimeout(this.#renderPosterFrame.bind(this), 10);
    } else {
      // If no LCEVC data was loaded before the timeout, take a frame as is.
      this.#queue._inputFrame(
        this.#renderer, this.#residualStore, this.#video, null, this.#lcevcDecoder, true, true
      ).then((frame) => {
        // Prevent double re-render, as seeking to first keyframe will already do a re-render
        if (!this.seekedForFirstKeyframe) {
          this.#renderOnPaused(frame);
        }
      });
    }

    return Result.OK;
  }

  /**
   * Enable the queue rendering and creates the audio context.
   *
   * Call when the video is played for the first time or it wasn't played yet
   * but the time has change.
   *
   * @returns {Result} The status code.
   * @memberof LCEVCdec
   * @private
   */
  #playStarted() {
    if (!this.#firstPlay) {
      this.#firstPlay = true;
      this.#initialiseAudioParams();
    }

    return Result.OK;
  }

  /**
   * Handle video events.
   *
   * @param {!object} e The event.
   * @memberof LCEVCdec
   * @private
   */
  #videoEvent(e) {
    switch (e.type) {
      case 'loadeddata':
        this.#controls._checkIsLive(this.#video.currentTime);
        this.#controls._update();

        if (this.#showPosterFrame) {
          this.#posterTimestamp = this.#video.currentTime;
          this.#renderPosterFrame();
        }

        // Input frame on load, it is responsible for displaying the first frame
        this.#queue._inputFrame(
          this.#renderer, this.#residualStore, this.#video, null, this.#lcevcDecoder, false, true, 0, 0
        );
        window.LCEVCdec.loadeddata = true;
        break;
      case 'play':
        if (this.#audioCtx) {
          this.#audioCtx.resume();
        }
        this.#videoIsPaused = false;
        this.#playStarted();

        this.#queue._unsyncPresentationTime();
        this.#controls._refreshIcons(true);
        if (this.#isSafari) {
          // In latest Safari if we play a .m3u8 manifest it gets stuck in the first and second frame
          // and keeps alternating. We have fixed that by giving it a slight seek when played.
          this.#video.currentTime += 0.001;
        }
        break;
      case 'pause':
        this.#videoIsPaused = true;
        this.#queue._unsyncPresentationTime();
        this.#controls._refreshIcons(false);

        // On Firefox, apply a seek operation to fix residual alignment on pause
        // Apply an offset of 0.01 to prevent random frame jumping
        if (this.#currentBrowser.browser === Browser.FIREFOX) {
          this.#video.currentTime = this.#video.currentTime + 0.01;
        }
        break;
      case 'seeked':
        this.#recentlySeeked = true;
        // If it wasn't play, set it as it has start playing to render the frame.
        this.#playStarted();

        // Clear queue
        this.#queue._resetQueue();

        // Clear history of temporal buffer.
        if (this.#queue._isLcevcParsed) {
          libDPI._perseus_decoder_clear_temporal(this.#lcevcDecoder._lcevcDecoderPointer, 0);
        }

        // If paused, input the frame because videoframecallback can be called before this event.
        // If safari the seek operation does not move the video frame, hence not applicable.
        if (this.#video.paused && this.#currentBrowser.browser !== 'Safari') {
          this.#queue._inputFrame(
            this.#renderer, this.#residualStore, this.#video, null, this.#lcevcDecoder, false, true, 0, 1
          );
        }

        // Safari does not update the video frame is user seeked while paused, therefore
        // we play and pause to update the video frame
        if (this.#isSafari && this.#videoIsPaused && !this.#safariSeekFramePaused && this.#video.currentTime > 0.1) {
          this.#safariSeek(this.#video.currentTime);
        }

        break;
      case 'render':
        if (this.#video.paused) {
          this.#queue._resetQueue();

          const inputFrame = this.#queue._inputFrame(
            this.#renderer,
            this.#residualStore,
            this.#video,
            this.#video.frameMetadata,
            this.#lcevcDecoder,
            true,
            true
          );

          inputFrame.then((queryFrame) => {
            this.#presentAndDeleteFrame(queryFrame);
          });
        }
        break;
      case 'resizing':
        if (this.#pausedFrame) {
          this.#renderOnPaused(this.#pausedFrame);
        }
        break;
      case 'timeupdate':
        this.#lastTimeupdate = this.#video.currentTime;
        break;
      default:
        break;
    }
  }

  /**
   * This is a fix for Safari not rendering the seeked frame when seeked.
   *
   * @param {!number} referenceTimestamp timestamp used as a reference to move the video.
   * @memberof LCEVCdec
   * @private
   */
  #safariSeek(referenceTimestamp) {
    const vol = this.#video.volume;
    this.#video.volume = 0;
    this.#video.play();
    const pauseLoop = setInterval(() => {
      if (this.#video.currentTime - referenceTimestamp > 0.1) {
        this.#video.pause();
        this.#safariSeekFramePaused = false;
        this.#video.volume = vol;
        clearInterval(pauseLoop);
      }
    }, 100);
    this.#safariSeekFramePaused = true;
  }

  /**
   * Resizes and moves the canvas to the specified dimensions.
   *
   * @param {!string} width Width of the canvas.
   * @param {!string} height Height of the canvas.
   * @param {!string} padding Padding to be applied on the canvas.
   * @param {!string} paddingDirection Padding to be applied on the direction.
   * @memberof LCEVCdec
   * @private
   */
  #resizeFullScreenCanvas(width, height, padding, paddingDirection) {
    this.#canvas.style.height = height === 'auto' ? height : `${height}px`;
    this.#canvas.style.width = width === 'auto' ? width : `${width}px`;
    this.#canvas.style[paddingDirection] = padding;
  }

  /**
   * Manages ajustmetns for fullscreen, fullscreen-exit, orientation change and resize.
   *
   * @memberof LCEVCdec
   * @private
   */
  #morphingAjustments() {
    this.#canvas.style.top = '0px';
    this.#canvas.style.left = '0px';
    const fullscreenElement = document.fullscreenElement // eslint-disable-line
    || document.webkitCurrentFullScreenElement;
    // All fullscreen changes handled here.
    if (fullscreenElement) {
      const frameAspectRatio = this.frameWidth / this.frameHeight;
      // For when screen orientation is landscape
      if (fullscreenElement.clientHeight < fullscreenElement.clientWidth) {
        // For when scaled content width can fit the screen width
        if (fullscreenElement.clientWidth >= frameAspectRatio * fullscreenElement.clientHeight) {
          this.#resizeFullScreenCanvas('auto', fullscreenElement.clientHeight, `${(fullscreenElement.clientWidth - this.#canvas.width) / 2}px`, 'left');
        } else {
          this.#resizeFullScreenCanvas(fullscreenElement.clientWidth, 'auto', `${(fullscreenElement.clientHeight - this.#canvas.height) / 2}px`, 'top');
        }
      // For when screen orientation is portrait and content height can fit the screen height
      } else if (fullscreenElement.clientHeight >= (1 / frameAspectRatio) * fullscreenElement.clientWidth) {
        this.#resizeFullScreenCanvas(frameAspectRatio * fullscreenElement.clientHeight, 'auto', `${(fullscreenElement.clientHeight - this.#canvas.height) / 2}px`, 'top');
      } else {
        this.#resizeFullScreenCanvas('auto', fullscreenElement.clientWidth / frameAspectRatio, `${(fullscreenElement.clientWidth - this.#canvas.width) / 2}px`, 'left');
      }
      // Incase of fullscreen sometimes due to 1D contents the fullscreen aspect ratio goes weird with the resolution,
      // To fix this we need to have a logic to hide the video tag when the canvas is visible and bring it back on fullscreen exit.
      const style = window.getComputedStyle(this.#canvas);
      if (style.display === 'block') {
        this.#video.style.display = 'none';
      } else {
        this.#video.style.display = 'block';
      }
    } else {
      this.#video.style.display = 'block';
      this.#canvas.style.width = '100%';
      this.#canvas.style.height = '100%';
    }
  }

  /**
   * Creates the __lcevcDecResizer global function.
   *
   * @returns {Function} The __lcevcDecResizer
   * @memberof LCEVCdec
   * @private
   */
  #lcevcDecResizerPartial = () => {
    // This closure allows the use multiple variables without polluting the window object.
    let register = [null];
    let resizeObserver;
    /* eslint-disable */
    /**
     * Creates the __lcevcDecResizer function to manage resizing of video instances
     *
     * @param {HTMLElement} videoElement     The canvas video player's parent element
     * @param {Function} videoResizeHandler  The handler to call on resize
     * @returns {Function} __lcevcDecResizer
     * @memberof LCEVCdec
     * @private
     */
    /* eslint-enable */
    return (videoElement, videoResizeHandler) => {
      let hasMatch = false;
      const registerTemp = [];
      /*
       * Create a new list to:
       * - Replace updated records
       * - Remove null records
       * - Exclude deleted elements
       * - Exclude disconnected elements
       * - Add new records lazily
       */

      for (let i = 0; i < register.length; i += 1) {
        const record = (register[i] || {});
        const { element, handler } = record;
        const lastIndex = i === register.length - 1;
        // No matches found on the last index.
        if (lastIndex && !hasMatch) {
          // The last element is also not a match.
          if (element !== videoElement) {
            register.push({
              element: videoElement,
              handler: videoResizeHandler
            });
          }
        }
        if (element) {
          /*
           * The element exists but is detatched from the document
           * Continue prevents it from being block if it due to be released
           * into memory.
          */
          if (!element.isConnected) continue; // eslint-disable-line
          if (!handler) continue; // eslint-disable-line
          // Update a matching record.
          if (element === videoElement) {
            hasMatch = true;
            registerTemp.push({
              element: videoElement,
              handler: videoResizeHandler
            });
            continue; // eslint-disable-line
          }
          // Add existing active records
          registerTemp.push(record);
        }
      }
      // New updates are stored for the next updaet.
      register = registerTemp;
      // Unobserve all existing observables.
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        // Create a new resize-observer.
        resizeObserver = new ResizeObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.contentBoxSize) {
              // Find the matching target.
              const record = register.find((value) => value.element === entry.target);
              if (record && record.handler) record.handler(entry.target);
            }
          });
        });
      }
      // Observe elements from the replenished register.
      register.forEach(({ element }) => resizeObserver.observe(element));
    };
  }

  /**
   * Allows a resized observable to trigger as a videoEvent
   * Called from __lcevcDecResizer.
   * Additional options can be suppliled as arguments: target, contentBoxSize etc.
   *
   * @memberof LCEVCdec
   * @private
   */
  #resizeHandler() {
    if (this.#video.paused) {
      this.#videoEvent({ type: 'resizing' });
    }
    this.#morphingAjustments();
  }

  /**
   * Clears the LCEVC temporal.
   *
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  clearTemporal() {
    if (!this.#lcevcDecoder || !this.#queue._isLcevcParsed) return Result.ERROR;

    const emPointer = this.#lcevcDecoder._lcevcDecoderPointer;
    // eslint-disable-next-line
    libDPI._perseus_decoder_clear_temporal(emPointer, 0);

    return Result.OK;
  }

  /**
   * Level load event handler.
   *
   * @param {!object} level The load event level.
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  setCurrentLevel(level) {
    this.#currentLevel = level;
    this.clearTemporal();
    this.#queue._resetQueue();
    return Result.OK;
  }

  /**
   * Level load event handler.
   *
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  setCurrentLevelBufferSwitch() {
    this.#currentLevel = this.#nextLevel;
    this.clearTemporal();
    return Result.OK;
  }

  /**
   * To set the contaniner flag.
   *
   * @param {!object} containerFormat if container is webm,mp4 or ts.
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  setContainerFormat(containerFormat) {
    this.containerFormat = containerFormat;
    return Result.OK;
  }

  /**
   * To set the streaming type
   *
   * @param {!object} streamingFormat if streaming is HLS or DASH.
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  setStreamingFormat(streamingFormat) {
    this.streamingFormat = streamingFormat;
    return Result.OK;
  }

  /**
   * Clears the drift map data.
   *
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @private
   */
  #clearDriftMap() {
    this.#driftMap = {
      audio: [],
      video: [],
      audioData: new Map(),
      videoData: new Map()
    };
    return Result.OK;
  }

  /**
   * Level switching event handler.
   *
   * @param {!number} level The next level.
   * @param {!boolean} mode AutoBuffer Switch
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  setLevelSwitching(level, mode) {
    this.#nextLevel = level;
    if (mode) {
      this.#renderBufferCheck = 1;
    }
    return Result.OK;
  }

  /**
   * Get the log level.
   *
   * @returns {LogLevel} The log level.
   * @memberof LCEVCdec
   * @exports
   */
  static get logLevel() {
    return getLogLevel();
  }

  /**
   * Set the log level.
   *
   * @param {!LogLevel} level The log level.
   * @memberof LCEVCdec
   * @exports
   */
  set logLevel(level) {
    setLogLevel(level);
    this.#lcevcWorker.postMessage(
      {
        id: 'config',
        level
      }
    );
  }

  /**
   * If the stats indicate that performance is too slow, activate DPS.
   * If not, then wait until timer is at zero and deactivate.
   *
   * The DPS counter is increase if the current time is lower than the last time
   * it was enable plus the minimum time of the counter multiplied by a scale
   * factor. This means that the DPS has been activate shortly after been
   * disabled. Otherwise, it is decreased, but never lower than the minimum.
   *
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @private
   */
  #performanceScalingUpdate() {
    if (this.#stats._getRenderDecline || this.#stats._getTimeRatio > 1) {
      if (this.#performanceScaling.active && this.#stats._getDPSRenderDecline) {
        // Base only mode: hide the canvas and show the video tag
        this.#video.style.display = 'block';
        this.#canvas.style.display = 'none';
        this.#performanceScalingLog(DPSMode.BASE_ONLY, 'base-only enabled, canvas is hidden.');
      } else {
        // Bring back the canvas, we no longer need base-only mode as performance has improved
        this.#canvas.style.display = 'block';
      }
      if (!this.#performanceScaling.active) {
        this.#trigger(Events.PERFORMANCE_DROPPED);
        const maxSwitch = this.#stats._incrementMaxSwitch;
        if (this.#lastPerformanceScalingEnableTime
          + (PERFORMANCE_MIN_COUNT / this.#reportedFrameRate) * PERFORMANCE_SCALE_FACTOR
          > this.#video.currentTime && maxSwitch < 6) {
          this.#performanceScalingCounter *= PERFORMANCE_SCALE_FACTOR;
        } else if (this.#performanceScalingCounter > PERFORMANCE_MIN_COUNT) {
          this.#performanceScalingCounter /= PERFORMANCE_SCALE_FACTOR;
        }

        this.#performanceScaling.active = true;
        this.setConfigOption('shaderPath', 0);
        this.#performanceScaling.resetCounter = this.#performanceScalingCounter;
        this.#lastPerformanceScalingEnableTime = this.#video.currentTime;
        this.#performanceScalingLog(DPSMode.ACTIVE, 'pass-through enabled, upscale only.');
      } else {
        this.setConfigOption('shaderPath', this.getConfigOption('shaderPath'));
      }
    } else if (this.#performanceScaling.active) {
      this.#performanceScaling.resetCounter -= 1;
      if (this.#performanceScaling.resetCounter <= 0) {
        this.#performanceScaling.active = false;
        this.setConfigOption('shaderPath', 1); // bring back residuals
        this.#performanceScaling.resetCounter = 0;
        this.#trigger(Events.PERFORMANCE_RESTORED);
        this.#performanceScalingLog(DPSMode.OFF, 'full decoding restored.');
      }
    } else {
      this.setConfigOption('shaderPath', this.getConfigOption('shaderPath'));
    }

    return Result.OK;
  }

  /**
   * Logs Dynamic Performance Scaling updates to the console, regardless of log level
   *
   * @param {DPSMode} mode the mode that DPS has entered
   * @param {string} message the message to log to the user
   * @memberof LCEVCdec
   * @private
   */
  #performanceScalingLog(mode, message) {
    if (this.#performanceScaling.mode !== mode) {
      this.#performanceScaling.mode = mode;
      Log.always(`Dynamic Performance Scaling: ${message}`);
    }
  }

  /**
   * Append the fMP4 fragments after they are appended to Media Source Extensions
   * SourceBuffer. Here the lcevc data will be extracted and manged in line with
   * the ranges given by the SourceBuffer.buffered() call result
   *
   * @param {!ArrayBuffer} data fMP4 fragment.
   * @param {'video'|'audiovideo'} type The type of the fragment.
   * @param {!number} level The level of the fragment.
   * @param {!number} timestampOffset Offset added to the timestamps in the fragment.
   * @returns {Result}
   * @exports
   */
  appendBuffer(data, type, level, timestampOffset = 0.0) {
    if (type !== 'video' && type !== 'audiovideo') {
      throw new Error('Type should be "video" or "audiovideo"');
    }

    if (data.constructor.name !== 'ArrayBuffer' && data.constructor.name !== 'Uint8Array') {
      throw new TypeError('The passed argument is not of type: ArrayBuffer');
    }

    if (!this.#timestampOffsetReceived) {
      this.#timestampOffsetReceived = true;
      this.setTimestampOffset(timestampOffset);
    }

    if (level !== this.#previousLevel) {
      this.#previousLevel = level;
      this.#timestampOffsetForNextProfile = timestampOffset;
    }

    const dataToWorker = new Uint8Array(data).slice();
    this.#lcevcWorker.postMessage(
      {
        id: 'demux',
        videoData: dataToWorker,
        level,
        type,
        containerFormat: this.containerFormat
      },
      [dataToWorker.buffer]
    );

    return Result.OK;
  }

  /**
   * This needs to be called before a resolution/track switch
   * to reset the decoders internal buffers.
   *
   * @returns {Result} The result code.
   * @exports
   */
  resetBuffer() {
    this.#lcevcWorker.postMessage({ id: 'reset' });
    this.#lcevcDecoder._reset(this.#residualStore, Math.trunc(this.#video.currentTime));
    return Result.OK;
  }

  /**
   * Add a new drift value.
   *
   * @param {('audio'|'video')} type Data type.
   * @param {number} drift The amount of drift.
   * @param {number} start The start point.
   * @param {number} end The end point.
   * @param {number} level The level of the data.
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @private
   */
  #addDrift(type, drift, start, end, level) {
    if ((drift > 0 && drift < 1) || (drift < 0 && drift > -1)) return Result.OK;

    if (type === 'audio') {
      const pos = _binaryPositionSearch(this.#driftMap.audio, start);
      this.#driftMap.audio.splice(pos, 0, start);
      let realDrift = drift;
      if (pos !== -1) {
        const prevAudioData = this.#driftMap.audioData.get(this.#driftMap.audio[pos]);
        if (prevAudioData && Math.abs(prevAudioData.end - start) < 20) {
          realDrift = prevAudioData.drift;
        }
      }
      this.#driftMap.audioData.set(start, {
        start: start - this.#driftStartOffset,
        end: end + this.#driftEndOffset,
        level,
        drift: drift + realDrift
      });
    } else if (type === 'video') {
      // If there is audio drift in the same interval sum the drift value to the video one.
      let audioDrift = 0;
      const posAudioDrift = _binaryPositionSearch(this.#driftMap.audio, start) - 1;
      if (posAudioDrift >= 0) {
        const audioData = this.#driftMap.audioData.get(this.#driftMap.audio[posAudioDrift]);
        if (audioData) {
          const inDrift = Math.abs(start - audioData.start) < 2
            && Math.abs(end - audioData.end) < 2
            && audioData.level === level;
          audioDrift = inDrift ? audioData.drift : 0;
        }
      }
      const pos = _binaryPositionSearch(this.#driftMap.video, start);
      this.#driftMap.video.splice(pos, 0, start);
      this.#driftMap.videoData.set(start, {
        start,
        end: end + this.#driftEndOffset,
        level,
        drift: drift + audioDrift
      });
    }

    return Result.OK;
  }

  /**
   * Remove the drift value inside the given interval.
   *
   * @param {number} start The start of the interval.
   * @param {number} end The end of the interval.
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @private
   */
  #flushDrifts(start, end) {
    const audioIndexPos = _binaryPositionSearch(this.#driftMap.audio, end) - 1;
    if (audioIndexPos >= 0) {
      const audioPos = this.#driftMap.audio[audioIndexPos];
      for (let it = 0; it < audioPos; it += 1) {
        this.#driftMap.audioData.delete(it);
      }
      this.#driftMap.audio.slice(audioPos);
    }

    const videoIndexPos = _binaryPositionSearch(this.#driftMap.video, end) - 1;
    if (videoIndexPos >= 0) {
      const videoPos = this.#driftMap.video[videoIndexPos];
      for (let it = 0; it < videoPos; it += 1) {
        this.#driftMap.videoData.delete(it);
      }
      this.#driftMap.video.slice(videoPos);
    }

    return Result.OK;
  }

  /**
   * Get the drift at the given time.
   *
   * @param {number} time The time to check.
   * @returns {number} The drift if any, otherwise 0.
   * @memberof LCEVCdec
   * @private
   */
  #getDrift(time) {
    let drift = 0;
    const posAudioDrift = _binaryPositionSearch(this.#driftMap.audio, time) - 1;
    if (posAudioDrift >= 0) {
      const audioData = this.#driftMap.audioData.get(this.#driftMap.audio[posAudioDrift]);
      if (audioData) {
        const inDrift = time >= audioData.start && time <= audioData.end;
        drift += inDrift ? audioData.drift : 0;
      }
    }

    const posVideoDrift = _binaryPositionSearch(this.#driftMap.video, time) - 1;
    if (posVideoDrift >= 0) {
      const videoData = this.#driftMap.videoData.get(this.#driftMap.video[posVideoDrift]);
      if (videoData) {
        const inDrift = time >= videoData.start && time <= videoData.end;
        drift += inDrift ? videoData.drift : 0;
      }
    }

    return drift;
  }

  /**
   * Flush data to match the state of the video buffered data.
   *
   * @param {number} startTime The flushed data start time.
   * @param {number} endTime The flushed data end time.
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  flushBuffer(startTime, endTime) {
    if (!Number.isFinite(endTime)) return -1;

    this.#residualStore._flushDataRange(startTime, endTime);
    this.#flushDrifts(startTime, endTime);
    this.#queue._resetQueue();

    return Result.OK;
  }

  /**
   * Feed Raw LCEVC Data directly to the LCEVCdec for
   * usecases where callbacks from MSE is not applicable
   * with timestamp that corresponds to the video frame
   *
   * @param {!ArrayBuffer} data Raw LCEVC data
   * @param {?number} timestamp The timestamp to which the LCEVC data is associated
   * @param {?number} timescale The timescale for the data relative to timestamp
   * @param {?number} duration The duration of the data.
   * @param {?number} baseDecodeTime  The time taken to decode base.
   * @returns {Result}
   * @exports
   */
  addRawLcevcData(data, timestamp = NaN, timescale = NaN, duration = NaN,
    baseDecodeTime = NaN) {
    this.#lcevcWorker.postMessage(
      {
        id: 'rawLCEVC',
        lcevcData: data,
        timestamp,
        timescale,
        duration,
        baseDecodeTime
      },
      [data.buffer]
    );

    return Result.OK;
  }

  /**
   * Feed Raw LCEVC Data in NAL directly to the LCEVCdec for
   * usecases where callbacks from MSE is not applicable
   * with timestamp that corresponds to the video frame
   *
   * @param {!ArrayBuffer} data Raw LCEVC NALU data
   * @param {?number} timestamp The timestamp to which the LCEVC data is associated
   * @param {?bool} rtpTimestampSync Enable rtpTimestampSync
   * @param {?number} naluFormat Nal Unit Format - 1: AVCC (Default) 2: Annex-B
   * @returns {Result}
   * @exports
   */
  addRawNalLcevcData(data, timestamp = NaN, rtpTimestampSync = false, naluFormat = 1) {
    this.#lcevcWorker.postMessage(
      {
        id: 'rawNalLCEVC',
        lcevcData: data,
        timestamp,
        naluFormat
      },
      [data.buffer]
    );
    this.#rtpTimestampSync = rtpTimestampSync;
    return Result.OK;
  }

  /**
   * Dumps the current frame
   *
   * @param {bool} refreshFrame true if frame should be refreshed (resetQueue and inputFrame)
   * @returns {object}
   * @memberof LCEVCdec
   * @exports
   */
  internal_dumpFrame(refreshFrame = false) { // eslint-disable-line
    let queueFrame = {};

    if (refreshFrame) {
      // render current frame
      this.#queue._resetQueue();
      queueFrame = this.#queue._inputFrame(
        this.#renderer,
        this.#residualStore,
        this.#video,
        this.#video.frameMetadata,
        this.#lcevcDecoder,
        false,
        true
      );
    }

    // get base video and residual textures
    const textures = this.#queue.getInternalTextures();

    // get internal framebuffer states
    const fboStates = this.#renderer._getInternalFrameBufferStates();

    // return
    return {
      queueFrame,
      textures,
      fboStates
    };
  }

  /**
   * Display an error on the video canvas.
   *
   * @param {string} message The error message.
   * @returns {HTMLElement} The error element.
   * @memberof LCEVCdec
   * @exports
   */
  displayError(message) {
    if (!this.#objError) {
      this.#objError = document.createElement('div');
      const id = 'lcevc-error-infobox';
      this.#objError.id = id;
      this.#objError.style.cssText = `
      position: absolute;
      z-index: 9999;
      top:0;
      left:0;
      color: #fff;
      background-color: rgba(0,0,0,0.8);
      padding:10px;
      font-family:Arial;
      font-size:1.25em;`;
      this.#canvas.parentElement.appendChild(this.#objError);
    }

    this.#objError.innerHTML = `&#x26A0; Error<br/>${message}`;
    Log.error(message);

    return this.#objError;
  }

  /**
   * Clears the error message from the canvas.
   *
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  clearError() {
    if (this.#objError) this.#objError.remove();

    return Result.OK;
  }

  /**
   * Closes the decoder.
   *
   * Usecase: When detaching a stream/media call this and then call reset()
   * to reopen the decoder.
   *
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @exports
   */
  close() {
    // Stop update loop.
    this.#loopStop();

    if (this.#videoFrameCallbackSupported) {
      this.#videoFrameCallbackEnabled = false;
    }

    // Terminate worker.
    if (this.#lcevcWorker) {
      this.#removeAllListeners(this.#lcevcWorker, 'message');
      this.#lcevcWorker.terminate();
      this.#lcevcWorker = null;
    }

    // Video listeners.
    this.#unbindVideoEvents();
    this.#eventHandler = null;

    // Event listeners
    this.#events = {};

    // Close decoder.
    if (this.#lcevcDecoder) {
      this.#lcevcDecoder._close();
      this.#lcevcDecoder = null;
    }

    // Close other objects.
    if (this.#queue) {
      this.#queue._close();
      this.#queue = null;
    }

    if (this.#residualStore) {
      this.#residualStore._close();
      this.#residualStore = null;
    }

    if (this.#renderer) {
      this.#renderer._close();
      this.#renderer = null;
    }

    if (this.#controls) {
      this.#controls._close();
      this.#controls = null;
    }

    if (this.#stats) {
      this.#stats._close();
      this.#stats = null;
    }

    if (this.#visibilityController) {
      this.#visibilityController._close();
      this.#visibilityController = null;
    }

    if (this.#logoElement) {
      this.#logoElement.remove();
      this.#logoElement = null;
    }

    // This removes all instances of arrows after loading.
    const dropDownImgs = document.querySelectorAll('[data-dec-drop-down-img]');
    if (dropDownImgs) {
      [...dropDownImgs].forEach((dropDownImgs) => {  // eslint-disable-line
        dropDownImgs.remove();
      });
    }

    console.info('::::: closing LCEVCdec :::::'); // eslint-disable-line
    return Result.OK;
  }

  /**
   * Worker main body.
   *
   * @param {object} e The worker message data.
   * @memberof LCEVCdec
   * @private
   */
  #onWorkerMessage(e) {
    const { id } = e.data;
    const { level } = e.data;

    if (id === 'lcevcData' && [-1, this.#nextLevel, this.#currentLevel].includes(level)) {
      if (e.data.end) {
        if (!this.#firstLcevcSegmentLoaded) this.#firstLcevcSegmentLoaded = e.data.end;
        return;
      }

      // Flag that lcevc is found.
      this.#lcevcDataDetected = true;

      const { frameSample } = e.data;
      const { pssData } = e.data;

      const cts = frameSample[0];
      const timescale = frameSample[1];
      const base = frameSample[3];
      // eslint-disable-next-line max-len
      const timestamp = this.#rtpTimestampSync ? cts : cts / timescale + Math.min(base, 0) / timescale;
      const drift = this.#getDrift(timestamp);

      if (drift !== 0) {
        return; // Drifted data is rejected.
      }
      if (this.#firstLcevcFound) {
        this.#firstLcevcFound = false;
        this.#firstLcevcSegmentLoaded = true;
      }
      this.#residualStore._addData(
        timestamp,
        timescale,
        frameSample[2],
        frameSample[4],
        level,
        pssData,
        frameSample[5]
      );
    }

    if (id === 'rawLCEVC') {
      const { frameSample } = e.data;
      const { lcevcData } = e.data;

      this.#residualStore._addData(
        frameSample[0],
        frameSample[1],
        frameSample[2],
        frameSample[4],
        level,
        lcevcData,
        frameSample[5]
      );
    }
  }

  /**
   * Add a new event listener to the node.
   * Store the event on a cache so we can remove them easily.
   *
   * @param {object} node The target node.
   * @param {string} event The event.
   * @param {Function} handler The function handler.
   * @param {boolean} [capture=false]
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @private
   */
  #addListener(node, event, handler, capture = false) {
    if (!(event in this.#eventHandler)) {
      this.#eventHandler[event] = [];
    }
    this.#eventHandler[event].push({ node, handler, capture });
    node.addEventListener(event, handler, capture);

    return Result.OK;
  }

  /**
   * Remove all the event listeners of the target.
   *
   * @param {object} targetNode The target node.
   * @param {string} event The event.
   * @returns {Result} The result code.
   * @memberof LCEVCdec
   * @private
   */
  #removeAllListeners(targetNode, event) {
    // Remove listeners from the matching nodes.
    this.#eventHandler[event]
      .filter(({ node }) => node === targetNode)
      .forEach(({ node, handler, capture }) => node.removeEventListener(event, handler, capture));

    // Update event handle cache.
    this.#eventHandler[event] = this.#eventHandler[event].filter(
      ({ node }) => node !== targetNode
    );

    return Result.OK;
  }

  /**
   * Bind video events;
   *
   * @memberof LCEVCdec
   * @returns {Result} The result code.
   * @private
   */
  #bindVideoEvents() {
    const video = this.#video;
    const events = [
      'loadeddata',
      'play',
      'pause',
      'seeked',
      'render',
      'loadeddata',
      'timeupdate'
    ];

    this.#boundEventFunction = this.#videoEvent.bind(this);
    this.#boundEventList = events;
    events.forEach((event) => {
      this.#addListener(video, event, this.#boundEventFunction);
    });

    return Result.OK;
  }

  /**
   * Bind video events;
   *
   * @memberof LCEVCdec
   * @returns {Result} The result code.
   * @private
   */
  #unbindVideoEvents() {
    const video = this.#video;
    if (this.#boundEventFunction) {
      const events = this.#boundEventList;
      events.forEach((event) => {
        this.#removeAllListeners(video, event);
      });
      this.#boundEventFunction = null;
    }

    return Result.OK;
  }

  // #region Events.

  /**
   * Attach an event listener
   *
   * @memberof LCEVCdec
   * @param {!string} type The event.
   * @param {!string} listener The callback function.
   * @returns {Result} The result code.
   * @exports
   */
  on(type, listener) {
    if (!this.#events[type]) {
      this.#events[type] = [];
    }

    this.#events[type].push(listener);

    return Result.OK;
  }

  /**
   * Remove a single (or all) event listeners
   *
   * @memberof LCEVCdec
   * @param {!string} type The event.
   * @param {!string} listener The callback function to remove.
   * @returns {Result} The result code.
   * @exports
   */
  off(type, listener) {
    if (!this.#events[type]) return Result.FAIL;
    if (listener) {
      // remove specific event listener
      const filterListeners = (listenerToRemove) => listenerToRemove !== listener;
      this.#events[type] = this.#events[type].filter(filterListeners);
    } else {
      // remove all event listeners
      this.#events[type] = [];
    }

    return Result.OK;
  }

  /**
   * Trigger an event
   *
   * @memberof LCEVCdec
   * @param {!string} type The event.
   * @param {!object} data The data passed to any callback functions.
   * @returns {Result} The result code.
   * @private
   */
  #trigger(type, data) {
    if (!this.#events[type]) return Result.FAIL;

    const fireCallbacks = (callback) => {
      callback(data);
    };

    this.#events[type].forEach(fireCallbacks);

    return Result.OK;
  }

  /**
   * Returns a boolean indicating if fullscreen is supported
   * for the provided element in webkit (iOS) browsers.
   *
   * @memberof LCEVCdec
   * @param {HTMLDivElement} fullScreenElement element to be checked
   * @returns {boolean} true if fullscreen is supported
   * @public
   */
  webkitSupportsFullscreen(fullScreenElement) {
    return this.#fullscreenUtils.webkitSupportsFullscreen(fullScreenElement);
  }

  /**
   * Enter fullscreen on a webkit (iOS) browser for a div tag.
   *
   * @memberof LCEVCdec
   * @param {HTMLDivElement} fullScreenElement element to be displayed in fullscreen
   * @public
   */
  webkitEnterFullscreen(fullScreenElement) {
    this.#fullscreenUtils.webkitEnterFullscreen(fullScreenElement);
  }

  /**
   * Exit fullscreen on a webkit (iOS) browser for a div tag.
   *
   * @memberof LCEVCdec
   * @param {HTMLDivElement} fullScreenElement exit fullscreen for this element
   * @public
   */
  webkitExitFullscreen(fullScreenElement) {
    this.#fullscreenUtils.webkitExitFullscreen(fullScreenElement);
  }

  /**
   * Returns a boolean indicating if we are currently displaying
   * in fullscreen on webkit (iOS) browsers.
   *
   * @memberof LCEVCdec
   * @returns {boolean} true if currently displaying in fullscreen
   * @public
   */
  webkitDisplayingFullscreen() {
    return this.#fullscreenUtils.webkitDisplayingFullscreen();
  }

  /**
   * Returns a boolean indicating if LCEVCdec will handle device rotation
   * events on webkit (iOS) browsers for entering and exiting fullscreen.
   *
   * @memberof Fullscreen
   * @returns {boolean} true if LCEVCdec will handle device rotation events
   * @public
   */
  webkitHandlesOnRotationEvents() {
    return this.#fullscreenUtils.webkitHandlesOnRotationEvents();
  }

  // #endregion
}

export default { LCEVCdec };
