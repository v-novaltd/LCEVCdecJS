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

import LcevcToggle from './lcevc_toggle.ts';
import TimeRangeData from './time_range_data';

import { Result } from '../globals/enums';
import { shaderNames } from '../shaders/shaders_src';
import {
  _createShader,
  _createTexture,
  _deleteShader,
  _deleteTexture
} from '../graphics/webgl';
import { Log } from '../log.ts';

/**
 * @typedef {import('../graphics/webgl').ShaderObj} ShaderObj
 */

/** @constant @type {number} */
const ICON_SIZE = 32;

/** @constant @type {number} */
const ICON_SIZE_SCALED = ICON_SIZE * window.devicePixelRatio;

/**
 * The VideoControls class creates and controls the player controls.
 *
 * @class VideoControls
 */
class VideoControls {
  /** @private @type {LCEVCdec} */
  #lcevcDec = null;

  /** @private @type {object} */
  #config = null;

  /** @private @type {boolean} */
  #enabled = false;

  /** @private @type {HTMLElement} */
  #controlsDiv = null;

  /** @private @type {string} */
  #playIconImage = null;

  /** @private @type {string} */
  #pauseIconImage = null;

  /** @private @type {string} */
  #forwardIconImage = null;

  /** @private @type {string} */
  #rewindIconImage = null;

  /** @private @type {string} */
  #volumeFullIconImage = null;

  /** @private @type {string} */
  #volumeOffIconImage = null;

  /** @private @type {string} */
  #fullscreenIconImage = null;

  /** @private @type {number} */
  #numIcons = 0;

  /** @private @type {HTMLElement} */
  #playIcon = null;

  /** @private @type {HTMLElement} */
  #forwardIcon = null;

  /** @private @type {HTMLElement} */
  #rewindIcon = null;

  /** @private @type {HTMLElement} */
  #volumeIcon = null;

  /** @private @type {LcevcToggle} */
  #lcevcToggle = null;

  /** @private @type {HTMLElement} */
  #fullscreenIcon = null;

  /** @private @type {HTMLCanvasElement} */
  #canvasControls = null;

  /** @private @type{WebGLRenderingContext} */
  #gl = null;

  /** @private @type {ShaderObj} */
  #shaderControls = null;

  /** @private @type {ShaderObj} */
  #shaderScrub = null;

  /** @private @type {WebGLTexture} */
  #textureIcons = null;

  /** @private @type {HTMLCanvasElement} */
  #liveIcon = null;

  // #region Timing ranges
  /** @private @type {TimeRangeData} */
  #playedRange = null;

  /** @private @type {TimeRangeData} */
  #bufferedRange = null;

  /** @private @type {TimeRangeData} */
  #unplayedRange = null;

  /** @private @type {number} */
  #scrubTimeMin = 0;

  /** @private @type {number} */
  #scrubTimeMax = 0;

  /** @private @type {number} */
  #scrubTime0 = 0;

  /** @private @type {number} */
  #scrubTime1 = 0;

  /** @private @type {number} */
  #scrubTimeCursor = 0;
  // #endregion

  // #region ui
  /** @private @type {number} */
  #mouseX = -1;

  /** @private @type {number} */
  #mouseY = -1;

  /** @private @type {number} */
  #mouseIconIndex = -1;

  /** @private @type {boolean} */
  #isFullscreen = false;

  /** @private @type {HTMLElement} */
  #elemFullscreen = null;

  /** @private @type {function} */
  #mouseHandle = null;

  /** @private @type {function} */
  #resizeEventHandle = null;

  /** @private @type {string} */
  #oldPadding = '0';

  /** @private @type {boolean} */
  #isLive = null;
  // #endregion

  // #region Events
  /** @private @type {boolean} */
  #preventFullscreenChangeEvent = false;

  /** @private @type {function} */
  #fullscreenChangeEventHandle = null;
  // #endregion

  /**
   * Creates an instance of VideoControls.
   *
   * @param {!LCEVCdec} lcevcDec
   * @param {!object} configOptions
   * @memberof VideoControls
   */
  constructor(lcevcDec, configOptions) {
    this.#lcevcDec = lcevcDec;

    // Override with received values.
    this.#config = configOptions;

    // Quit if disabled.
    this.#enabled = this.#config && !!this.#config.enabled;
    if (!this.#enabled) return;

    this.#createElements(this.#config.controlsID);

    this.#elemFullscreen = this.#config.fullscreenElement || this.#controlsDiv.parentElement;

    this.#mouseHandle = this.#onMouseHandle.bind(this);
    this.#canvasControls.addEventListener('mousemove', this.#mouseHandle);
    this.#canvasControls.addEventListener('mousedown', this.#mouseHandle);
    this.#canvasControls.addEventListener('mouseout', this.#mouseHandle);
    this.#canvasControls.addEventListener('touchstart', this.#mouseHandle);
    this.#canvasControls.addEventListener('touchend', this.#mouseHandle);

    // Resize events.
    this.#resizeEventHandle = this.#onResizeEventHandle.bind(this);
    window.addEventListener('resize', this.#resizeEventHandle);

    this.#fullscreenChangeEventHandle = this.#onFullscreenChangeEvent.bind(this);

    // Safari needs his custom event handler.
    if (navigator.userAgent.indexOf('Safari') !== -1
      && navigator.userAgent.indexOf('Chrome') === -1) {
      window.addEventListener('webkitfullscreenchange', this.#fullscreenChangeEventHandle, false);
    } else {
      window.addEventListener('fullscreenchange', this.#fullscreenChangeEventHandle, false);
    }

    // Icon shader.
    const shader = _createShader(
      this.#gl,
      shaderNames.controls_vert,
      shaderNames.controls_frag,
      ['aPos', 'aUV', 'aState'],
      [
        'textureIcons',
        'canvasSize'
      ]
    );

    // Create vertex attribute buffers.
    const maxIconCount = 10;
    const cornerCount = maxIconCount * 6;

    shader.buffers = {};
    shader.buffers.pos = this.#gl.createBuffer();
    shader.buffers.posArray = new Float32Array(cornerCount * 2);
    shader.buffers.uv = this.#gl.createBuffer();
    shader.buffers.uvArray = new Float32Array(cornerCount * 2);
    shader.buffers.state = this.#gl.createBuffer();
    shader.buffers.stateArray = new Float32Array(cornerCount * 2);
    this.#shaderControls = shader;

    // Scrub shader.
    this.#shaderScrub = _createShader(
      this.#gl,
      shaderNames.scrub_vert,
      shaderNames.scrub_frag,
      ['aChunks'],
      [
        'canvasSize',
        'scrubArea',
        'timeRange',
        'color'
      ]
    );

    this.#playedRange = new TimeRangeData(this.#gl);
    this.#playedRange.color = this.#config.colorPlayed;

    this.#bufferedRange = new TimeRangeData(this.#gl);
    this.#bufferedRange.color = this.#config.colorBuffered;

    this.#unplayedRange = new TimeRangeData(this.#gl);
    this.#unplayedRange.color = this.#config.colorUnplayed;

    // Put icons in texture and send to GPU.
    this.#textureIcons = _createTexture(this.#gl);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#textureIcons);
    this.#gl.texImage2D(
      this.#gl.TEXTURE_2D,
      0,
      this.#gl.RGBA,
      this.#gl.RGBA,
      this.#gl.UNSIGNED_BYTE,
      this.#liveIcon
    );

    // First render.
    this._update();
  }

  /**
   * Returns if the fullscreen is enable or not.
   *
   * @readonly
   * @returns {boolean} `true` if fullscreen is enable, otherwise `false`.
   * @memberof VideoControls
   */
  get _isFullscreen() {
    return this.#isFullscreen;
  }

  /**
   * Returns if the stream is live or not.
   *
   * @readonly
   * @returns {boolean} `true` if the stream is live, otherwise `false`.
   * @memberof VideoControls
   */
  get _isLive() {
    return this.#isLive;
  }

  /**
   * Creates the HTMLElements of the controls.
   *
   * @param {string} controlsID The HTMLDivElement where the elements will be added.
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #createElements(controlsID) {
    // Create display canvas.
    this.#controlsDiv = document.getElementById(controlsID);
    this.#controlsDiv.style = `
    height: ${ICON_SIZE}px;
    background-color: #000000;`;

    const buttonStyle = `
    width: ${ICON_SIZE}px;
    height: ${ICON_SIZE}px;
    bottom: 0;
    position: relative;
    cursor: pointer`;

    this.#createIcons();

    // Set play icon.
    if (this.#config.playButton) {
      this.#playIcon = document.createElement('img');
      this.#playIcon.id = 'play-button';
      this.#playIcon.src = this.#playIconImage;
      this.#playIcon.style = buttonStyle;
      this.#playIcon.onclick = this.#onPlay.bind(this);
      this.#controlsDiv.appendChild(this.#playIcon);
      this.#numIcons += 1;
    }

    if (this.#config.seekButton) {
    // Set rewind icon.
      this.#rewindIcon = document.createElement('img');
      this.#rewindIcon.id = 'rewind-button';
      this.#rewindIcon.src = this.#rewindIconImage;
      this.#rewindIcon.style = buttonStyle;
      this.#rewindIcon.onclick = this.#onRewind.bind(this);
      this.#controlsDiv.appendChild(this.#rewindIcon);
      this.#numIcons += 1;

      // Set forward icon.
      this.#forwardIcon = document.createElement('img');
      this.#forwardIcon.id = 'forward-button';
      this.#forwardIcon.src = this.#forwardIconImage;
      this.#forwardIcon.style = buttonStyle;
      this.#forwardIcon.onclick = this.#onForward.bind(this);
      this.#controlsDiv.appendChild(this.#forwardIcon);
      this.#numIcons += 1;
    }

    if (this.#config.volumeButton) {
      // Set volume icon.
      this.#volumeIcon = document.createElement('img');
      this.#volumeIcon.id = 'volume-button';
      this.#volumeIcon.src = this.#volumeFullIconImage;
      this.#volumeIcon.style = buttonStyle;
      this.#volumeIcon.onclick = this.#onVolume.bind(this);
      this.#controlsDiv.appendChild(this.#volumeIcon);
      this.#numIcons += 1;
    }

    // Set fullscreen icon.
    if (this.#config.fullscreenButton) {
      this.#fullscreenIcon = document.createElement('img');
      this.#fullscreenIcon.id = 'fullscreen-button';
      this.#fullscreenIcon.src = this.#fullscreenIconImage;
      this.#fullscreenIcon.style = buttonStyle;
      this.#fullscreenIcon.onclick = this.#fullscreenToggle.bind(this);
    }

    if (this.#config.fullscreenButtonPos === 'left') {
      this.#controlsDiv.appendChild(this.#fullscreenIcon);
      this.#numIcons += 1;
    }

    // Create canvas.
    const canvas = document.createElement('canvas');
    canvas.style.position = 'relative';
    canvas.style.height = `${ICON_SIZE}px`;
    this.#canvasControls = canvas;
    this.#gl = canvas.getContext('webgl');

    // Set toggle icon.
    if (this.#config.toggleButton && this.#config.toggleButtonPos === 'left') {
      this.#lcevcToggle = new LcevcToggle(this.#lcevcDec, this.#controlsDiv);
      canvas.style.position = 'absolute';
      canvas.style.right = this.#config.fullscreenButtonPos === 'left'
        ? '0' : `${ICON_SIZE_SCALED}`;
    }

    // Set canvas.
    this.#controlsDiv.appendChild(canvas);

    // Set toggle icon.
    if (this.#config.toggleButton && this.#config.toggleButtonPos !== 'left') {
      this.#lcevcToggle = new LcevcToggle(this.#lcevcDec, this.#controlsDiv);
    }

    if (this.#config.fullscreenButtonPos !== 'left') {
      this.#fullscreenIcon.style.position = 'absolute';
      this.#fullscreenIcon.style.bottom = null;
      this.#fullscreenIcon.style.right = '0';
      this.#controlsDiv.appendChild(this.#fullscreenIcon);
      this.#numIcons += 1;
    }

    // Place on screen.
    this.#updatePosition();

    return Result.OK;
  }

  /**
   * Creates the icons used by the buttons.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #createIcons() {
    const size = ICON_SIZE_SCALED;

    this.#liveIcon = VideoControls.newCanvas(size * 2, size);

    // Live icon
    const canvas = VideoControls.newCanvas(size * 3, size - 2);
    let { ctx } = canvas;
    // Text.
    ctx.fillStyle = '#fff';
    const t = 'Live';
    const h = size * 0.5 | 0;
    ctx.font = `${h}px Arial`;
    ctx.fillText(t, size, size * 0.7);
    // Red spot.
    ctx.beginPath();
    ctx.fillStyle = '#f33';
    ctx.arc(size * 0.6, size * 0.5, size * 0.12, 0, 6.283185307179586);
    ctx.fill();
    this.#liveIcon.ctx.drawImage(canvas, 1, 1);

    // Draw play icon.
    let canvasDraw = VideoControls.newCanvas(62, 62);
    ({ ctx } = canvasDraw);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(20, 13);
    ctx.lineTo(20, 62 - 13);
    ctx.lineTo(45, 31);
    ctx.fill();
    this.#playIconImage = canvasDraw.toDataURL();

    // Pause rewind icon.
    canvasDraw = VideoControls.newCanvas(62, 62);
    ({ ctx } = canvasDraw);
    ctx.fillStyle = '#fff';
    ctx.fillRect(17, 16, 10, 62 - 16 - 16);
    ctx.fillRect(35, 16, 10, 62 - 16 - 16);
    this.#pauseIconImage = canvasDraw.toDataURL();

    if (this.#config.seekButton) {
    // Rewind icon.
      canvasDraw = VideoControls.newCanvas(62, 62);
      ({ ctx } = canvasDraw);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(30, 18);
      ctx.lineTo(30, 62 - 18);
      ctx.lineTo(16, 31);
      ctx.moveTo(44, 18);
      ctx.lineTo(44, 62 - 18);
      ctx.lineTo(30, 31);
      ctx.fill();
      this.#rewindIconImage = canvasDraw.toDataURL();

      // Forwards icon.
      canvasDraw = VideoControls.newCanvas(62, 62);
      ({ ctx } = canvasDraw);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(18, 18);
      ctx.lineTo(18, 62 - 18);
      ctx.lineTo(32, 31);
      ctx.moveTo(32, 18);
      ctx.lineTo(32, 62 - 18);
      ctx.lineTo(46, 31);
      ctx.fill();
      this.#forwardIconImage = canvasDraw.toDataURL();
    }

    // Volume full icon.
    canvasDraw = VideoControls.newCanvas(62, 62);
    ({ ctx } = canvasDraw);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(12, 25);
    ctx.lineTo(12, 62 - 25);
    ctx.lineTo(22, 62 - 25);
    ctx.lineTo(31, 62 - 16);
    ctx.lineTo(31, 16);
    ctx.lineTo(22, 25);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(24, 31, 18, 0.6, -0.6, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(20, 31, 32, 0.65, -0.65, true);
    ctx.stroke();
    this.#volumeFullIconImage = canvasDraw.toDataURL();

    // Volume off icon.
    canvasDraw = VideoControls.newCanvas(62, 62);
    ({ ctx } = canvasDraw);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(12, 25);
    ctx.lineTo(12, 62 - 25);
    ctx.lineTo(22, 62 - 25);
    ctx.lineTo(31, 62 - 16);
    ctx.lineTo(31, 16);
    ctx.lineTo(22, 25);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.moveTo(40, 25);
    ctx.lineTo(52, 37);
    ctx.moveTo(52, 25);
    ctx.lineTo(40, 37);
    ctx.stroke();
    this.#volumeOffIconImage = canvasDraw.toDataURL();

    // Fullscreen icon.
    canvasDraw = VideoControls.newCanvas(62, 62);
    ({ ctx } = canvasDraw);
    const m = 16;
    const s = 8;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.moveTo(0 + m + s, 0 + m);
    ctx.lineTo(0 + m, 0 + m);
    ctx.lineTo(0 + m, 0 + m + s);
    ctx.moveTo(62 - m - s, 0 + m);
    ctx.lineTo(62 - m, 0 + m);
    ctx.lineTo(62 - m, 0 + m + s);
    ctx.moveTo(0 + m + s, 62 - m);
    ctx.lineTo(0 + m, 62 - m);
    ctx.lineTo(0 + m, 62 - m - s);
    ctx.moveTo(62 - m - s, 62 - m);
    ctx.lineTo(62 - m, 62 - m);
    ctx.lineTo(62 - m, 62 - m - s);
    ctx.stroke();
    this.#fullscreenIconImage = canvasDraw.toDataURL();

    return Result.OK;
  }

  /**
   * Clear memory and close.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @public
   */
  _close() {
    if (!this.#enabled) return Result.FAIL;

    if (this.#config.playButton) {
      this.#playIcon.remove();
    }

    if (this.#config.seekButton) {
      this.#rewindIcon.remove();
      this.#forwardIcon.remove();
    }

    if (this.#config.volumeButton) {
      this.#volumeIcon.remove();
    }

    if (this.#config.toggleButton) {
      this.#lcevcToggle._close();
    }

    if (this.#config.fullscreenButton) {
      this.#fullscreenIcon.remove();
    }

    // Remove events.
    const canvas = this.#canvasControls;
    canvas.removeEventListener('mousemove', this.#mouseHandle);
    canvas.removeEventListener('mousedown', this.#mouseHandle);
    canvas.removeEventListener('mouseout', this.#mouseHandle);
    canvas.removeEventListener('touchstart', this.#mouseHandle);
    canvas.removeEventListener('touchend', this.#mouseHandle);
    canvas.parentElement.removeChild(canvas);

    window.removeEventListener('resize', this.#resizeEventHandle);

    // Remove canvas.
    this.#canvasControls = null;
    this.#liveIcon = null;

    _deleteShader(this.#gl, this.#shaderControls);
    this.#gl.deleteBuffer(this.#shaderControls.buffers.pos);
    this.#gl.deleteBuffer(this.#shaderControls.buffers.uv);
    this.#gl.deleteBuffer(this.#shaderControls.buffers.state);
    _deleteShader(this.#gl, this.#shaderScrub);
    _deleteTexture(this.#gl, this.#textureIcons);
    this.#shaderControls = null;
    this.#shaderScrub = null;
    this.#textureIcons = null;
    this.#bufferedRange._close(this.#gl);
    this.#playedRange._close(this.#gl);
    this.#unplayedRange._close(this.#gl);
    this.#bufferedRange = null;
    this.#playedRange = null;
    this.#unplayedRange = null;
    this.#gl = null;

    // Misc.
    this.#mouseHandle = null;
    this.#resizeEventHandle = null;

    return Result.OK;
  }

  /**
   * Play button callback.
   *
   * @memberof VideoControls
   * @private
   */
  #onPlay() {
    const { video } = this.#lcevcDec;
    if (video.paused) {
      video.play();
      this.#playIcon.src = this.#pauseIconImage;
    } else {
      video.pause();
      this.#playIcon.src = this.#playIconImage;
    }
  }

  /**
   * Rewind button callback.
   *
   * @memberof VideoControls
   * @private
   */
  #onRewind() {
    this.#lcevcDec.video.currentTime -= 10;
  }

  /**
   * Forward button callback.
   *
   * @memberof VideoControls
   * @private
   */
  #onForward() {
    this.#lcevcDec.video.currentTime += 10;
  }

  /**
   * Volume button callback.
   *
   * @memberof VideoControls
   * @private
   */
  #onVolume() {
    const { video } = this.#lcevcDec;
    video.muted = !video.muted;
    if (video.muted) {
      this.#volumeIcon.src = this.#volumeOffIconImage;
    } else {
      this.#volumeIcon.src = this.#volumeFullIconImage;
    }
  }

  // #region Events

  /**
   * Mouse handler callback.
   *
   * Handle the mouse events when interacting with the timebar canvas.
   *
   * Updates the mouse coordinates and handles the mouse events when clicking.
   * If the timebar is clicked it moves the video to the time where it was
   * click.
   *
   * @param {MouseEvent} e Mouse event.
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #onMouseHandle(e) {
    let mouseDown = false;

    switch (e.type) {
      case 'mousemove':
        this.#mouseX = e.offsetX;
        this.#mouseY = e.offsetY;
        break;
      case 'mousedown':
        this.#mouseX = e.offsetX;
        this.#mouseY = e.offsetY;
        mouseDown = true;
        break;
      case 'mouseout':
      case 'touchend':
        this.#mouseX = -1;
        this.#mouseY = -1;
        break;
      case 'touchstart':
        this.#mouseX = e.touches[0].offsetX;
        this.#mouseY = e.touches[0].offsetY;
        mouseDown = true;
        break;
      default:
        break;
    }

    // Handle clicks.
    if (mouseDown) {
      const { video } = this.#lcevcDec;
      if (!this.#isLive) {
        // Check scrub bar.
        const sx0 = 0;
        const sx1 = this.#canvasControls.width;
        if (this.#mouseX > sx0 && this.#mouseX < sx1) {
          const margin = 0.25 * ICON_SIZE_SCALED;
          const mf = (this.#mouseX - sx0 - margin) / (sx1 - sx0 - margin - margin);
          const t = Math.min(Math.max(mf, 0), 1)
              * (this.#scrubTime1 - this.#scrubTime0)
              + this.#scrubTime0;
          video.currentTime = t;
        }
      } else {
        video.currentTime -= 10;
      }
    }

    this.#render();

    return Result.OK;
  }

  /**
   * Resize event callback.
   *
   * Updates the video controls to match the new size.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #onResizeEventHandle() {
    this._update();

    return Result.OK;
  }
  // #endregion

  // #region Update main loop.

  /**
   * Updates the video controls.
   *
   * - Updates the position and size of the player.
   * - Updates the WebGL buffers of the icons.
   * - Updates the timebar.
   * - Render the WebGL related elements.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @public
   */
  _update() {
    if (!this.#enabled) return Result.FAIL;

    this.#updatePosition();

    this.#updateIcons();
    this.#updateScrubRegions();

    this.#render();

    return Result.OK;
  }

  /**
   * Refresh the icons.
   *
   * Change the play/pause icons depending the status of the video.
   *
   * @param {!boolean} playing `true` if video is playing and `false` if paused.
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @public
   */
  _refreshIcons(playing) {
    if (!this.#enabled) {
      return Result.OK;
    }

    this.#playIcon.src = playing ? this.#pauseIconImage : this.#playIconImage;

    return Result.OK;
  }

  /**
   * Check if the stream is a live one.
   *
   * If the given time is greater than 1, then the video is a live one.
   * This can be a false positive if a live stream current time is less than 1
   * when this is call.
   *
   * @param {!number} currentTime The current time of the video.
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @public
   */
  _checkIsLive(currentTime) {
    this.#isLive = currentTime > 1;
    return Result.OK;
  }

  /**
   * Return the status of the Lcevc toggle button.
   *
   * @returns {boolean} `true` if LCEVC is set to be enable, otherwise `false`.
   * @memberof VideoControls
   * @readonly
   * @public
   */
  get _isLcevcToggleEnable() {
    return this.#lcevcToggle._isEnable;
  }

  /**
   * Update the position on screen, and size of the scrub bar and icons.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #updatePosition() {
    // Size.
    let toggleSize = 0;
    if (this.#config.toggleButton) {
      toggleSize = this.#lcevcToggle._offsetSize;
    }
    const iconSize = this.#playIcon.offsetWidth * this.#numIcons + toggleSize;
    const pixelWidth = this.#controlsDiv.offsetWidth - iconSize;
    const pixelHeight = ICON_SIZE_SCALED;

    this.#canvasControls.width = pixelWidth;
    this.#canvasControls.height = pixelHeight;
    this.#canvasControls.style.width = `${pixelWidth}px`;
    this.#gl.viewport(0, 0, this.#canvasControls.width, this.#canvasControls.height);

    return Result.OK;
  }

  /**
   * Update icon state.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #updateIcons() {
    const shader = this.#shaderControls;

    this.#mouseIconIndex = -1;

    // live
    if (this.#isLive) {
      this.#setIcon(0, 0, 0, 0, 3);
    }

    // Upload buffers

    // Position.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.pos);
    this.#gl.vertexAttribPointer(shader.attributes.aPos, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aPos);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, shader.buffers.posArray, this.#gl.STATIC_DRAW);

    // UV.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.uv);
    this.#gl.vertexAttribPointer(shader.attributes.aUV, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aUV);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, shader.buffers.uvArray, this.#gl.STATIC_DRAW);

    // State.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.state);
    this.#gl.vertexAttribPointer(shader.attributes.aState, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aState);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, shader.buffers.stateArray, this.#gl.STATIC_DRAW);

    return Result.OK;
  }

  /**
   * Update chunks for scrub bar.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #updateScrubRegions() {
    const { video } = this.#lcevcDec;

    // Cursor.
    this.#scrubTimeCursor = video.currentTime;

    // Ranges.
    this.#playedRange._updateFrom(video.currentTime);
    this.#bufferedRange._update(video.buffered);
    this.#unplayedRange._updateFrom(video.duration);

    // Time limits.
    const tmin = Math.min(
      this.#playedRange.time0,
      this.#unplayedRange.time0
    );
    const tmax = Math.max(
      this.#playedRange.time1,
      this.#unplayedRange.time1
    );

    // Store ranges min and max.
    this.#scrubTimeMin = tmin;
    this.#scrubTimeMax = tmax;

    // Use differently if live.
    if (this.#isLive) {
      this.#scrubTime0 = 0;
      this.#scrubTime1 = 0;
    } else {
      this.#scrubTime0 = 0;
      this.#scrubTime1 = video.duration || 1;
    }

    // Keep cursor in range.
    this.#scrubTime0 = Math.min(this.#scrubTime0, this.#scrubTimeCursor);
    this.#scrubTime1 = Math.max(this.#scrubTime1, this.#scrubTimeCursor);

    return Result.OK;
  }
  // #endregion

  /**
   * Render the WebGL related controls.
   *
   * The timebar and live icon are rendered using WebGL.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #render() {
    let shader;
    let uniforms;

    this.#gl.clearColor(0, 0, 0, 1.0);
    // eslint-disable-next-line
    this.#gl.clear(this.#gl.DEPTH_BUFFER_BIT | this.#gl.COLOR_BUFFER_BIT);

    // Set blending mode.
    this.#gl.enable(this.#gl.BLEND);
    this.#gl.blendFuncSeparate(
      this.#gl.SRC_ALPHA, this.#gl.ONE_MINUS_SRC_ALPHA, this.#gl.ONE, this.#gl.ONE_MINUS_SRC_ALPHA
    );

    // Run shader.
    shader = this.#shaderControls;
    ({ uniforms } = shader);

    this.#gl.useProgram(shader.program);
    this.#gl.viewport(0, 0, this.#canvasControls.width, this.#canvasControls.height);

    // Bind icons texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#textureIcons);
    this.#gl.uniform1i(uniforms.textureIcons, 0);

    // Size dimension.
    this.#gl.uniform2f(
      uniforms.canvasSize, this.#canvasControls.width, this.#canvasControls.height
    );

    // Enable vert attributes.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.pos);
    this.#gl.vertexAttribPointer(shader.attributes.aPos, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aPos);
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.uv);
    this.#gl.vertexAttribPointer(shader.attributes.aUV, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aUV);
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.state);
    this.#gl.vertexAttribPointer(shader.attributes.aState, 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes.aState);

    // Run
    const iconCount = this.#isLive ? 1 : 0;
    this.#gl.drawArrays(this.#gl.TRIANGLES, 0, iconCount * 6);

    // Run shader
    if (!this.#isLive) {
      shader = this.#shaderScrub;
      ({ uniforms } = shader);

      this.#gl.useProgram(shader.program);
      this.#gl.viewport(0, 0, this.#canvasControls.width, this.#canvasControls.height);

      // Size dimension.
      const margin = (0.25 * ICON_SIZE_SCALED);
      const scrubOffset = margin / 2;
      const scrubAreaX0 = margin;
      const scrubAreaY0 = margin + scrubOffset;
      const scrubAreaX1 = this.#canvasControls.width - margin;
      const scrubAreaY1 = (ICON_SIZE_SCALED - margin) - scrubOffset;

      this.#gl.uniform2f(
        uniforms.canvasSize, this.#canvasControls.width, this.#canvasControls.height
      );
      this.#gl.uniform4f(uniforms.scrubArea, scrubAreaX0, scrubAreaY0, scrubAreaX1, scrubAreaY1);
      this.#gl.uniform2f(uniforms.timeRange, this.#scrubTime0, this.#scrubTime1);

      // Loop through timeranges.
      const ranges = [
        this.#unplayedRange,
        this.#bufferedRange,
        this.#playedRange
      ];
      ranges.forEach((data) => {
        if (data.regionCount > 0) {
          // Uniforms.
          this.#gl.uniform1f(uniforms.color, data.color);

          // Set vertex buffers.
          data._bindBuffer(this.#gl, shader.attributes.aChunks);

          // Run.
          this.#gl.drawArrays(this.#gl.TRIANGLES, 0, data.regionCount * 6);
        }
      });

      // Cursor
      // Size dimension.
      const cursorMargin = 0.25 * ICON_SIZE_SCALED;
      const cursorAreaX0 = cursorMargin;
      const cursorAreaY0 = cursorMargin;
      const cursorAreaX1 = this.#canvasControls.width - cursorMargin;
      const cursorAreaY1 = ICON_SIZE_SCALED - cursorMargin;
      const tx = (this.#scrubTimeCursor - this.#scrubTime0) / (this.#scrubTime1 - this.#scrubTime0);
      const px = Math.min(Math.max(tx, 0), 1) * (cursorAreaX1 - cursorAreaX0) + cursorAreaX0;

      this.#gl.enable(this.#gl.SCISSOR_TEST);
      this.#gl.scissor(px - 1, cursorAreaY0, 2, (cursorAreaY1 - cursorAreaY0));
      this.#gl.clearColor(1, 1, 1, 1);
      this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);
      this.#gl.disable(this.#gl.SCISSOR_TEST);
    }

    // Unset GL state.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.disable(this.#gl.BLEND);

    return Result.OK;
  }

  // #region Functions.

  /**
   * Creates a HTMLCanvasElement.
   *
   * @param {!number} width The width of the canvas.
   * @param {!number} height The height of the canvas.
   * @returns {HTMLCanvasElement} The canvas element.
   * @memberof VideoControls
   * @private
   */
  static newCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Set a WebGL buffer icon of the icon sprite.
   *
   * @param {!number} iconIndex The icon index.
   * @param {!number} spriteIndex The sprite index.
   * @param {!number} x The X offset position.
   * @param {!number} y The Y offset position.
   * @param {!number} width The width of the icon.
   * @returns {0 | 1}
   * @memberof VideoControls
   * @private
   */
  #setIcon(iconIndex, spriteIndex, x, y, width) {
    const shader = this.#shaderControls;

    const arrPos = shader.buffers.posArray;
    const arrUV = shader.buffers.uvArray;
    const arrState = shader.buffers.stateArray;

    const i = iconIndex * 6;
    const p = i * 2;
    const u = i * 2;
    const s = i * 2;

    const size = ICON_SIZE_SCALED;
    const x0 = x;
    const x1 = x + (size * width) - 1;
    const y0 = y;
    const y1 = y + size - 1;

    arrPos[p + 0] = x0;
    arrPos[p + 1] = y0;
    arrPos[p + 2] = x1;
    arrPos[p + 3] = y0;
    arrPos[p + 4] = x0;
    arrPos[p + 5] = y1;
    arrPos[p + 6] = x1;
    arrPos[p + 7] = y1;
    arrPos[p + 8] = x0;
    arrPos[p + 9] = y1;
    arrPos[p + 10] = x1;
    arrPos[p + 11] = y0;

    const u0 = (spriteIndex * size) / this.#liveIcon.width;
    const u1 = u0 + (size * width - 1) / this.#liveIcon.width;
    const v0 = 0;
    const v1 = v0 + (size - 1) / this.#liveIcon.height;

    arrUV[u + 0] = u0;
    arrUV[u + 1] = v0;
    arrUV[u + 2] = u1;
    arrUV[u + 3] = v0;
    arrUV[u + 4] = u0;
    arrUV[u + 5] = v1;
    arrUV[u + 6] = u1;
    arrUV[u + 7] = v1;
    arrUV[u + 8] = u0;
    arrUV[u + 9] = v1;
    arrUV[u + 10] = u1;
    arrUV[u + 11] = v0;

    // Mouse inside rectangle.
    const mouseInside = this.#mouseX >= x0
      && this.#mouseX <= x1
      && this.#mouseY >= y0
      && this.#mouseY <= y1;
    if (mouseInside) this.#mouseIconIndex = iconIndex;
    const state = mouseInside ? 1 : 0;

    arrState[s + 0] = 0;
    arrState[s + 1] = state;
    arrState[s + 2] = 1;
    arrState[s + 3] = state;
    arrState[s + 4] = 2;
    arrState[s + 5] = state;
    arrState[s + 6] = 3;
    arrState[s + 7] = state;
    arrState[s + 8] = 2;
    arrState[s + 9] = state;
    arrState[s + 10] = 1;
    arrState[s + 11] = state;

    return state;
  }

  /**
   * Fullscren change callback.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #onFullscreenChangeEvent() {
    if (!this.#preventFullscreenChangeEvent) {
      const canvas = this.#canvasControls;
      const obj = this.#elemFullscreen || canvas.parentElement;
      this.#closeFullscreen(obj);
      const event = new Event('resize', {
        bubbles: true,
        cancelable: true
      });
      event.eventName = 'resize';
      window.dispatchEvent(event);
    } else {
      this.#preventFullscreenChangeEvent = false;
    }

    return Result.OK;
  }

  /**
   * Fullscreen toggle callback.
   *
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #fullscreenToggle() {
    const obj = this.#elemFullscreen || this.#canvasControls.parentElement;
    if (!this.#isFullscreen) {
      this.#openFullscreen(obj);
    } else {
      this.#closeFullscreen(obj);
    }

    return Result.OK;
  }

  /**
   * Fullscreen open callback.
   *
   * @param {HTMLElement} elem The HTMLElement that goes fullscreen.
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #openFullscreen(elem) {
    this.#isFullscreen = true;
    this.#preventFullscreenChangeEvent = true;

    this.#oldPadding = elem.style.padding;
    elem.style.padding = '0'; // eslint-disable-line

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      // Firefox.
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      // Chrome, Safari and Opera.
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      // IE/Edge.
      elem.msRequestFullscreen();
    }

    this.#lcevcDec.onFullscreen(true);

    return Result.OK;
  }

  /**
   * Fullscreen exit callback.
   *
   * @param {HTMLElement} elem The HTMLElement that exit fullscreen.
   * @returns {Result} The status code.
   * @memberof VideoControls
   * @private
   */
  #closeFullscreen(elem) {
    if (!this.#isFullscreen) {
      return Result.FAIL;
    }

    this.#preventFullscreenChangeEvent = true;

    elem.style.padding = `${this.#oldPadding}px`; // eslint-disable-line no-param-reassign

    try {
      // The fullscreen element check is due to an error that is thrown when we exitfullscreen
      // there is no element that is closed and error is shown
      if (document.exitFullscreen && document.fullscreenElement !== null) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        // Firefox.
      } else if (document.webkitExitFullscreen) {
        // Chrome, Safari and Opera.
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        // IE/Edge.
        document.msExitFullscreen();
      }
    } catch (err) {
      Log.info(err);
    }

    this.#isFullscreen = false;

    this.#lcevcDec.onFullscreen(false);

    return Result.OK;
  }
  // #endregion
}

export default VideoControls;
