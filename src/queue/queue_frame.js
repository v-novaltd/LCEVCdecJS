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

    // Used for anything that requires randomness, such as noise - Used for dithering.
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
