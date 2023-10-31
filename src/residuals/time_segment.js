/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

/**
 * The TimeSegment represent a interval of time that holds a number of
 * TimeGroups.
 *
 * It stores the TimeGroups unordered and their keys ordered so it can be
 * accessed in constant time. Also stores the ones that are keyframes on a
 * separate array.
 *
 * @class TimeSegment
 */
class TimeSegment {
  constructor(index, size) {
    /** @type {number} */
    this.index = index;

    /** @type {number} */
    this.startTime = index * size;

    /** @type {number} */
    this.endTime = (index + 1) * size;

    /** @type {object[]} */
    this.groups = [];

    /** @type {number[]} */
    this.groupKeys = [];

    /** @type {number[]} */
    this.keyframes = [];

    /** @type {boolean} */
    this.needsUpdate = false;
  }
}

export default TimeSegment;
