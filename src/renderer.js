/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

import {
  _createFBO,
  _deleteFBO,
  _useProgramAndLog,
  FBO // eslint-disable-line
} from './graphics/webgl';
import { Result } from './globals/enums';

/**
 * The Renderer class is in charge of rendering frames and presenting to the
 * screen.
 *
 * @class Renderer
 */
class Renderer {
  /** @private @type {WebGLRenderingContext} */
  #gl = null;

  // #region  frame buffers
  /** @private @type {FBO} */
  #fboVideoY = null;

  /** @private @type {FBO} */
  #fboVideoU = null;

  /** @private @type {FBO} */
  #fboVideoV = null;

  /** @private @type {FBO} */
  #fboUpscale = null;

  /** @private @type {FBO} */
  #fboUpscaleY = null;

  /** @private @type {FBO} */
  #fboUpscaleU = null;

  /** @private @type {FBO} */
  #fboUpscaleV = null;

  /** @private @type {FBO} */
  #fboVideoYUV = null;

  /** @private @type {FBO} */
  #fboApplyY = null;

  /** @private @type {FBO} */
  #fboApplyU = null;

  /** @private @type {FBO} */
  #fboApplyV = null;
  // #endregion

  #presentationFrameWidth = 0;

  #presentationFrameHeight = 0;

  /**
   * Creates an instance of Renderer.
   *
   * @param {WebGLRenderingContext} gl The WebGL context.
   * @memberof Renderer
   */
  constructor(gl) {
    this.#gl = gl;

    this.#fboVideoYUV = _createFBO(gl, 1, 1);
    this.#fboVideoY = _createFBO(gl, 1, 1);
    this.#fboVideoU = _createFBO(gl, 1, 1);
    this.#fboVideoV = _createFBO(gl, 1, 1);
    this.#fboUpscale = _createFBO(gl, 1, 1);
    this.#fboUpscaleY = _createFBO(gl, 1, 1);
    this.#fboUpscaleU = _createFBO(gl, 1, 1);
    this.#fboUpscaleV = _createFBO(gl, 1, 1);
    this.#fboApplyY = _createFBO(gl, 1, 1);
    this.#fboApplyU = _createFBO(gl, 1, 1);
    this.#fboApplyV = _createFBO(gl, 1, 1);
  }

  /**
   * Returns the presentation frame width.
   *
   * @readonly
   * @returns {number} The width.
   * @memberof Renderer
   * @public
   */
  get _presentationFrameWidth() {
    return this.#presentationFrameWidth;
  }

  /**
   * Returns the presentation frame height.
   *
   * @readonly
   * @returns {number} The height.
   * @memberof Renderer
   * @public
   */
  get _presentationFrameHeight() {
    return this.#presentationFrameHeight;
  }

  /**
   * Close this object and free memory.
   *
   * @returns {Result} The status code.
   * @memberof Renderer
   * @public
   */
  _close() {
    const gl = this.#gl;

    if (_deleteFBO(gl, this.#fboVideoYUV) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboVideoY) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboVideoU) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboVideoV) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboUpscale) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboUpscaleY) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboUpscaleU) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboUpscaleV) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboApplyY) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboApplyU) !== Result.OK) return Result.FAIL;
    if (_deleteFBO(gl, this.#fboApplyV) !== Result.OK) return Result.FAIL;

    this.#gl = null;

    return Result.OK;
  }

  /**
   * Check FBO size or create new one if mismatch.
   *
   * @param {!FBO} fbo The FBO.
   * @param {!number} width The width.
   * @param {!number} height The height.
   * @param {!boolean} linear `true` if linear, otherwise `false`.
   * @returns {Result}
   * @memberof Renderer
   * @private
   */
  #sizeFBO(fbo, width, height, linear) {
    const filter = linear ? this.#gl.LINEAR : null;
    if (fbo.width !== width || fbo.height !== height || fbo.filter !== filter) {
      _deleteFBO(this.#gl, fbo);

      const fboNew = _createFBO(this.#gl, width, height, filter);
      fbo.width = width; // eslint-disable-line
      fbo.height = height; // eslint-disable-line
      fbo.texture = fboNew.texture; // eslint-disable-line
      fbo.framebuffer = fboNew.framebuffer; // eslint-disable-line
      fbo.filter = filter // eslint-disable-line
    }

    return Result.OK;
  }

  /**
   * Render a 2D frame.
   *
   * The following steps are done:
   *  - Converts the video image to YUV.
   *  - If LoQ0 is enable, merge the LoQ0 texture with the video one.
   *  - Upscale the X axis texture.
   *  - If LoQ1 is enable, upscale the Y axis and merge the LoQ1 texture, else
   *    upscale the Y axis.
   *  - Convert the end texture to RGB.
   *
   * @param {!DPI} decoder The DPI object.
   * @param {!QueueFrame} queueFrame The QueueFrame.
   * @param {!WebGLTexture} texVid The video texture.
   * @param {!WebGLTexture} texBase The LoQ0 texture.
   * @param {!WebGLTexture} texHigh The LoQ1 texture.
   * @returns {Result} The status code.
   * @memberof Renderer
   * @public
   */
  _renderFrame(decoder, queueFrame, texVid, texBase, texHigh) {
    // Resize framebuffers.
    const vidWidth = queueFrame.inputWidth;
    const vidHeight = queueFrame.inputHeight;
    const outWidth = queueFrame.outputWidth;
    const outHeight = queueFrame.outputHeight;

    this.#sizeFBO(queueFrame.fbo, outWidth, outHeight, true);
    this.#sizeFBO(this.#fboVideoY, vidWidth >> 1, vidHeight >> 1);
    this.#sizeFBO(this.#fboVideoU, vidWidth >> 1, vidHeight >> 1);
    this.#sizeFBO(this.#fboVideoV, vidWidth >> 1, vidHeight >> 1);
    this.#sizeFBO(this.#fboUpscaleY, vidWidth, vidHeight >> 1);
    this.#sizeFBO(this.#fboUpscaleU, vidWidth, vidHeight >> 1);
    this.#sizeFBO(this.#fboUpscaleV, vidWidth, vidHeight >> 1);
    this.#sizeFBO(this.#fboApplyY, vidWidth, vidHeight);
    this.#sizeFBO(this.#fboApplyU, vidWidth, vidHeight);
    this.#sizeFBO(this.#fboApplyV, vidWidth, vidHeight);

    // Convert video to packed YUV in separate textures.
    if (queueFrame.lcevcInfo.hasBase) {
      decoder._glVideoPacked4KernelRGBToYPerseus(
        this.#fboVideoY, texVid, texBase, vidWidth, vidHeight
      );
    } else {
      decoder._glVideoPacked4KernelRGBToY(this.#fboVideoY, texVid, vidWidth, vidHeight);
    }
    decoder._glVideoPacked4KernelRGBToU(this.#fboVideoU, texVid, vidWidth, vidHeight);
    decoder._glVideoPacked4KernelRGBToV(this.#fboVideoV, texVid, vidWidth, vidHeight);

    // Upscale x of separate textures.
    decoder._glVideoPacked4KernelUpscaleX(this.#fboUpscaleY, this.#fboVideoY, vidWidth, vidHeight);
    decoder._glVideoPacked4KernelUpscaleX(this.#fboUpscaleU, this.#fboVideoU, vidWidth, vidHeight);
    decoder._glVideoPacked4KernelUpscaleX(this.#fboUpscaleV, this.#fboVideoV, vidWidth, vidHeight);

    // Upscale y of separate textures, and apply perseus.
    if (queueFrame.lcevcInfo.hasHigh) {
      decoder._glVideoPacked4KernelUpscaleYPerseus(
        this.#fboApplyY, this.#fboUpscaleY, texHigh, vidWidth, vidHeight
      );
    } else {
      decoder._glVideoPacked4KernelUpscaleY(
        this.#fboApplyY, this.#fboUpscaleY, vidWidth, vidHeight
      );
    }
    decoder._glVideoPacked4KernelUpscaleY(this.#fboApplyU, this.#fboUpscaleU, vidWidth, vidHeight);
    decoder._glVideoPacked4KernelUpscaleY(this.#fboApplyV, this.#fboUpscaleV, vidWidth, vidHeight);

    // Merge and unpack textures into RGB.
    decoder._glVideoPacked4KernelYUVMerge(
      queueFrame.fbo,
      this.#fboApplyY.texture,
      this.#fboApplyU.texture,
      this.#fboApplyV.texture,
      vidWidth,
      vidHeight
    );

    return Result.OK;
  }

  /**
   * Returns the internal frame buffer states.
   *
   * @returns {object} The frame buffer states.
   * @memberof Renderer
   * @public
   */
  _getInternalFrameBufferStates() {
    return {
      gl: this.#gl,
      fboVideoYUV: this.#fboVideoYUV,
      fboVideoY: this.#fboVideoY,
      fboVideoU: this.#fboVideoU,
      fboVideoV: this.#fboVideoV,
      fboUpscale: this.#fboUpscale,
      fboUpscaleY: this.#fboUpscaleY,
      fboUpscaleU: this.#fboUpscaleU,
      fboUpscaleV: this.#fboUpscaleV,
      fboApplyY: this.#fboApplyY,
      fboApplyU: this.#fboApplyU,
      fboApplyV: this.#fboApplyV
    };
  }

  /**
   * Render a 1D frame.
   *
   * The following steps are done:
   *  - Converts the video image to YUV.
   *  - If LoQ0 is enable, merge the LoQ0 texture with the video one.
   *  - Upscale the X axis texture.
   *  - If LoQ1 is enable, merge the LoQ1 texture and convert it to RGB, else
   *    convert the texture to RGB.
   *
   * @param {!DPI} decoder The DPI object.
   * @param {!QueueFrame} queueFrame The QueueFrame.
   * @param {!WebGLTexture} texVid The video texture.
   * @param {!WebGLTexture} texBase The LoQ0 texture.
   * @param {!WebGLTexture} texHigh The LoQ1 texture.
   * @returns {Result} The status code.
   * @memberof Renderer
   * @public
   */
  _renderFrame1D(decoder, queueFrame, texVid, texBase, texHigh) {
    // Resize framebuffers.
    const vidWidth = queueFrame.inputWidth;
    const vidHeight = queueFrame.inputHeight;
    const outWidth = queueFrame.outputWidth;
    const outHeight = queueFrame.outputHeight;

    this.#sizeFBO(queueFrame.fbo, outWidth, outHeight, true);
    this.#sizeFBO(this.#fboVideoYUV, vidWidth >> 1, vidHeight);
    this.#sizeFBO(this.#fboUpscale, outWidth, outWidth);

    // Convert to YUV.
    if (queueFrame.lcevcInfo.hasBase) {
      decoder._glVideo1DRGBToYUVPerseus(this.#fboVideoYUV, texVid, texBase);
    } else {
      decoder._glVideo1DRGBToYUV(this.#fboVideoYUV, texVid);
    }

    // Upscale.
    decoder._glVideo1D4KernelUpscaleX(this.#fboUpscale, this.#fboVideoYUV, vidWidth, vidHeight);

    // Apply perseus and convert to RGB.
    if (queueFrame.lcevcInfo.hasHigh) {
      decoder._glVideo1DYUVToRGBPerseus(queueFrame.fbo, this.#fboUpscale, texHigh);
    } else {
      decoder._glVideo1DYUVToRGB(queueFrame.fbo, this.#fboUpscale);
    }

    return Result.OK;
  }

  /**
   * Render a frame without using LCEVC.
   *
   * @param {!DPI} decoder The DPI object.
   * @param {!QueueFrame} queueFrame The QueueFrame.
   * @param {!WebGLTexture} texVid The video texture.
   * @returns {Result} The status code.
   * @memberof Renderer
   * @public
   */
  _renderSimple(decoder, queueFrame, texVid) {
    // Resize framebuffers.
    const vidWidth = queueFrame.inputWidth;
    const vidHeight = queueFrame.inputHeight;
    const outWidth = queueFrame.outputWidth;
    const outHeight = queueFrame.outputHeight;

    this.#sizeFBO(queueFrame.fbo, outWidth, outHeight, true);

    // Simple shader.
    decoder._glVideoSimple(queueFrame.fbo, texVid, vidWidth, vidHeight);

    return Result.OK;
  }

  /**
   * Render a frame highligthing the residuals.
   *
   * Render the video in greyscale with the LoQ0 and LoQ1 in pinkscale.
   *
   * @param {!DPI} decoder The DPI object.
   * @param {!QueueFrame} queueFrame The QueueFrame.
   * @param {!WebGLTexture} texVid The video texture.
   * @param {!WebGLTexture} texBase The LoQ0 texture.
   * @param {!WebGLTexture} texHigh The LoQ1 texture.
   * @returns {Result}
   * @memberof Renderer
   * @public
   */
  _renderDebug(decoder, queueFrame, texVid, texBase, texHigh) {
    // Resize framebuffers.
    const vidWidth = queueFrame.inputWidth;
    const vidHeight = queueFrame.inputHeight;
    const outWidth = queueFrame.outputWidth;
    const outHeight = queueFrame.outputHeight;

    this.#sizeFBO(queueFrame.fbo, outWidth, outHeight, true);

    // Debug shader.
    decoder._glDebug(
      queueFrame.fbo,
      texVid,
      queueFrame.lcevcInfo.hasBase ? texBase : null,
      queueFrame.lcevcInfo.hasHigh ? texHigh : null,
      vidWidth,
      vidHeight,
      queueFrame.keyframe
    );

    return Result.OK;
  }

  /**
   * Renders a texture at the WebGL context canvas.
   *
   * @param {!DPI} decoder The DPI object.
   * @param {!WebGLTexture} textureFrame The texture.
   * @param {!number} frameWidth The frame width.
   * @param {!number} frameHeight The frame height.
   * @param {!number} displayWidth The canvas display width.
   * @param {!number} displayHeight The canvas display height.
   * @param {!number} seed The seed of the dithering.
   * @param {!number} ditherStrength The dithering strength.
   * @returns {Result} The status code.
   * @memberof Renderer
   * @public
   */
  _renderToScreen(
    decoder,
    textureFrame,
    frameWidth,
    frameHeight,
    displayWidth,
    displayHeight,
    seed,
    ditherStrength
  ) {
    const shader = decoder._shaderVideoDisplay;
    const { uniforms } = shader;

    // Store for stats
    this.#presentationFrameWidth = frameWidth;
    this.#presentationFrameHeight = frameHeight;

    // Shader
    _useProgramAndLog(this.#gl, shader);

    // Viewport
    this.#gl.viewport(0, 0, displayWidth, displayHeight);

    // Bind frame texture to unit 0
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureFrame);
    this.#gl.uniform1i(uniforms.textureFrame, 0);

    // Bind noise texture to unit 1
    this.#gl.activeTexture(this.#gl.TEXTURE1);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, decoder._glNoiseTexture);
    this.#gl.uniform1i(uniforms.textureNoise, 1);

    // Size dimension
    this.#gl.uniform2f(uniforms.frameSize, frameWidth, frameHeight);
    this.#gl.uniform2f(uniforms.outputSize, displayWidth, displayHeight);

    // Dithering
    // const ditherX = 512 * Math.random() >> 0;
    // const ditherY = 512 * Math.random() >> 0;
    const ditherX = (0b1000000000000000000 * seed >> 0) & 0b111111111;
    const ditherY = (0b1000000000000000000 * seed >> 9) & 0b111111111;
    this.#gl.uniform3f(uniforms.dithering, ditherX, ditherY, ditherStrength);

    // Bind frame buffer to screen
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);

    // Paint
    decoder._setQuads(shader, 'position', -1, 1, 1, -1, 'texcoord', 0, 1, 0, 1);
    this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, 4);

    // Unset this.#gl state
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    this.#gl.flush();

    return Result.OK;
  }
}

export default Renderer;
