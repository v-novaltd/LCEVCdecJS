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
