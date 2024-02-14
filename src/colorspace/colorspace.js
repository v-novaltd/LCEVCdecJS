/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

import Profile from './profile';
import { Result } from '../globals/enums';
import { Log } from '../log.ts';

/**
 * The ColorSpace class analyse the colorspace of the current player.
 *
 * Using a predefined video with a static image that represent some colors
 * that the values are known.
 *
 * It tries to guess the colorspace by loading the video and capturing a imagen
 * from there and then analyse it.
 *
 * @class ColorSpace
 */
class ColorSpace {
  // eslint-disable-next-line max-len
  // ffmpeg -f lavfi -i yuvtestsrc=rate=10:d=1,scale=640:480,setsar=1,format=yuv420p -an -preset veryslow -crf 17 yuvtest.mp4

  /** @private @type {string} */
  // eslint-disable-next-line max-len
  #videoData = 'data:video/mp4;base64,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';

  /** @public @type {HTMLVideoElement} */
  #video = null;

  /** @private @type {Profile[]} */
  #profiles = null;

  /** @private @type {Profile|-1} */
  #profileDetected = null;

  /** @private @type {string} */
  #profileIn = null;

  /** @private @type {string} */
  #profileOut = null;

  /** @private @type {Function} */
  #videoLoadedBind = null;

  /**
   * Creates an instance of ColorSpace.
   *
   * @memberof ColorSpace
   */
  constructor() {
    // Color spaces.
    this.#initProfiles();
    this._setProfileIn(null);
    this._setProfileOut();

    // Inline video.
    this.#createVideo();

    return Result.OK;
  }

  /**
   * Gets the input profile name.
   *
   * @readonly
   * @returns {string} The input profile name.
   * @memberof ColorSpace
   * @public
   */
  get _profileIn() {
    return this.#profileIn;
  }

  /**
   * Gets the output profile name.
   *
   * @readonly
   * @returns {string} The output profile name.
   * @memberof ColorSpace
   * @public
   */
  get _profileOut() {
    return this.#profileOut;
  }

  /**
   * Gets the profile of the given name.
   *
   * @param {!string} profileName The name of the profile.
   * @returns {Profile} The profile.
   * @memberof ColorSpace
   * @public
   */
  _getProfile(profileName) {
    return this.#profiles[profileName];
  }

  /**
   * Close and free memory.
   *
   * @returns {Result} The status code.
   * @memberof ColorSpace
   * @public
   */
  _close() {
    this.#destroyVideo();
    Log.msg('ColorSpace.closed');
    return Result.OK;
  }

  /**
   * Initialise the profiles.
   *
   * @returns {Result} The status code.
   * @memberof ColorSpace
   * @private
   */
  #initProfiles() {
    // Define color spaces.
    this.#profiles = [];

    // #region 601
    // Most common 601, default
    this.#profiles['BT601.v1'] = new Profile(
      [16, 128, 128],
      [ // Rgb to yuv.
        0.257, 0.504, 0.098,
        -0.148, -0.291, 0.439,
        0.439, -0.368, -0.071
      ]
    );

    // 601.v2
    this.#profiles['BT601.v2'] = new Profile(
      [16, 128, 128],
      [
        0.299, 0.587, 0.114,
        -0.173, -0.339, 0.511,
        0.511, -0.428, -0.083
      ]
    );

    // https://softpixel.com/~cwright/programming/colorspace/yuv/
    this.#profiles['BT601.v3'] = new Profile(
      [0, 128, 128],
      [
        0.299000, 0.587000, 0.114000,
        -0.168736, -0.331264, 0.500000,
        0.500000, -0.418688, -0.081312
      ]
    );

    // https://mymusing.co/bt601-yuv-to-rgb-conversion-color/
    this.#profiles['BT601.spec'] = new Profile(
      [16, 128, 128],
      [
        0.299, 0.587, 0.114,
        -0.14713, -0.28886, 0.436,
        0.615, -0.51499, -0.10001
      ]
    );
    // #endregion

    // #region 709
    // most common 709
    this.#profiles['BT709.v1'] = new Profile(
      [16, 128, 128],
      [
        0.1826, 0.6142, 0.0620,
        -0.1006, -0.3386, 0.4392,
        0.4392, -0.3989, -0.0403
      ]
    );

    this.#profiles['BT709.v2'] = new Profile(
      [0, 128, 128],
      [
        0.2126, 0.7152, 0.0722,
        -0.1146, -0.3854, 0.5000,
        0.5000, -0.4542, -0.0468
      ]
    );

    // https://mymusing.co/bt601-yuv-to-rgb-conversion-color/
    this.#profiles['BT709.spec'] = new Profile(
      [16, 128, 128],
      [
        0.2126, 0.7152, 0.0722,
        -0.09991, -0.33609, 0.436,
        0.615, -0.55861, -0.05639
      ]
    );
    // #endregion

    // #region 2020
    // https://chromium.googlesource.com/libyuv/libyuv/+/master/source/row_common.cc#1145
    // #endregion

    // https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.709-6-201506-I!!PDF-E.pdf
    // Full range and limited range BT.709 from the standard
    const Ysc = 219.0 / 255.0;
    const UVsc = 224.0 / 255.0;

    this.#profiles['BT709.TV'] = new Profile(
      [16, 128, 128],
      [
        0.2126 * Ysc, 0.7152 * Ysc, 0.0722 * Ysc,
        (-0.2126 / 1.8556) * UVsc, (-0.7152 / 1.8556) * UVsc, (0.9278 / 1.8556) * UVsc,
        (0.7874 / 1.5748) * UVsc, (-0.7152 / 1.5748) * UVsc, (-0.0722 / 1.5748) * UVsc
      ]
    );

    this.#profiles['BT709.PC'] = new Profile(
      [0, 128, 128],
      [
        0.2126, 0.7152, 0.0722,
        -0.2126 / 1.8556, -0.7152 / 1.8556, 0.9278 / 1.8556,
        0.7874 / 1.5748, -0.7152 / 1.5748, -0.0722 / 1.5748
      ]
    );

    return Result.OK;
  }

  /**
   * Sets the input profile.
   *
   * @param {!string} profile The profile name.
   * @returns {Result} The status code.
   * @memberof ColorSpace
   * @public
   */
  _setProfileIn(profile) {
    if (profile) {
      this.#profileIn = profile;
    } else {
      this.#profileIn = this.#profileDetected;
    }
    if (!this.#profiles[this.#profileIn]) {
      this.#profileIn = Object.keys(this.#profiles)[0]; // eslint-disable-line
    }

    return Result.OK;
  }

  /**
   * Sets the output profile.
   *
   * @param {!string} profile The profile name.
   * @returns {Result} The status code.
   * @memberof ColorSpace
   * @public
   */
  _setProfileOut(profile) {
    if (profile) {
      this.#profileOut = profile;
    } else {
      this.#profileOut = this.#profileDetected;
    }
    if (!this.#profiles[this.#profileOut]) {
      this.#profileOut = Object.keys(this.#profiles)[0]; // eslint-disable-line
    }

    return Result.OK;
  }

  /**
   * Creates a HTMLVideoElement with the profile video to later be used to
   * check the colorspace.
   *
   * @returns {Result} The status code.
   * @memberof ColorSpace
   * @private
   */
  #createVideo() {
    this.#videoLoadedBind = this.#videoLoaded.bind(this);

    const video = document.createElement('video');
    video.id = 'video';
    video.addEventListener('seeked', this.#videoLoadedBind);
    video.addEventListener('canplaythrough', this.#bumpTime);

    // Put bytes.
    video.src = this.#videoData;

    this.#video = video;

    return Result.OK;
  }

  /**
   * Destroy the video to force it to be GC.
   *
   * @returns {Result} The status code.
   * @memberof ColorSpace
   * @private
   */
  #destroyVideo() {
    this.#video.removeEventListener('seeked', this.#videoLoadedBind);
    this.#video.removeEventListener('canplaythrough', this.#bumpTime);

    // Destroy video.
    this.#video.pause();
    this.#video.removeAttribute('src');
    this.#video.load();

    // Unlink.
    this.#video = null;

    return Result.OK;
  }

  /**
   * Just moves the playhead to trigger an event, incase not already triggered.
   *
   * @returns {Result} The status code.
   * @memberof ColorSpace
   * @private
   */
  #bumpTime() {
    if (!this) return Result.FAIL;

    this.currentTime = 0.5;

    return Result.OK;
  }

  /**
   * Create a WebGL context, capture the video, extract the data from it and
   * remove the WebGL context and destroy the video.
   *
   * @returns {Result} The status code.
   * @memberof ColorSpace
   * @private
   */
  #videoLoaded() {
    // Create gl canvas
    const canvas = document.createElement('canvas');

    const options = {
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

    const gl = canvas.getContext('webgl', options)
      || canvas.getContext('experimental-webgl', options);

    // Draw video to texture
    const width = this.#video.videoWidth;
    const height = this.#video.videoHeight;
    const textureVideo = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureVideo);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.#video);

    // Bind texture to framebuffer to download pixels
    const framebuffer = gl.createFramebuffer();
    const pixels = new Uint8Array(width * height * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureVideo, 0);
    gl.finish();
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Destroy gl
    gl.deleteTexture(textureVideo);
    gl.deleteFramebuffer(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Analyse
    this.#analyseFrame(pixels, width, height);

    // Close
    this._close();

    return Result.OK;
  }

  /**
   * Determine colorspace and store value.
   *
   * @param {!number} pixels The texture data captured from the video.
   * @param {!number} width The width of the texture.
   * @param {!number} height The height of the texture.
   * @returns {Result} The status code.
   * @memberof ColorSpace
   */
  #analyseFrame(pixels, width, height) {
    // Known YUV values to compare against.
    const P = ColorSpace.YUVPoint;
    const yuvPoints = [
      new P(pixels, width, height, 0.0 * width + 1, (0 / 3 + 1 / 6) * height, 0, 128, 128),
      new P(pixels, width, height, 0.5 * width, (0 / 3 + 1 / 6) * height, 128, 128, 128),
      new P(pixels, width, height, 1.0 * width - 2, (0 / 3 + 1 / 6) * height, 255, 128, 128),

      new P(pixels, width, height, 0.0 * width + 1, (1 / 3 + 1 / 6) * height, 128, 0, 128),
      new P(pixels, width, height, 0.25 * width, (1 / 3 + 1 / 6) * height, 128, 64, 128),
      new P(pixels, width, height, 0.75 * width, (1 / 3 + 1 / 6) * height, 128, 192, 128),
      new P(pixels, width, height, 1.0 * width - 2, (1 / 3 + 1 / 6) * height, 128, 255, 128),

      new P(pixels, width, height, 0.0 * width + 1, (2 / 3 + 1 / 6) * height, 128, 128, 0),
      new P(pixels, width, height, 0.25 * width, (2 / 3 + 1 / 6) * height, 128, 128, 64),
      new P(pixels, width, height, 0.75 * width, (2 / 3 + 1 / 6) * height, 128, 128, 192),
      new P(pixels, width, height, 1.0 * width - 2, (2 / 3 + 1 / 6) * height, 128, 128, 255)
    ];

    // Known Color Spaces to check.
    let minDif = Number.MAX_VALUE;
    let minIndex = null;
    this.#profiles.forEach((profile) => {
      let dif = 0;
      let difTot = 0;
      for (let i = 0; i < yuvPoints.length; i += 1) {
        // Convert.
        const yuvPoint = yuvPoints[i];
        const yuv = [
          yuvPoint.y,
          yuvPoint.u,
          yuvPoint.v
        ];
        const rgb = this.#YUVtoRGB(yuv, profile);

        // Get dif.
        dif = Math.abs(rgb[0] - yuvPoint.r)
          + Math.abs(rgb[1] - yuvPoint.g)
          + Math.abs(rgb[2] - yuvPoint.b);
        difTot += dif;
      }

      if (difTot < minDif) {
        minDif = difTot;
        minIndex = profile;
      }
    });

    // Test failed, do not change profile.
    if (minIndex === null) {
      Log.warn('Unable to detect your browser\'s colorspace.');
      this.#profileDetected = -1;
      return Result.FAIL;
    }

    // Difference outside threshold, do not change profile.
    const minDifPerPixel = minDif / (yuvPoints.length * 3);
    if (minDifPerPixel > 2) {
      Log.warn('Unknown colorspace is being used.');
      this.#profileDetected = -1;
      return Result.FAIL;
    }

    // Change profile.
    this.#profileDetected = minIndex;
    this._setProfileIn(this.#profileDetected);
    Log.info(`Your browser is using colorspace "${this.#profileDetected
    }" with an error of ${((minDifPerPixel / 255) * 100).toFixed(2)}%.`);

    return Result.OK;
  }

  /**
   * Transform an RGB array to YUV.
   *
   * @param {!number[]} RGB The RGB data of an image.
   * @param {!number} profileIndex The profile index.
   * @returns {number[]} The YUV transformed data.
   * @memberof ColorSpace
   * @private
   */
  #RGBtoYUV(RGB, profileIndex) {
    const int = Math.round;

    const profile = this.#profiles[profileIndex];
    const o = profile.offset;
    const m = profile.matrix;

    const R = RGB[0];
    const G = RGB[1];
    const B = RGB[2];

    let Y = int(m[0] * R) + int(m[1] * G) + int(m[2] * B);
    let U = int(m[3] * R) + int(m[4] * G) + int(m[5] * B);
    let V = int(m[6] * R) + int(m[7] * G) + int(m[8] * B);

    Y += o[0];
    U += o[1];
    V += o[2];

    return [Y, U, V];
  }

  /**
   * Transform an YUV array to RGB.
   *
   * @param {!number[]} YUV The YUV data of an image.
   * @param {!number} profileIndex The profile index.
   * @returns {number[]} The RGB transformed data.
   * @memberof ColorSpace
   * @private
   */
  #YUVtoRGB(YUV, profileIndex) {
    const int = Math.round;

    const profile = this.#profiles[profileIndex];
    const o = profile.offset;
    const m = profile.matrixInverse;

    let Y = YUV[0];
    let U = YUV[1];
    let V = YUV[2];

    Y -= o[0];
    U -= o[1];
    V -= o[2];

    let R = int(m[0] * Y) + int(m[1] * U) + int(m[2] * V);
    let G = int(m[3] * Y) + int(m[4] * U) + int(m[5] * V);
    let B = int(m[6] * Y) + int(m[7] * U) + int(m[8] * V);

    // Clamp.
    if (R < 0) R = 0;
    if (G < 0) G = 0;
    if (B < 0) B = 0;
    if (R > 255) R = 255;
    if (G > 255) G = 255;
    if (B > 255) B = 255;

    return [R, G, B];
  }
}

/**
 * Creates a YUV color point from the texture captured from the video.
 *
 * Given a X and Y position, it will get the RGB value from the texture.
 *
 * @param {!number} pixels The texture data captured from the video.
 * @param {!number} width The width of the texture.
 * @param {!number} px The X position.
 * @param {!number} py The Y position.
 * @param {!number} y The Y value.
 * @param {!number} u The U value.
 * @param {!number} v The V value.
 * @returns {Result}
 * @memberof ColorSpace
 * @private
 */
ColorSpace.YUVPoint = function (pixels, width, px, py, y, u, v) {
  const pointX = px >> 0;
  const pointY = py >> 0;

  const p = (pointY * width + pointX) * 4;
  this.r = pixels[p + 0];
  this.g = pixels[p + 1];
  this.b = pixels[p + 2];

  this.y = y;
  this.u = u;
  this.v = v;

  return Result.OK;
};

export default ColorSpace;
