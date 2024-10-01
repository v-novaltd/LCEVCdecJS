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
 * Search the value in the container using the binary search approach.
 *
 * Complexity:
 * Half the size of the container in the best case and lineal in the worst case.
 *
 * @param {any[]} container
 * @param {any} value
 * @returns {number} The position of the value if found, otherwise 0.
 * @public
 */
// eslint-disable-next-line
export function _binaryPositionSearch(container: any[], value: any): number {
  let startIndex = 0;
  let endIndex = container.length - 1;
  while (startIndex <= endIndex) {
    const middleIndex = ~~((startIndex + endIndex) / 2);
    if (value === container[middleIndex]) {
      return middleIndex;
    }
    if (value > container[middleIndex]) {
      startIndex = middleIndex + 1;
    } else if (value < container[middleIndex]) {
      endIndex = middleIndex - 1;
    }
  }

  return startIndex;
}
