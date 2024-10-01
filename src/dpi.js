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

import { Log } from './log.ts';
import ColorSpace from './colorspace/colorspace';

import { Result } from './globals/enums';
import { libDPI } from './globals/libdpi.ts';
import {
  _checkShaderPrecision,
  _createShader,
  _deleteShader,
  _deleteTexture,
  _useProgramAndLog
} from './graphics/webgl';
import {
  _createHeapData, _createDataPointer, _freeHeapData, _freeDataPointer
} from './helpers';
import { shaderNames } from './shaders/shaders_src';

/**
 * @typedef {import('./graphics/webgl').FBO} FBO
 * @typedef {import('./graphics/webgl').ShaderObj} ShaderObj
 */

/**
 * The DPI class holds all the decoder related stuff.
 *
 * Is in charge of initialise the WebGL, libDPI pointer, shaders and parsing
 * the LCEVC data for a frame.
 *
 * @class DPI
 */
class DPI {
  /** @private @type {LCEVCdec} */
  #lcevcDec = null;

  /** @private @type {ColorSpace} */
  #colorSpace = null;

  /** @private @type {number} */
  #lcevcAspectRatio = 0;

  /** @private @type {number} */
  #lcevcDecoderPointer = null;

  /** @private @type {number} */
  #internalLevel = 0;

  /** @private @type {boolean} */
  #lcevcParseInfo = null;

  /** @private @type {boolean} */
  #refreshDPI = false;

  /** @private @type {boolean} */
  #parseWrapping = false;

  /** @private @type {number} */
  #lcevcRefreshCounter = 0;

  #pssData = { pointer: _createDataPointer(libDPI, new Uint8Array(1)), size: 1 };

  #fullpssData = { pointer: _createDataPointer(libDPI, new Uint8Array(1)), size: 1 };

  /** @private @type{string} */
  #canvasStyleDisplay = null;

  /** @private @type {WebGLRenderingContext} */
  #gl = null;

  glOptions = {
    alpha: false,
    antialias: false,
    depth: false,
    desynchronized: true,
    failIfMajorPerformanceCaveat: false,
    lowLatency: true,
    powerPreference: 'default',
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false
  };

  /** @private @type {number} */
  #decoderResetSize = null;

  /** @private @type {boolean} */
  #decoderResetProgress = false;

  /** @private */
  #previousFrame = null;

  /** @private @type {boolean} */
  #waitUntilKeyFrameFound = false;

  /** @private @type {number} */
  #parseGapCount = 0;

  #gpuInfo = {
    vendor: 'unknown',
    renderer: 'unknown'
  };

  /** @private @type {WebGLShader} */
  #shaderDebug = null;

  /** @private @type {WebGLShader} */
  #shaderVideoSimple = null;

  /** @private @type {WebGLShader} */
  #shaderVideo1DRGBtoYUV = null;

  /** @private @type {WebGLShader} */
  #shaderVideo1DRGBtoYUVPerseus = null;

  /** @private @type {WebGLShader} */
  #shaderVideo1D4KernelUpscaleX = null;

  /** @private @type {WebGLShader} */
  #shaderVideo1DYUVtoRGBPerseus = null;

  /** @private @type {WebGLShader} */
  #shaderVideo1DYUVtoRGB = null;

  /** @private @type {WebGLShader} */
  #shaderVideoPacked4KernelRGBToY = null;

  /** @private @type {WebGLShader} */
  #shaderVideoPacked4KernelRGBToYPerseus = null;

  /** @private @type {WebGLShader} */
  #shaderVideoPacked4KernelRGBToU = null;

  /** @private @type {WebGLShader} */
  #shaderVideoPacked4KernelRGBToV = null;

  /** @private @type {WebGLShader} */
  #shaderVideoPacked4KernelUpscaleX = null;

  /** @private @type {WebGLShader} */
  #shaderVideoPacked4KernelUpscaleY = null;

  /** @private @type {WebGLShader} */
  #shaderVideoPacked4KernelUpscaleYPerseus = null;

  /** @private @type {WebGLShader} */
  #shaderVideoPacked4KernelYUVMerge = null;

  /** @private @type {WebGLShader} */
  #shaderVideoDisplay = null;

  #glNoiseTexture = null;

  /**
   * Kernel [0.0, 2048.0 / 16384.0, 16384.0 / 16384.0, -2048.0 / 16384.0]
   * Values are pre-computed to comply with SonarQube (no rounding is applied)
   *
   * @private @type {!number[]}
   */
  #shaderKernel0 = [0, 0.125, 1, -0.125];

  /**
   * Kernel [-2048.0 / 16384.0, 16384.0 / 16384.0, 2048.0 / 16384.0, 0.0]
   * Values are pre-computed to comply with SonarQube (no rounding is applied)
   *
   * @private @type {!number[]}
   */
  #shaderKernel1 = [-0.125, 1, 0.125, 0];

  /**
   * Creates an instance of DPI.
   *
   * @param {LCEVCdec} lcevcDec The LCEVCdec object.
   * @memberof DPI
   */
  constructor(lcevcDec) {
    this.#lcevcDec = lcevcDec;

    this.#colorSpace = new ColorSpace();
  }

  /**
   * Returns the WebGL context.
   *
   * @returns {WebGLRenderingContext} The WebGL context.
   * @readonly
   * @memberof DPI
   */
  get _gl() {
    return this.#gl;
  }

  /**
   * Returns the real aspect ratio of the video.
   *
   * @returns {number} The aspect ratio.
   * @memberof DPI
   * @public
   */
  get _lcevcAspectRatio() {
    return this.#lcevcAspectRatio;
  }

  /**
   * Set the aspect ratio.
   *
   * @param {number} value The aspect ratio.
   * @memberof DPI
   * @public
   */
  set _lcevcAspectRatio(value) {
    this.#lcevcAspectRatio = value;
  }

  /**
   * Returns the libDPI pointer.
   *
   * @returns {number} The libDPI pointer.
   * @readonly
   * @memberof DPI
   */
  get _lcevcDecoderPointer() {
    return this.#lcevcDecoderPointer;
  }

  /**
   * Get the color input profile.
   *
   * @readonly
   * @returns {string} The input profile.
   * @memberof DPI
   * @public
   */
  get _profileIn() {
    return this.#colorSpace._profileIn;
  }

  /**
   * Get the color output profile.
   *
   * @readonly
   * @returns {string} The output profile.
   * @memberof DPI
   * @public
   */
  get _profileOut() {
    return this.#colorSpace._profileOut;
  }

  /**
   * Set the color input profile.
   *
   * @param {!string} profileName The profile name.
   * @memberof DPI
   * @public
   */
  set _setProfileIn(profileName) {
    this.#colorSpace._setProfileIn(profileName);
  }

  /**
   * Set the color output profile.
   *
   * @param {!string} profileName The profile name.
   * @memberof DPI
   * @public
   */
  set _setProfileOut(profileName) {
    this.#colorSpace._setProfileOut(profileName);
  }

  /**
   * Returns interal data to be used by the Stats class.
   *
   * @readonly
   * @returns {Array} The data.
   * @memberof DPI
   * @public
   */
  get _parseStats() {
    // Get values to pass to stats, for reporting
    return [
      this.#parseGapCount,
      this.#waitUntilKeyFrameFound,
      this.#previousFrame
    ];
  }

  /**
   * Returns the DPI Status.
   *
   * @returns {boolean} DPI Status.
   * @readonly
   * @memberof DPI
   */
  get _getrefreshDpi() {
    return this.#refreshDPI;
  }

  // #region GL helpers
  /**
   * Set the default webGL context options, which may need to be configured
   * differently in different browsers.
   *
   * @param {object[]} options The key/value option.
   * @returns {Result}
   * @memberof DPI
   * @public
   */
  _setGLOptions(options) {
    // eslint-disable-next-line
    for (const [key, value] of Object.entries(options)) {
      this.glOptions[key] = value;
    }

    return Result.OK;
  }

  /**
   * Returns the shader used for rendering.
   *
   * @returns {WebGLShader} The shader object.
   * @readonly
   * @memberof DPI
   * @public
   */
  get _shaderVideoDisplay() {
    return this.#shaderVideoDisplay;
  }

  /**
   * Return the shader for the dithering.
   *
   * @returns {WebGLShader} The shader.
   * @readonly
   * @memberof DPI
   * @public
   */
  get _glNoiseTexture() {
    return this.#glNoiseTexture;
  }

  /**
   * Set shaderKernel0 used for upscaling
   *
   * @param {Array} kernel The kernel.
   * @memberof DPI
   * @public
   */
  set shaderKernel0(kernel) {
    this.#shaderKernel0 = kernel;
  }

  /**
   * Set shaderKernel1 used for upscaling
   *
   * @param {Array} kernel The kernel.
   * @memberof DPI
   * @public
   */
  set shaderKernel1(kernel) {
    this.#shaderKernel1 = kernel;
  }

  /**
   * Compiles all the shaders.
   *
   * @returns {Result} The status code.
   * @memberof DPI
   * @private
   */
  #compileShaders() {
    _checkShaderPrecision(this.#gl);

    // Debug.
    _deleteShader(this.#gl, this.#shaderDebug);
    this.#shaderDebug = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.debug_residuals,
      ['position', 'texcoord'],
      [
        'textureVideo',
        'textureResidualBase',
        'textureResidualHigh',
        'videoSize',
        'useBase',
        'useHigh',
        'isKeyFrame'
      ]
    );

    // Performance Scaling.
    _deleteShader(this.#gl, this.#shaderVideoSimple);
    this.#shaderVideoSimple = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_simple,
      ['position', 'texcoord'],
      [
        'textureVideo',
        'videoSize'
      ]
    );

    // #region 1D
    _deleteShader(this.#gl, this.#shaderVideo1DRGBtoYUV);
    this.#shaderVideo1DRGBtoYUV = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_1d_rgb_to_yuv,
      ['position', 'texcoord'],
      [
        'textureVideo',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideo1DRGBtoYUVPerseus);
    this.#shaderVideo1DRGBtoYUVPerseus = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_1d_rgb_to_yuv_perseus,
      ['position', 'texcoord'],
      [
        'textureVideo',
        'textureResidual',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideo1D4KernelUpscaleX);
    this.#shaderVideo1D4KernelUpscaleX = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_1d_4kernel_upscale_x,
      ['position', 'texcoord'],
      [
        'textureIn',
        'videoSize',
        'k0',
        'k1'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideo1DYUVtoRGBPerseus);
    this.#shaderVideo1DYUVtoRGBPerseus = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_1d_yuv_to_rgb_perseus,
      ['position', 'texcoord'],
      [
        'textureIn',
        'textureResidual',
        'videoSize',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideo1DYUVtoRGB);
    this.#shaderVideo1DYUVtoRGB = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_1d_yuv_to_rgb,
      ['position', 'texcoord'],
      [
        'textureIn',
        'videoSize',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );
    // #endregion

    // #region Uber4
    _deleteShader(this.#gl, this.#shaderVideoPacked4KernelRGBToY);
    this.#shaderVideoPacked4KernelRGBToY = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_packed_4kernel_rgb_to_y,
      ['position', 'texcoord'],
      [
        'textureVideo',
        'videoSize',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideoPacked4KernelRGBToYPerseus);
    this.#shaderVideoPacked4KernelRGBToYPerseus = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_packed_4kernel_rgb_to_y_perseus,
      ['position', 'texcoord'],
      [
        'textureVideo',
        'textureResidual',
        'videoSize',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideoPacked4KernelRGBToU);
    this.#shaderVideoPacked4KernelRGBToU = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_packed_4kernel_rgb_to_u,
      ['position', 'texcoord'],
      [
        'textureVideo',
        'videoSize',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideoPacked4KernelRGBToV);
    this.#shaderVideoPacked4KernelRGBToV = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_packed_4kernel_rgb_to_v,
      ['position', 'texcoord'],
      [
        'textureVideo',
        'videoSize',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideoPacked4KernelUpscaleX);
    this.#shaderVideoPacked4KernelUpscaleX = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_packed_4kernel_upscale_x,
      ['position', 'texcoord'],
      [
        'textureIn',
        'videoSize',
        'k0',
        'k1'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideoPacked4KernelUpscaleY);
    this.#shaderVideoPacked4KernelUpscaleY = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_packed_4kernel_upscale_y,
      ['position', 'texcoord'],
      [
        'textureIn',
        'videoSize',
        'k0',
        'k1'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideoPacked4KernelUpscaleYPerseus);
    this.#shaderVideoPacked4KernelUpscaleYPerseus = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_packed_4kernel_upscale_y_perseus,
      ['position', 'texcoord'],
      [
        'textureIn',
        'textureResidual',
        'videoSize',
        'k0',
        'k1'
      ]
    );

    _deleteShader(this.#gl, this.#shaderVideoPacked4KernelYUVMerge);
    this.#shaderVideoPacked4KernelYUVMerge = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_packed_4kernel_yuv_merge,
      ['position', 'texcoord'],
      [
        'textureY',
        'textureU',
        'textureV',
        'videoSize',
        'colorSpace_RGBYUV',
        'colorSpace_YUVRGB'
      ]
    );
    // #endregion

    // Display Frame to Screen
    _deleteShader(this.#gl, this.#shaderVideoDisplay);
    this.#shaderVideoDisplay = _createShader(
      this.#gl,
      shaderNames.vert,
      shaderNames.video_display,
      ['position', 'texcoord'],
      [
        'textureFrame',
        'textureNoise',
        'frameSize',
        'outputSize',
        'dithering'
      ]
    );

    this.#createNoiseTexture();

    return Result.OK;
  }
  // #endregion

  /**
   * Initialised this instance of a lcevc decoder ready for decoding. Requires
   * inputCanvas and outputCanvas which will be used for reading image data and
   * returning the frame with lcevc data applied.
   *
   * @param {!HTMLMediaElement | !HTMLCanvasElement} inputCanvas Canvas
   *  containing the frame of video data that the decoder will read from.
   * @param {!HTMLCanvasElement} outputCanvas Output canvas which will be drawn
   *  to by the lcevc decoder.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _openLcevcDecoder(inputCanvas, outputCanvas) {
    // Store original video canvas style.
    this.#canvasStyleDisplay = getComputedStyle(inputCanvas).display;
    if (this.#canvasStyleDisplay === 'none') {
      this.#canvasStyleDisplay = 'block';
    }

    // Try to setup the GL context.
    this.#gl = outputCanvas.getContext('webgl', this.glOptions)
      || outputCanvas.getContext('experimental-webgl', this.glOptions);

    const debugInfo = this.#gl.getExtension('WEBGL_debug_renderer_info');
    this.#gpuInfo.vendor = this.#gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    this.#gpuInfo.renderer = this.#gl.getParameter(
      debugInfo.UNMASKED_RENDERER_WEBGL
    );

    Log.info(`GPU Info\n\tVendor:\t\t${this.#gpuInfo.vendor}
    \n\tRenderer:\t${this.#gpuInfo.renderer}`);

    if (!this.#gl) {
      Log.error('WebGL is not supported in your browser');
      return Result.FAIL;
    }

    this.#compileShaders();

    return Result.OK;
  }

  /**
   * Enable standard quad buffers for drawing full viewport rectangle with UV.
   *
   * @param {!ShaderObj} shader The shader.
   * @param {!number} attrpos The attribute position.
   * @param {!number} x0 The first position at the X axis.
   * @param {!number} x1 The second position at the X axis.
   * @param {!number} y0 The first position at the Y axis.
   * @param {!number} y1 The second position at the Y axis.
   * @param {!number} attruv The attributes UV.
   * @param {!number} u0 The first position of the U.
   * @param {!number} u1 The second position of the U.
   * @param {!number} v0 The first position of the V.
   * @param {!number} v1 The second position of the V.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _setQuads(shader, attrpos, x0, x1, y0, y1, attruv, u0, u1, v0, v1) {
    if (!shader.attributes) {
      shader.attributes = {}; // eslint-disable-line no-param-reassign
      // eslint-disable-next-line no-param-reassign
      shader.attributes[attruv] = this.#gl.getAttribLocation(shader.program, attruv);
      // eslint-disable-next-line no-param-reassign
      shader.attributes[attrpos] = this.#gl.getAttribLocation(shader.program, attrpos);
    }

    if (!shader.buffers) {
      shader.buffers = {}; // eslint-disable-line no-param-reassign
      shader.buffers.pos = this.#gl.createBuffer(); // eslint-disable-line no-param-reassign
      shader.buffers.posArray = new Float32Array(8); // eslint-disable-line no-param-reassign
      shader.buffers.uv = this.#gl.createBuffer(); // eslint-disable-line no-param-reassign
      shader.buffers.uvArray = new Float32Array(8); // eslint-disable-line no-param-reassign
    }

    // Send coordinates.
    let arr;
    arr = shader.buffers.posArray;
    arr[0] = x0;
    arr[1] = y0;
    arr[2] = x1;
    arr[3] = y0;
    arr[4] = x0;
    arr[5] = y1;
    arr[6] = x1;
    arr[7] = y1;
    arr = shader.buffers.uvArray;
    arr[0] = u0;
    arr[1] = v0;
    arr[2] = u1;
    arr[3] = v0;
    arr[4] = u0;
    arr[5] = v1;
    arr[6] = u1;
    arr[7] = v1;

    // Position.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.pos);
    this.#gl.vertexAttribPointer(shader.attributes[attrpos], 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes[attrpos]);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, shader.buffers.posArray, this.#gl.STATIC_DRAW);

    // UV.
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, shader.buffers.uv);
    this.#gl.vertexAttribPointer(shader.attributes[attruv], 2, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(shader.attributes[attruv]);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, shader.buffers.uvArray, this.#gl.STATIC_DRAW);

    return Result.OK;
  }

  /**
   * Close the lcevc decoder.
   *
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _close() {
    _deleteTexture(this.#gl, this.#glNoiseTexture);

    // Clear the canvas.
    this.#gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);

    libDPI._perseus_end_tracing(); // eslint-disable-line

    _freeHeapData(libDPI, this.#lcevcParseInfo);

    // eslint-disable-next-line
    const res = libDPI._perseus_decoder_close(this.#lcevcDecoderPointer);

    return res === 0 ? Result.OK : Result.FAIL;
  }

  /**
   * Reset the DPI members.
   *
   * Close and open the libDPI.
   * Creates a new parse info at the heap of libDPI.
   * Parse a the nearest keyframe at the given timestamp.
   *
   * @param {ResidualStore} residualStore The ResidualStore object.
   * @param {!number} timestamp The timestamps.
   * @param {!number} profileSwitch The timestamps.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _reset(residualStore, timestamp, profileSwitch) {
    Log.msg('reset');
    this.#decoderResetProgress = true;
    libDPI._perseus_decoder_close(this.#lcevcDecoderPointer);
    this.#lcevcDecoderPointer = libDPI._perseus_decoder_open_wrapper(1);
    this.#lcevcParseInfo = _createHeapData(libDPI, new Int32Array(5));
    libDPI._perseus_start_tracing();

    if (profileSwitch !== 1) {
      // Get nearest config frame containing global lcevc data.
      this.#decoderResetSize = null;

      let parsedLcevc = null;
      const keyframetime = residualStore._getKeyframe(timestamp, 5);
      if (keyframetime !== null) {
        parsedLcevc = this._parseLcevcDataContinuous(residualStore, keyframetime, 0);
      }

      if (!parsedLcevc) {
        Log.warn(`Failed to load and parse lcevc data for timestamp: ${timestamp}`);
        if (libDPI && this.#pssData.pointer) {
          this.#freePssData();
        }
        this.#decoderResetProgress = false;
        return Result.FAIL;
      }

      // Store info of most recent reset.
      this.#decoderResetSize = libDPI._perseus_decoder_get_surface_size(
        this.#lcevcDecoderPointer,
        0
      );
    }

    this.#decoderResetProgress = false;
    return Result.OK;
  }

  /**
   * Clear the allocated data of the LCEVC from the libDPI.
   *
   * @returns {Result} The status code.
   * @memberof DPI
   * @private
   */
  #freePssData() {
    return _freeDataPointer(libDPI, this.#pssData.pointer);
  }

  // #region lcevc data parsing.
  /**
   * This section deals with parsing the lcevc data and fetching it from the
   * residual store.
   *
   * There are two ways in which this data is used:
   *  - As a continuous stream during playback, in which case gaps need to be
   *    covered so that lcevc has an unbroken chain for the temporal data to
   *    work correctly.
   *  - From a keyframe. where the temporal buffer is first cleared and then all
   *    frames are used since the last keyframe, to build up residuals for a
   *    paused frame of video.
   */

  /**
   * @typedef {object} ParsedData
   * @property {number} flags
   * @property {object} lcevc
   * @property {object} group
   */
  /**
   * Parse the lcevc data at a certain timestamp, maintaining an unbroken chain
   * for the temporal buffer.
   *
   * @param {!ResidualStore} residualStore The ResidualStore object.
   * @param {!number} timestampIn The timestamp.
   * @param {!number} gap The time gap.
   * @returns {ParsedData} The LCEVC parsed data.
   * @memberof DPI
   * @public
   */
  _parseLcevcDataContinuous(residualStore, timestampIn, gap) {
    // EMScripten memory pointer.
    const emPointer = this.#lcevcDecoderPointer;
    let timestamp = timestampIn;
    if (this.#lcevcDec.containerFormat === 2) {
      timestamp += 0.01;
    }
    // Get current group containing lcevc data.
    const group = residualStore._getGroup(timestamp);
    // adding rounding to avoid the additional last decimal that gets
    // appended to the timestamps which causes the decoder to ignore that frame
    // Converting time from nano seconds to microseconds to offset the errors
    // from timestamp that does not have precision for nano seconds
    if (!group || DPI.round(timestamp) < DPI.round(group.startTime)
      || DPI.round(timestamp) > DPI.round(group.endTime)) {
      // This condition was causing fmp4s to stutter while decoding lcevc data so additional
      // offset for 0.00000000000001 for the group end to avoid the discard of lcevc data
      Log.debug(`Frame not found at this timestamp ${DPI.round(timestamp)}`);
      return null;
    }

    // Prevent double parsing of same frame.
    const prev = this.#previousFrame;

    // Recover frame gaps that were missed since last parse.
    this.#parseGapCount = 0;
    const parseLog = [];
    let groups = [];
    let gapFound = -1;
    let keyFrameFound = false;
    if (gap > 0) {
      // Loop through history of frames to find gap size.
      groups = residualStore._getPreviousGroups(group, gap);
      if (groups.length > 0) {
        // If the furthest group is not far enough back to cover the gap,
        // clear the residuals and wait for the next keyframe
        const lastIndex = groups[groups.length - 1].index;
        if (lastIndex > prev) {
          libDPI._perseus_decoder_clear_temporal(emPointer, 0);
          this.#previousFrame = group.index;
          this.#waitUntilKeyFrameFound = true;
          this.#parseGapCount = gap;
          return null;
        }

        // Get the frame that the gap started from
        for (let i = 1; i < groups.length; i += 1) {
          if (groups[i].index === prev) {
            gapFound = i - 1;
            break;
          }
        }

        this.#parseGapCount = gapFound + 1;

        // Parse gap groups one at a time until we are at the present.
        for (let i = gapFound; i >= 0; i -= 1) {
          if (groups[i].level === -1 || groups[i].level === this.#lcevcDec.currentLevel) {
            if (groups[i].keyframe) keyFrameFound = true;
            if (this.#waitUntilKeyFrameFound === false || keyFrameFound) {
              this._parseLcevcDataItem(groups[i].pssData);
              parseLog.push(groups[i]);
            }
          }
        }
      }
    }

    let result = null;
    if (group.level === -1 || group.level === this.#lcevcDec.currentLevel) {
      if (group.keyframe) keyFrameFound = true;
      if (this.#waitUntilKeyFrameFound === false || keyFrameFound) {
        result = this._parseLcevcDataItem(group.pssData);
        parseLog.push(group);
      } else {
        // Still waiting for keyframe to be found before using lcevc
        return null;
      }
    } else {
      return null;
    }
    this.#previousFrame = group.index;
    this.#waitUntilKeyFrameFound = false;

    // Check error flags.
    if (emPointer && result && result.flags.parse !== 0) {
      const error = libDPI._perseus_decoder_get_last_error_wrapper(emPointer);
      Log.error(`Module decoder failed. Error #${error}`);
      switch (error) {
        case 3: // Generic stream error.
          if (!group.keyframe) {
            // Possibly there is a global config block missing,
            // and we need to go back to the previous keyframe
            // to parse one and restore the value.
            this._reset(residualStore, timestamp, 0);
          }
          break;
        default:
          break;
      }

      // Fail.
      return null;
    }

    // Check integrity.
    if (result.lcevc.width === 0 || result.lcevc.height === 0) {
      // fail
      Log.error('parsed lcevc data failed integrity check.');
      return null;
    }

    return {
      flags: result.flags,
      lcevc: result.lcevc,
      parseLog,
      group
    };
  }

  /**
   * Parse the nearest key frame at a certain timestamp and segment range.
   *
   * This is helpful when losing LCEVC data and we need to find a LCEVC config
   * frame.
   *
   * @param {!ResidualStore} residualStore The ResidualStore object.
   * @param {!number} timestampIn The timestamp.
   * @param {!number} segmentRange The segment range.
   * @param {?boolean} [force=false] `true` to get the first one that is found.
   * @returns {ParsedData} The LCEVC parsed data.
   * @memberof DPI
   * @public
   */
  _parseLcevcDataFromKeyframe(residualStore, timestampIn, segmentRange, force = false) {
    // Emscripten memory pointer.
    const emPointer = this.#lcevcDecoderPointer;
    let timestamp = timestampIn;
    if (this.#lcevcDec.containerFormat === 2) {
      timestamp += 0.01;
    }

    // Get current group containing lcevc data.
    const group = residualStore._getGroup(timestamp);
    // adding rounding to avoid the additional last decimal that gets
    // appended to the timestamps which causes the decoder to ignore that frame
    // Converting time from nano seconds to microseconds to offset the errors
    // from timestamp that does not have precision for nano seconds
    if (!group || DPI.round(timestamp) < DPI.round(group.startTime)
      || DPI.round(timestamp) > DPI.round(group.endTime)) {
      Log.debug(`Frame not found at this timestamp ${timestamp}`);
      return null;
    }

    // Reset continous tracker.
    this.#previousFrame = group.index;
    this.#waitUntilKeyFrameFound = false;

    // Clear temporal first.
    libDPI._perseus_decoder_clear_temporal(emPointer, 0); // eslint-disable-line

    // Recent key frame.
    const keyframetime = residualStore._getKeyframe(timestamp, segmentRange);
    if (keyframetime === null) {
      return null;
    }

    // Move forwards from keyframe until we reach current frame.
    const parseLog = [];
    const isKey = true;
    let result = null;
    let groupNext = residualStore._getGroup(keyframetime, isKey);
    if (groupNext !== null) {
      do {
        if (groupNext.level === -1 || groupNext.level === this.#lcevcDec.currentLevel || force) {
          result = this._parseLcevcDataItem(groupNext.pssData);

          // Account for WebM contents not having accurate keyframes. It seems that not every
          // IDR segment (keyframe) results in a successful parse, as such, we iterate backwards
          // through available keyframes until one of them returns a succesful result. This issue
          // occurs on profile switch, when we attempt to parse from keyframe for a new profile.
          if (result.flags.parse !== 0) {
            let groupPrev = groupNext;
            while (result.flags.parse !== 0 && groupPrev) {
              groupPrev = residualStore._getPreviousGroups(groupPrev, 1)[0];
              if (!groupPrev) break;
              result = this._parseLcevcDataItem(groupPrev.pssData);
            }
            groupNext = groupPrev;
          }
          parseLog.push(groupNext);

          if (result.flags.parse !== 0) break;
        }
        groupNext = residualStore._getNextGroup(groupNext);
      } while (groupNext !== null && groupNext.startTime <= group.startTime);
    }

    if (!result) {
      Log.error('could not find route from keyframe back to current frame.');
      // This check is to make sure that the if LCEVC is not decoding, LCEVC data that is level wise
      // is not missed due to the resolution being same.
      if (this.#refreshDPI) {
        this.#refreshDPI = false;
        libDPI._perseus_decoder_clear_temporal(emPointer, 0);
        this._reset(residualStore, timestamp, 1);
        this.#internalLevel = this.#lcevcDec.currentLevel;
      }
      return null;
    }

    // Check error flags.
    if (result.flags.parse !== 0) {
      // eslint-disable-next-line
      const error = libDPI._perseus_decoder_get_last_error_wrapper(emPointer);
      Log.error(`Module decoder failed. Error #${error}`);
      switch (error) {
        case 3: // Generic stream error.
          if (!group.keyframe) {
            // Possibly there is a global config block missing,
            // and we need to go back to the previous keyframe
            // to parse one and restore the value.
            this._reset(residualStore, timestamp, 0);
          }
          break;
        default:
          break;
      }

      // Fail.
      return null;
    }

    // Check integrity.
    if (result.lcevc.width === 0 || result.lcevc.height === 0) {
      // Fail.
      Log.error('parsed lcevc data failed integrity check.');
      return null;
    }

    return {
      flags: result.flags,
      lcevc: result.lcevc,
      parseLog,
      group
    };
  }

  /**
   * Refresh DPI on account of a profile switch
   *
   * @memberof DPI
   * @public
   */
  _refreshDpi() {
    if (!this.#refreshDPI) {
      this.#refreshDPI = true;
    }
  }

  /**
   * Store the LCEVC data to the LCEVC data pointer.
   *
   * @param {!Uint8Array} pssData LCEVC data.
   * @returns {Result} The status code.
   * @memberof DPI
   * @private
   */
  #setPssData(pssData) {
    if (this.#pssData.pointer.byteLength < pssData.length) {
      _freeDataPointer(libDPI, this.#pssData.pointer);
      this.#pssData.pointer = _createDataPointer(libDPI, pssData);
    } else {
      this.#pssData.pointer.set(pssData);
    }
    this.#pssData.size = pssData.length;

    return Result.OK;
  }

  /**
   * Store the LCEVC data to the LCEVC data pointer.
   *
   * @param {!int} len Full length LCEVC high.
   * @returns {Result} The status code.
   * @memberof DPI
   * @private
   */
  #setFullPssData(len) {
    _freeDataPointer(libDPI, this.#fullpssData.pointer);
    this.#fullpssData = { pointer: _createDataPointer(libDPI, new Uint8Array(1)), size: len };
    this.#fullpssData.size = len;
    return Result.OK;
  }

  /**
   * Parse a single data item.
   *
   * @param {Uint8Array} pssData The LCEVC data.
   * @returns {object} The LCEVC parsed data.
   * @memberof DPI
   * @public
   */
  _parseLcevcDataItem(pssData) {
    // Emscripten memory pointer.
    const emPointer = this.#lcevcDecoderPointer;
    // Flags
    let parse = -1;
    let decodeBase = -1;
    let decodeHigh = -1;
    const lcevc = {};

    if (!this.#decoderResetProgress) {
      this.#setPssData(pssData);
      if (!this.#parseWrapping) {
        // Avoid Memory out of bounds issue
        this.#parseWrapping = true;
        // Parse lcevc and run decode functions.
        parse = libDPI._perseus_decoder_parse_wrapper(
          emPointer,
          this.#pssData.pointer.byteOffset,
          this.#pssData.size,
          this.#lcevcParseInfo
        );
        this.#parseWrapping = false;
      }
    }
    if (parse === 0) {
      const parseInfo = new Int32Array(libDPI.HEAP32.buffer, this.#lcevcParseInfo, 5);
      lcevc.width = parseInfo[0]; // eslint-disable-line
      lcevc.height = parseInfo[1]; // eslint-disable-line
      lcevc.is1D = parseInfo[2]; // eslint-disable-line
      lcevc.hasBase = parseInfo[3]; // eslint-disable-line
      lcevc.hasHigh = parseInfo[4]; // eslint-disable-line

      const widthBase = lcevc.width >> 1;
      const widthHigh = lcevc.width;
      const heightHigh = lcevc.height;
      let fullHigh = widthHigh * heightHigh;
      fullHigh += (fullHigh / 4) * 2;

      decodeBase = libDPI._perseus_decoder_decode_base_wrapper(emPointer,
        this.#pssData.pointer.byteOffset, widthBase);

      this.#setFullPssData(fullHigh);
      if (emPointer && this.#pssData.pointer) {
        decodeHigh = libDPI._perseus_decoder_decode_high_wrapper(emPointer,
          this.#fullpssData.pointer.byteOffset, widthHigh);
      }

      if (decodeBase !== 0 || decodeHigh !== 0) parse = -1;
    }

    return {
      flags: {
        parse,
        decodeBase,
        decodeHigh
      },
      lcevc
    };
  }

  // #region GL and shaders.

  /**
   * Creates the dithering noise texture.
   *
   * @returns {Result} The status code.
   * @memberof DPI
   * @private
   */
  #createNoiseTexture() {
    // Create texture.
    const texture = this.#gl.createTexture();
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);

    // Randomize bytes.
    const size = 512 * 512;
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i += 1) {
      bytes[i] = (Math.random() * 255) >> 0; // eslint-disable-line
      // Circular debug texture.
      // const x = i % 512;
      // const y = i / 512;
      // const r = Math.sqrt((x - 256) * (x - 256) + (y - 256) * (y - 256)) / 256;
      // bytes[i] = (r * 255) >> 0;
    }

    // Repeating noise texture.
    this.#gl.texImage2D(
      this.#gl.TEXTURE_2D,
      0,
      this.#gl.ALPHA,
      512, 512,
      0,
      this.#gl.ALPHA,
      this.#gl.UNSIGNED_BYTE,
      bytes
    );
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MIN_FILTER, this.#gl.NEAREST);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MAG_FILTER, this.#gl.NEAREST);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_S, this.#gl.REPEAT);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_T, this.#gl.REPEAT);

    this.#glNoiseTexture = texture;

    return Result.OK;
  }

  /**
   * Use the debug shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!WebGLTexture} textureVideo The video texture.
   * @param {!WebGLTexture} textureResidualBase The LoQ0 texture.
   * @param {!WebGLTexture} textureResidualHigh The LoQ1 texture.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @param {!boolean} iskey `true` if it is a keyframe.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glDebug(
    fboOut, textureVideo, textureResidualBase, textureResidualHigh, width, height, iskey
  ) {
    const shader = this.#shaderDebug;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureVideo);
    this.#gl.uniform1i(uniforms.textureVideo, 0);

    if (textureResidualBase === null) {
      this.#gl.uniform1f(uniforms.useBase, 0);
    } else {
      // Bind residuals to unit 1.
      this.#gl.activeTexture(this.#gl.TEXTURE1);
      this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureResidualBase);
      this.#gl.uniform1i(uniforms.textureResidualBase, 1);
      this.#gl.uniform1f(uniforms.useBase, 1);
    }

    if (textureResidualHigh === null) {
      this.#gl.uniform1f(uniforms.useHigh, 0);
    } else {
      // Bind residuals to unit 2.
      this.#gl.activeTexture(this.#gl.TEXTURE2);
      this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureResidualHigh);
      this.#gl.uniform1i(uniforms.textureResidualHigh, 2);
      this.#gl.uniform1f(uniforms.useHigh, 1);
    }

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);
    this.#gl.uniform1f(uniforms.isKeyFrame, iskey ? 1 : 0);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the simple shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!WebGLTexture} textureVideo The video texture.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoSimple(fboOut, textureVideo, width, height) {
    const shader = this.#shaderVideoSimple;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureVideo);
    this.#gl.uniform1i(uniforms.textureVideo, 0);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the 1D RGB to YUV shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!WebGLTexture} textureVideo The video texture.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideo1DRGBToYUV(fboOut, textureVideo) {
    const shader = this.#shaderVideo1DRGBtoYUV;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureVideo);
    this.#gl.uniform1i(uniforms.textureIn, 0);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the 1D RBG to YUV merging a residual texture.
   *
   * @param {!FBO} fboOut The output FBO
   * @param {!WebGLTexture} textureVideo The video texture.
   * @param {!WebGLTexture} textureResidual The residual texture.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideo1DRGBToYUVPerseus(fboOut, textureVideo, textureResidual) {
    const shader = this.#shaderVideo1DRGBtoYUVPerseus;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureVideo);
    this.#gl.uniform1i(uniforms.textureIn, 0);

    // Bind residuals to unit 1.
    this.#gl.activeTexture(this.#gl.TEXTURE1);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureResidual);
    this.#gl.uniform1i(uniforms.textureResidual, 1);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the 1D upscale shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!FBO} fboIn The input FBO.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   *
   */
  _glVideo1D4KernelUpscaleX(fboOut, fboIn, width, height) {
    const shader = this.#shaderVideo1D4KernelUpscaleX;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, fboIn.texture);
    this.#gl.uniform1i(uniforms.textureIn, 0);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Shader kernel.
    this.#gl.uniform4fv(uniforms.k0, this.#shaderKernel0);
    this.#gl.uniform4fv(uniforms.k1, this.#shaderKernel1);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the 1D YUV to RBG shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!FBO} fboIn The input FBO.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideo1DYUVToRGB(fboOut, fboIn) {
    const shader = this.#shaderVideo1DYUVtoRGB;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, fboIn.texture);
    this.#gl.uniform1i(uniforms.textureIn, 0);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the 1D YUV to RBG merging a residual texture.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!FBO} fboIn The input FBO.
   * @param {!WebGLTexture} textureResidual the residual texture.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideo1DYUVToRGBPerseus(fboOut, fboIn, textureResidual) {
    const shader = this.#shaderVideo1DYUVtoRGBPerseus;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, fboIn.texture);
    this.#gl.uniform1i(uniforms.textureIn, 0);

    // Bind residuals to unit 1.
    this.#gl.activeTexture(this.#gl.TEXTURE1);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureResidual);
    this.#gl.uniform1i(uniforms.textureResidual, 1);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, fboOut.width, fboOut.height);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the RBG to Y merging a residual texture.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!WebGLTexture} textureVideo The video texture.
   * @param {!WebGLTexture} textureResidual The residual texture.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoPacked4KernelRGBToYPerseus(fboOut, textureVideo, textureResidual, width, height) {
    const shader = this.#shaderVideoPacked4KernelRGBToYPerseus;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureVideo);
    this.#gl.uniform1i(uniforms.textureVideo, 0);

    // Bind residuals to unit 1.
    this.#gl.activeTexture(this.#gl.TEXTURE1);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureResidual);
    this.#gl.uniform1i(uniforms.textureResidual, 1);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the RBG to Y shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!WebGLTexture} textureVideo The video texture.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoPacked4KernelRGBToY(fboOut, textureVideo, width, height) {
    const shader = this.#shaderVideoPacked4KernelRGBToY;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureVideo);
    this.#gl.uniform1i(uniforms.textureVideo, 0);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the RBG to U shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!WebGLTexture} textureVideo The video texture.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoPacked4KernelRGBToU(fboOut, textureVideo, width, height) {
    const shader = this.#shaderVideoPacked4KernelRGBToU;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureVideo);
    this.#gl.uniform1i(uniforms.textureVideo, 0);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the RGB to V shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!WebGLTexture} textureVideo The video texture.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoPacked4KernelRGBToV(fboOut, textureVideo, width, height) {
    const shader = this.#shaderVideoPacked4KernelRGBToV;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureVideo);
    this.#gl.uniform1i(uniforms.textureVideo, 0);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the upscale X axis shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!FBO} fboIn The input FBO.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoPacked4KernelUpscaleX(fboOut, fboIn, width, height) {
    const shader = this.#shaderVideoPacked4KernelUpscaleX;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, fboIn.texture);
    this.#gl.uniform1i(uniforms.textureIn, 0);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Shader kernel.
    this.#gl.uniform4fv(uniforms.k0, this.#shaderKernel0);
    this.#gl.uniform4fv(uniforms.k1, this.#shaderKernel1);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the upscale Y axis shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!FBO} fboIn The input FBO.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoPacked4KernelUpscaleY(fboOut, fboIn, width, height) {
    const shader = this.#shaderVideoPacked4KernelUpscaleY;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, fboIn.texture);
    this.#gl.uniform1i(uniforms.textureIn, 0);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Shader kernel.
    this.#gl.uniform4fv(uniforms.k0, this.#shaderKernel0);
    this.#gl.uniform4fv(uniforms.k1, this.#shaderKernel1);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the upscale Y axis merging a residual texture shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!FBO} fboIn The input FBO.
   * @param {!WebGLTexture} textureResidual The residual texture.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoPacked4KernelUpscaleYPerseus(fboOut, fboIn, textureResidual, width, height) {
    const shader = this.#shaderVideoPacked4KernelUpscaleYPerseus;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind video texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, fboIn.texture);
    this.#gl.uniform1i(uniforms.textureIn, 0);

    // Bind residuals to unit 1.
    this.#gl.activeTexture(this.#gl.TEXTURE1);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureResidual);
    this.#gl.uniform1i(uniforms.textureResidual, 1);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Shader kernel.
    this.#gl.uniform4fv(uniforms.k0, this.#shaderKernel0);
    this.#gl.uniform4fv(uniforms.k1, this.#shaderKernel1);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Use the YUV merge shader.
   *
   * @param {!FBO} fboOut The output FBO.
   * @param {!WebGLTexture} textureY The Y texture.
   * @param {!WebGLTexture} textureU The U texture.
   * @param {!WebGLTexture} textureV The V texture.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @returns {Result} The status code.
   * @memberof DPI
   * @public
   */
  _glVideoPacked4KernelYUVMerge(fboOut, textureY, textureU, textureV, width, height) {
    const shader = this.#shaderVideoPacked4KernelYUVMerge;
    const { uniforms } = shader;

    _useProgramAndLog(this.#gl, shader);

    // Viewport.
    this.#gl.viewport(0, 0, fboOut.width, fboOut.height);

    // Bind y texture to unit 0.
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureY);
    this.#gl.uniform1i(uniforms.textureY, 0);

    // Bind u texture to unit 1.
    this.#gl.activeTexture(this.#gl.TEXTURE1);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureU);
    this.#gl.uniform1i(uniforms.textureU, 1);

    // Bind v texture to unit 2.
    this.#gl.activeTexture(this.#gl.TEXTURE2);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureV);
    this.#gl.uniform1i(uniforms.textureV, 2);

    // Size dimension.
    this.#gl.uniform2f(uniforms.videoSize, width, height);

    // Color space matrix.
    const colmtxIn = this.#colorSpace._getProfile(this.#colorSpace._profileIn);
    const colmtxOut = this.#colorSpace._getProfile(this.#colorSpace._profileOut);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_RGBYUV, false, colmtxIn.glMatrix);
    this.#gl.uniformMatrix4fv(uniforms.colorSpace_YUVRGB, false, colmtxOut.glMatrixInverse);

    // Bind frame buffer.
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, fboOut.framebuffer);

    // Paint.
    this._setQuads(shader, 'position', -1, 1, -1, 1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset GL state.
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.flush();

    return Result.OK;
  }

  /**
   * Round a number to specified precision. By default round to 3 decimal places
   *
   * @static
   * @param {number} number the number to round
   * @param {number} precision amount of decimal places, integer
   * @returns {number} the rounded value
   * @memberof DPI
   * @public
   */
  static round(number, precision = 3) {
    const factor = 10 ** precision;
    return Math.round((number + Number.EPSILON) * factor) / factor;
  }
  // #endregion
}

export default DPI;
