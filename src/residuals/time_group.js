/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

/**
 * The TimeGroup class represent a residual time interval.
 *
 * It holds the LCEVC data that is need to be applied in the interval of time.
 * Also holds information about the framerate, profile and if it is a keyframe.
 *
 * @class TimeGroup
 */
class TimeGroup {
  constructor() {
    /** @type {number} */
    this.index = null;

    /** @type {number} */
    this.frameRate = 0;

    /** @type {number} */
    this.startTime = 0;

    /** @type {number} */
    this.endTime = 0;

    /** @type {boolean} */
    this.keyframe = false;

    /** @type {number} */
    this.level = -1;

    /** @type {object} */
    this.pssData = null;
  }
}

export default TimeGroup;
