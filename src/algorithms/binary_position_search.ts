/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

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
    } if (value > container[middleIndex]) {
      startIndex = middleIndex + 1;
    } else if (value < container[middleIndex]) {
      endIndex = middleIndex - 1;
    }
  }

  return startIndex;
}
