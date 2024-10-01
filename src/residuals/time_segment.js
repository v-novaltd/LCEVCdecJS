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
