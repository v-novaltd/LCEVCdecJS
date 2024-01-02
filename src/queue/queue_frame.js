/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

import { LcevcStatus } from '../globals/enums';

/**
 * QueueFrame class represent a frame in the queue.
 *
 * Holds all the information to update and render it.
 *
 * @class QueueFrame
 */
class QueueFrame {
  constructor() {
    /** @type {number} */
    this.id = 0;

    /** @type {number} */
    this.frameRate = 0;

    /** @type {number} */
    this.mediaTime = -1;

    /** @type {number} */
    this.presentationTime = -1;

    /** @type {boolean} */
    this.keyframe = false;

    /** @type {number} */
    this.drift = 0;

    /** @type {number} */
    this.inputWidth = 0;

    /** @type {number} */
    this.inputHeight = 0;

    /** @type {number} */
    this.inputWidthTrue = 0;

    /** @type {number} */
    this.inputHeightTrue = 0;

    /** @type {number} */
    this.outputWidth = 0;

    /** @type {number} */
    this.outputHeight = 0;

    /** @type {boolean} */
    this.hasLcevc = false;

    /** @type {object} */
    this.lcevcInfo = {
      parse: false,
      width: 0,
      height: 0,
      is1D: false,
      hasBase: false,
      hasHigh: false,
      ditherStrength: 0,
      parseLog: null
    };

    /** @type {object} */
    this.timingStats = {
      uploadBase: 0,
      decodeResidual: 0,
      uploadResidual: 0,
      renderShader: 0,
      presentationShader: 0,

      displayCount: 0,
      displayFirst: 0,
      displayRecent: 0
    };

    /** @type {boolean} */
    this.available = true;

    /** @type {boolean} */
    this.rendered = false;

    // Used for anything that requires randomness, such as noise.
    /** @type {number} */
    this.randomSeed = Math.random();

    // GL framebuffer object.
    /** @type {FBO} */
    this.fbo = null;
  }

  /**
   * Return if the frame has parsed the LCEVC info.
   *
   * @returns {LcevcStatus} The status.
   * @readonly
   * @memberof QueueFrame
   */
  get _isLcevcParsed() {
    return this.lcevcInfo.parse ? LcevcStatus.APPLIED : LcevcStatus.NOT_APPLIED;
  }
}

export default QueueFrame;
