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
 * The profile class holds the information of a colorspace profile.
 *
 * @class Profile
 */
class Profile {
  /**
   * Creates an instance of Profile.
   *
   * @param {!number[3]} offset The color offset.
   * @param {!number[9]} matrix The RGB to YUV values.
   * @memberof Profile
   */
  constructor(offset, matrix) {
    /** @type {number} */
    this.offset = offset;

    /** @type {number[]} */
    this.matrix = matrix;

    /** @type {number[]} */
    this.matrixInverse = Profile.#invertMatrix(matrix);

    // GL values for uniforms in shaders.

    /** @type {Float32Array} */
    this.glMatrix = new Float32Array(16);

    /** @type {Float32Array} */
    this.glMatrixInverse = new Float32Array(16);

    this.glMatrix[0] = matrix[0]; // 0,0
    this.glMatrix[4] = matrix[1]; // 1,0
    this.glMatrix[8] = matrix[2]; // 2,0

    this.glMatrix[1] = matrix[3]; // 0,1
    this.glMatrix[5] = matrix[4]; // 1,1
    this.glMatrix[9] = matrix[5]; // 2,1

    this.glMatrix[2] = matrix[6]; // 0,2
    this.glMatrix[6] = matrix[7]; // 1,2
    this.glMatrix[10] = matrix[8]; // 2,2

    this.glMatrix[12] = offset[0]; // 3,0
    this.glMatrix[13] = offset[1]; // 3,1
    this.glMatrix[14] = offset[2]; // 3,2

    this.glMatrixInverse[0] = this.matrixInverse[0]; // 0,0
    this.glMatrixInverse[4] = this.matrixInverse[1]; // 1,0
    this.glMatrixInverse[8] = this.matrixInverse[2]; // 2,0

    this.glMatrixInverse[1] = this.matrixInverse[3]; // 0,1
    this.glMatrixInverse[5] = this.matrixInverse[4]; // 1,1
    this.glMatrixInverse[9] = this.matrixInverse[5]; // 2,1

    this.glMatrixInverse[2] = this.matrixInverse[6]; // 0,2
    this.glMatrixInverse[6] = this.matrixInverse[7]; // 1,2
    this.glMatrixInverse[10] = this.matrixInverse[8]; // 2,2

    this.glMatrixInverse[12] = offset[0]; // 3,0
    this.glMatrixInverse[13] = offset[1]; // 3,1
    this.glMatrixInverse[14] = offset[2]; // 3,2
  }

  /**
   * Inverts a matrix of numbers.
   *
   * @param {number[]} a The matrix.
   * @returns {number[]} The inverted matrix.
   * @private
   */
  static #invertMatrix(a) {
    const a00 = a[0]; const a01 = a[1]; const
      a02 = a[2];
    const a10 = a[3]; const a11 = a[4]; const
      a12 = a[5];
    const a20 = a[6]; const a21 = a[7]; const
      a22 = a[8];

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    // Calculate determinant.
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) return null;
    det = 1.0 / det;

    const out = [];
    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;

    return out;
  }
}

export default Profile;
