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

import { Result } from '../globals/enums';
import { Log } from '../log.ts';
import TimeSegment from './time_segment';
import TimeGroup from './time_group';
import { _binaryPositionSearch } from '../algorithms/binary_position_search.ts';

/**
 * The ResidualStore class is used to store the incoming residual data as it is
 * passed through by the demuxer worker.
 *
 * @class ResidualStore
 */
class ResidualStore {
  /** @private @type {LCEVCdec} */
  #lcevcDec = null;

  /**
   * Segment size (in seconds), dont make this less than 1
   * The lowest frame rate must ALWAYS be more than the segment size, eg >1fps.
   *
   * @private @type {number}
   */
  #segmentSize = 1;

  /** @private @type {object[]} */
  #segments = [];

  /** @private @type {object} */
  #firstKeyframe = null;

  /** @private @type {boolean} */
  #removeOnReceive = false;

  /** @private @type {number} */
  #defaultDuration = 3000;

  /** @private @type {number} */
  #default = null;

  // Setup.
  constructor(lcevcDec) {
    this.#lcevcDec = lcevcDec;
    this.#flushData();
  }

  /**
   * Close this object and free memory.
   *
   * @returns {Result} The status code.
   * @memberof ResidualStore
   */
  _close() {
    // Aggresively unset group properties (maybe leave this to garbage collector).
    this.#segments.forEach((segment) => {
      segment.groups.forEach((group) => {
        group.pssData = null; // eslint-disable-line
      });
    });

    this.#flushData();
    this.#lcevcDec = null;

    return Result.OK;
  }

  /**
   * Flush all the residual data.
   *
   * @returns {Result} The status code.
   * @memberof ResidualStore
   */
  #flushData() {
    this.#segments = [];
    this.#firstKeyframe = null;
    return Result.OK;
  }

  /**
   * Flush the data from the start to the passed end time.
   *
   * @param {!number} timestamp The end time.
   * @returns {Result} The status code.
   * @memberof ResidualStore
   * @private
   */
  #clearOldFrames(timestamp) {
    if (this.#segments.length === 0) return Result.FAIL;

    let segmentIndex = Math.floor(timestamp / this.#segmentSize);
    let segment = this._getSegment(segmentIndex);

    const firstKey = Object.keys(this.#segments)[0];
    while (!segment || segmentIndex < firstKey) {
      segmentIndex -= 1;
      segment = this._getSegment(segmentIndex);
    }

    const timeindex = ResidualStore.#groupIndexFromTime(timestamp);
    const groupIndex = _binaryPositionSearch(segment.groupKeys, timeindex) - 1;

    if (groupIndex === 0) {
      this.#segments.splice(segmentIndex, 1);
    } else {
      // slice may be deleting the last element needlessly
      segment.groupKeys = segment.groupKeys.slice(groupIndex, -1);
      segment.endTime = segment.groupKeys[segment.groupKeys.length - 1];
    }

    this.#segments = this.#segments.slice(segmentIndex + 1, -1);

    return 0;
  }

  /**
   * Flush any stored residuals between a certain time range.
   *
   * @param {!number} startTime The start time.
   * @param {!number} endTime The end time.
   * @returns {Result} The status code.
   * @memberof ResidualStore
   * @public
   */
  _flushDataRange(startTime, endTime) {
    // Loop through time ranges and tag every segment that is included.
    for (let i = 0; i < this.#segments.length; i += 1) {
      const segment = this.#segments[i];
      if (segment) {
        if (segment.startTime >= startTime) {
          if (segment.endTime <= endTime) {
            delete this.#segments[i];
          } else {
          // Segment is on boundary, delete all groups before endTime.
            for (let j = 0; j < segment.groupKeys.length; j += 1) {
              const groupKey = segment.groupKeys[j];
              const group = segment.groups[groupKey];
              if (group && group.startTime < endTime) {
                segment.groupKeys.splice(j, 1);
                delete segment.groups[groupKey];
                j -= 1;
              }
            }

            // Update.
            ResidualStore.#updateSegment(segment);
          }
        } else if (segment.endTime >= startTime) {
        // Segment is on boundary, delete all groups after startTime.
          for (let j = 0; j < segment.groupKeys.length; j += 1) {
            const groupKey = segment.groupKeys[j];
            const group = segment.groups[groupKey];
            if (group && group.startTime > startTime) {
              segment.groupKeys.splice(j, 1);
              delete segment.groups[groupKey];
              j -= 1;
            }
          }

          // Update.
          ResidualStore.#updateSegment(segment);
        }
      }
    }

    return Result.OK;
  }

  /**
   * Add pssData.
   *
   * This adds a demuxed chunk of residual data to the store and maintains the
   * integrity of all previous and following values, keeping them in a sorted
   * order and overwriting any existing frame data that has been marked with
   * the same timestamps.
   *
   * This should maintain an exact match of the native video, including all
   * frames and frame times, even with variable frame rates.
   *
   * Do NOT use "_getSegment" inside this function as it may be wasteful or
   * circular.
   *
   * Data is stored by PTS.
   * When adding a new group and overwriting old groups we need to be able to
   * handle these scenarios as detailed below and referenced in the code.
   *
   * Scenario A:
   *
   * +---------------------------+
   * |                           |
   * |           Segment         |
   * |                           |
   * |     +-----------+         |
   * |     |           |         |
   *       | New Group |
   *       v           v
   *  ..+-----------+............
   *    |           |
   *    | Old Group |
   *    |           |
   *  ..+-----------+............
   *
   * Scenario B:
   *
   * --------+---------------------------+
   *         |                           |
   *         |           Segment         |
   *         |                           |
   *         |     +-----------+         |
   *         |     |           |         |
   *               | New Group |
   *               v           v
   * .....+-----------+..................
   *      |           |
   *      | Old Group |
   *      |           |
   * .....+-----------+..................
   *
   * Scenario C:
   *
   * +---------------------------+
   * |                           |
   * |           Segment         |
   * |                           |
   * |  +-----------------+      |
   * |  |                 |      |
   *    |   New Group     |
   *    v                 v
   * .....+--------+--------+....
   *      |        |        |
   *      | Old Gp | Old Gp |
   *      |        |        |
   * .....+--------+--------+....
   *
   * Scenario D:
   *
   * ----------------------+------------------
   *                       |
   *       Segment         |
   *                       |
   *                +-----------+
   *                |           |
   *                | New Group |
   *                v           v
   * .........................+-----------+...
   *                          |           |
   *                          | Old Group |
   *                          |           |
   * .........................+-----------+...
   *
   * When updating anything in a segment we set the "needsUpdate" flag to true.
   * When inspecting a segment we * MUST * check this value first to see if it
   * needs to be updated, otherwise properties such as "keyframes" might be
   * incorrect.
   *
   * @param {!number} timestamp The timestamp.
   * @param {!number} timescale The timescale.
   * @param {!number} duration The duration.
   * @param {!boolean} keyframe True if it is a key frame, otherwise false.
   * @param {!number} level The rendition level.
   * @param {!number[]} pssData The LCEVC data.
   * @param {!number} container container format.
   * @returns {Result}
   * @memberof ResidualStore
   * @public
   */
  _addData(timestamp, timescale, duration, keyframe, level, pssData, container) {
    let frameRate = timescale / (duration || this.#defaultDuration);
    if (container) {
      frameRate = (timescale * 10) / (duration * 10 || this.#defaultDuration);
    }
    const endtime = timestamp + Math.min(1 / frameRate, this.#segmentSize);

    if (this.#removeOnReceive) {
      this.#clearOldFrames(timestamp);
      this.#removeOnReceive = false;
    }

    // Get segment.
    const segmentIndex = Math.floor(timestamp / this.#segmentSize);
    let segment = this.#segments[segmentIndex];
    if (!segment) {
      segment = new TimeSegment(segmentIndex, this.#segmentSize);
      this.#segments[segmentIndex] = segment;
    }

    // Get group.
    const groupIndex = ResidualStore.#groupIndexFromTime(timestamp);
    let group = segment.groups[groupIndex];
    if (!group) {
      group = new TimeGroup();

      // Insert in correct position (numerically sorted).
      const position = _binaryPositionSearch(segment.groupKeys, groupIndex);
      segment.groupKeys.splice(position, 0, groupIndex);
      segment.groups[groupIndex] = group;
    }

    // Set group data.
    group.index = groupIndex;
    group.frameRate = frameRate;
    group.startTime = timestamp;
    group.endTime = endtime;
    group.keyframe = keyframe;
    group.level = level;
    group.pssData = pssData;

    segment.needsUpdate = true;
    if (keyframe && this.#firstKeyframe === null) {
      this.#lcevcDec.controls._checkIsLive(timestamp);

      this.#firstKeyframe = groupIndex === 0 ? 0.01 : groupIndex;
      // Offset all residuals by the PTS of the first keyframe, max 2 seconds
      if (this.#lcevcDec.isLive) {
        this.#lcevcDec.setFirstKeyframeOffset(this.#firstKeyframe);
      } else {
        this.#lcevcDec.setFirstKeyframeOffset(this.#firstKeyframe < 2 ? this.#firstKeyframe : 0.01);
      }
    }

    // Maintain integrity of overlapping groups and segments.
    const groupIndexPos = segment.groupKeys.indexOf(groupIndex);

    if (groupIndexPos > 0) { // Previous value exists in this segment.
      // Scenario A (see diagram).
      const indexPrev = segment.groupKeys[groupIndexPos - 1];
      const groupPrev = segment.groups[indexPrev];
      if (groupPrev && groupPrev.endTime > group.startTime) {
        groupPrev.endTime = group.startTime;
      }
    } else { // Check last value in previous segment.
      // Scenario B (see diagram).
      const segmentPrev = this.#segments[segmentIndex - 1];
      if (segmentPrev && segmentPrev.groupKeys.length > 0) {
        const indexPrev = segmentPrev.groupKeys[segmentPrev.groupKeys.length - 1];
        const groupPrev = segmentPrev.groups[indexPrev];
        if (groupPrev && groupPrev.endTime > group.startTime) {
          groupPrev.endTime = group.startTime;
          segmentPrev.needsUpdate = true;
        }
      }
    }

    // Scenario C (see diagram)
    let groupIndexPosNext = groupIndexPos + 1;
    let indexNext = segment.groupKeys[groupIndexPosNext];
    let groupNext = segment.groups[indexNext];
    while (groupNext && groupNext.startTime < group.endTime) {
      // Erase group. Add back later if not completely overlapped.
      segment.groupKeys.splice(groupIndexPosNext, 1);
      delete segment.groups[indexNext];

      // Part of group is still visible.
      if (groupNext.endTime > group.endTime) {
        // Adjust start time of next group.
        groupNext.startTime = group.endTime;
        groupNext.index = ResidualStore.#groupIndexFromTime(groupNext.startTime);

        // Check if group has overspilled into following segment.
        if (groupNext.startTime > segment.endTime) {
          // Move group into next segment.
          const segmentNextIndex = Math.floor(groupNext.startTime / this.#segmentSize);
          let segmentNext = this.#segments[segmentNextIndex];
          if (!segmentNext) {
            segmentNext = new TimeSegment(segmentNextIndex, this.#segmentSize);
            this.#segments[segmentNextIndex] = segmentNext;
          }
          if (!segmentNext.groups[groupNext.index]) {
            // Insert in correct position (numerically sorted).
            const position = _binaryPositionSearch(segmentNext.groupKeys, groupNext.index);
            segmentNext.groupKeys.splice(position, 0, groupNext.index);
            segmentNext.groups[groupNext.index] = groupNext;
          }
          segmentNext.needsUpdate = true;
        } else if (!segment.groups[groupNext.index]) {
          // Amend key in this segment (ignore if key already exists).
          segment.groupKeys.splice(groupIndexPosNext, 0, groupNext.index);
          segment.groups[groupNext.index] = groupNext;

          groupIndexPosNext += 1;
        }
      }

      // Check next in line.
      indexNext = segment.groupKeys[groupIndexPosNext];
      groupNext = segment.groups[indexNext];
    }

    // Scenario D (see diagram).
    if (group.endTime > segment.endTime) { // Check groups in next segment for overlaps.
      const segmentNext = this.#segments[segmentIndex + 1];
      if (segmentNext) {
        indexNext = segmentNext.groupKeys[0]; // eslint-disable-line
        groupNext = segmentNext.groups[indexNext];
        while (groupNext && groupNext.startTime < group.endTime) {
          if (group.endTime > groupNext.endTime) {
            // Erase next group because it is fully covered by current group.
            segmentNext.groupKeys.splice(0, 1);
            delete segmentNext.groups[indexNext];
          } else {
            // Adjust start time of next group.
            groupNext.startTime = group.endTime;
            groupNext.index = ResidualStore.#groupIndexFromTime(groupNext.startTime);

            // Update key.
            delete segmentNext.groups[indexNext];
            if (!segmentNext.groups[groupNext.index]) {
              segmentNext.groupKeys[0] = groupNext.index;
              segmentNext.groups[groupNext.index] = groupNext;
            }
          }
          segmentNext.needsUpdate = true;

          // Check next in line.
          indexNext = segmentNext.groupKeys[0]; // eslint-disable-line
          groupNext = segmentNext.groups[indexNext];
        }
      }
    }

    return Result.OK;
  }

  /**
   * Updates a TimeSegment.
   *
   * Updates the keyframes with the current keyframes of the segment.
   * Clean and fix broken segments references.
   *
   * @static
   * @param {!TimeSegment} segment The TimeSegment to update.
   * @returns {Result}
   * @memberof ResidualStore
   * @private
   */
  static #updateSegment(segment) {
    segment.needsUpdate = false; // eslint-disable-line

    // Update keyframes.
    segment.keyframes = []; // eslint-disable-line
    for (let i = 0; i < segment.groupKeys.length; i += 1) {
      const groupKey = segment.groupKeys[i];
      const group = segment.groups[groupKey];

      // Clean broken segment references.
      if (!group) {
        Log.debug('Group not found. Fixing broken segment');
        segment.groupKeys.splice(i, 1);
        delete segment.groups[groupKey]; // eslint-disable-line
        i -= 1;
        continue; // eslint-disable-line
      }

      // Restore self index.
      group.index = groupKey;

      // Register keyframe with segment.
      if (group.keyframe) {
        segment.keyframes.push(groupKey);
      }
    }

    return Result.OK;
  }

  /**
   * Get a TimeSegment from an index.
   *
   * @param {!number} segmentIndex The index of the segment or `null` if any.
   * @returns {TimeSegment} The TimeSegment.
   * @memberof ResidualStore
   * @public
   */
  _getSegment(segmentIndex) {
    if (Number.isNaN(segmentIndex)) return null;

    const segment = this.#segments[segmentIndex];
    if (!segment) return null;

    if (segment.needsUpdate) ResidualStore.#updateSegment(segment);

    return segment;
  }

  /**
   * Get a TimeGroup from a timestamp.
   *
   * Calculate the segment index from the timestamp. Find the TimeGroup in the
   * TimeSegment of the calculates index and return it.
   *
   * @param {!number} timestamp The timestamp.
   * @param {!boolean} isKey The timestamp.
   * @returns {TimeGroup} The TimeGroup or `null` if any.
   * @memberof ResidualStore
   * @public
   */
  _getGroup(timestamp, isKey = false) {
    // Get segment.
    const segmentIndex = Math.floor(timestamp / this.#segmentSize);
    let segment = this._getSegment(segmentIndex);
    if (!segment) { // No segment. Try previous segment.
      segment = this._getSegment(segmentIndex - 1);
      if (!segment) return null;
    }

    // Get group index.
    const timeindex = ResidualStore.#groupIndexFromTime(timestamp);
    // There was a -1 to the group index here for some reason which was causing a mismatch
    // in the keyframe timestamp that was being delivered.
    let groupIndex = _binaryPositionSearch(segment.groupKeys, timeindex) - 1;

    // In some cases the correct residual may be in the previous segment. If binary search
    // returned -1 (residual not found), check previous segment.
    if (groupIndex === -1 && segmentIndex > 1) {
      segment = this._getSegment(segmentIndex - 1);
      if (!segment) return null;
      groupIndex = _binaryPositionSearch(segment.groupKeys, timeindex) - 1;
      const group = this._getKeyFrameGroup(segment, groupIndex);
      if (!group) return null;
      return group;
    }

    groupIndex = groupIndex === -1 ? 0 : groupIndex;

    // Get group.
    let group = this._getKeyFrameGroup(segment, groupIndex);

    if (isKey && group && !group.keyframe) {
      group = this._getKeyFrameGroup(segment, groupIndex + 1);
    }
    if (!group) return null;

    return group;
  }

  /**
   * Get the nearest keyframe within segment range.
   *
   * If segments are divided into seconds, then this will look back a number
   * of seconds to find a keyframe. Do not confuse "range" here with a list of
   * groups or frames.
   *
   * @param {!TimeSegment} segment The timestamp.
   * @param {!number} groupIndex The segment range.
   * @returns {?TimeGroup} The TimeSegment or `null` if any.
   * @memberof ResidualStore
   * @public
   */
  _getKeyFrameGroup(segment, groupIndex) {
    const groupKey = segment.groupKeys[groupIndex];
    const group = segment.groups[groupKey];

    if (!group) return this.#default;

    return group;
  }

  /**
   * Get the nearest keyframe within segment range.
   *
   * If segments are divided into seconds, then this will look back a number
   * of seconds to find a keyframe. Do not confuse "range" here with a list of
   * groups or frames.
   *
   * @param {!number} timestamp The timestamp.
   * @param {!number} segmentRange The segment range.
   * @returns {?TimeSegment} The TimeSegment or `null` if any.
   * @memberof ResidualStore
   * @public
   */
  _getKeyframe(timestamp, segmentRange) {
    const segmentIndexStart = Math.floor(timestamp / this.#segmentSize);
    const timeindex = ResidualStore.#groupIndexFromTime(timestamp);

    // Search #segments.
    for (let i = 0; i <= segmentRange; i += 1) {
      // Get segment.
      const segmentIndex = segmentIndexStart - i;
      const segment = this._getSegment(segmentIndex);

      // Check keyframes.
      if (segment && segment.keyframes.length > 0) {
        let groupIndex = _binaryPositionSearch(segment.keyframes, timeindex) - 1;
        if (groupIndex === -1 && segment.groupKeys[groupIndex + 1] >= timeindex) {
          groupIndex = 0;
        }
        if (groupIndex > -1) {
          const groupKey = segment.keyframes[groupIndex];
          return ResidualStore.#timeFromGroupIndex(groupKey);
        }
      }
    }

    // Not found
    return null;
  }

  /**
   * Get a list of N groups before this group.
   *
   * @param {!TimeGroup} group The base TimeGroup.
   * @param {!number} groupRange The range.
   * @returns {TimeSegment}
   * @memberof ResidualStore
   * @public
   */
  _getPreviousGroups(group, groupRange) {
    const tempgroups = [];

    let segmentIndex = Math.floor(group.startTime / this.#segmentSize);
    let segment = this._getSegment(segmentIndex);
    if (!segment) return null;

    let i = segment.groupKeys.indexOf(group.index);
    let k = groupRange + 1;
    while (tempgroups.length < groupRange && k > 0) {
      i -= 1;
      if (i < 0) {
        segmentIndex -= 1;
        segment = this._getSegment(segmentIndex);
        if (segment) i = segment.groupKeys.length - 1;
      }
      if (segment) tempgroups.push(segment.groups[segment.groupKeys[i]]);
      k -= 1;
    }

    return tempgroups;
  }

  /**
   * Get the next group along (unless the gap is > than 1 segment).
   *
   * @param {TimeGroup} group The base TimeGroup.
   * @returns {TimeGroup} The next TimeGroup.
   * @memberof ResidualStore
   * @public
   */
  _getNextGroup(group) {
    let segmentIndex = Math.floor(group.startTime / this.#segmentSize);
    let segment = this._getSegment(segmentIndex);
    if (!segment) return null;

    // Get next group along.
    let groupNext = null;
    let i = segment.groupKeys.indexOf(group.index);
    i += 1;

    if (i < segment.groupKeys.length) {
      groupNext = segment.groups[segment.groupKeys[i]];
    } else {
      segmentIndex += 1;
      segment = this._getSegment(segmentIndex);
      if (!segment) return null;

      if (segment.groupKeys.length > 0) {
        groupNext = segment.groups[segment.groupKeys[0]];
      }
    }

    return groupNext;
  }

  /**
   * Check if the timestamp has LCEVC data.
   *
   * @param {!number} timestamp The timestamp.
   * @returns {boolean} `true` if it has LCEVC data, otherwise `false`.
   * @memberof ResidualStore
   */
  _hasLcevcData(timestamp) {
    const group = this._getGroup(timestamp);
    return group && timestamp >= group.startTime && timestamp <= group.endTime;
  }

  /**
   * Timestamp to number.
   *
   * Can be used to convert a timestamp from seconds into some other number such
   * as 60ths of a second, or anything that you want to snap the values to.
   *
   * Currently it just returns time, therefore allowing arbitrarilly precise
   * time divisions for frames.
   *
   * @param {!number} timestamp The timestamp.
   * @returns {number}
   * @memberof ResidualStore
   * @static
   * @private
   */
  static #groupIndexFromTime(timestamp) {
    const timeindex = timestamp;
    return timeindex;
  }

  /**
   * TimeGroup index to timestamp.
   *
   * As #groupIndexFromTime, convert the index of a TimeGroup to timestamp.
   *
   * Currently it just returns the index of the TimeGroup.
   *
   * @param {!number} timeindex The TimeGroup index.
   * @returns {!number} The timestamp.
   * @memberof ResidualStore
   * @static
   * @private
   */
  static #timeFromGroupIndex(timeindex) {
    const timestamp = timeindex;
    return timestamp;
  }
}

export default ResidualStore;
