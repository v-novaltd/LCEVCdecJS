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

import { Log } from '../log.ts';

class DataViewReader {
  /** @private @type {DataView} */
  #dataView = null;

  /** @private @type {boolean} */
  #endian = false;

  /** @private @type {number} */
  #position = 0;

  /**
   * Creates an instance of DataViewReader.
   *
   * @param {!!ArrayBuffer} arrayBuffer
   * @param {!!boolean} endian If false or undefined, a big-endian value is read
   * @memberof DataViewReader
   */
  constructor(arrayBuffer, endian) {
    this.#dataView = new DataView(arrayBuffer);
    /* true if little endian */
    if (!endian) {
      this.#endian = false;
    } else {
      this.#endian = true;
    }
  }

  /**
   * @returns {boolean}
   */
  hasMoreData() {
    return this.#position < this.#dataView.byteLength;
  }

  resetPosition() {
    this.#position = 0;
  }

  /**
   * @param {!number} position
   */
  setPosition(position) {
    if (position >= 0 && position < this.#dataView.byteLength) {
      this.#position = position;
    } else {
      Log.error(`The given position, ${position}, is out of range`);
    }
  }

  /**
   * @returns {number}
   */
  getPosition() {
    return this.#position;
  }

  /**
   * @returns {number}
   */
  getLength() {
    return this.#dataView.byteLength;
  }

  /**
   * @returns {number}
   */
  readInt8() {
    let value;
    try {
      value = this.#dataView.getInt8(this.#position);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 1;
    return value;
  }

  /**
   * @returns {number}
   */
  readInt16() {
    let value;
    try {
      value = this.#dataView.getInt16(this.#position, this.#endian);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 2;
    return value;
  }

  /**
   * @returns {number}
   */
  readInt32() {
    let value;
    try {
      value = this.#dataView.getInt32(this.#position, this.#endian);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 4;
    return value;
  }

  /**
   * @returns {number}
   */
  readInt64() {
    const value = this.readInt32(this.#position, this.#endian) * (2 ** 32)
    + this.readUint32(this.#position, this.#endian);

    return value;
  }

  /**
   * @returns {number}
   */
  readUint8() {
    let value;
    try {
      value = this.#dataView.getUint8(this.#position);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 1;
    return value;
  }

  /**
   * @returns {number}
   */
  readUint16() {
    let value;
    try {
      value = this.#dataView.getUint16(this.#position, this.#endian);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 2;
    return value;
  }

  /**
   * @returns {number}
   */
  readUint32() {
    let value;
    try {
      value = this.#dataView.getUint32(this.#position, this.#endian);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 4;
    return value;
  }

  /**
   * @returns {number}
   */
  readUint64() {
    // Split 64-bit number into two 32-bit (4-byte) parts.
    const left = this.#dataView.getUint32(this.#position, this.#endian);
    const right = this.#dataView.getUint32(this.#position + 4, this.#endian);

    // Combine the two 32-bit values.
    const pow32 = 2 ** 32;
    let combined = this.#endian ? left + pow32 * right : pow32 * left + right;

    if (!Number.isSafeInteger(combined)) {
      Log.warn(`${combined} exceeds MAX_SAFE_INTEGER. Value set to 0`);
      combined = 0;
    }

    this.#position += 8;

    return combined;
  }

  /**
   * @param {!number} bytes
   * @returns {Array}
   */
  readBytes(bytes) {
    if (this.#position + bytes > this.#dataView.byteLength) {
      Log.error('Read out of bounds');
    }

    const value = new Uint8Array(
      this.#dataView.buffer,
      this.#dataView.byteOffset + this.#position,
      bytes
    );
    this.#position += bytes;
    return new Uint8Array(value);
  }

  /**
   * @param {!number} value
   */
  writeInt8(value) {
    try {
      this.#dataView.setInt8(this.#position, value);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 1;
  }

  /**
   * @param {!number} value
   */
  writeInt16(value) {
    try {
      this.#dataView.setInt16(this.#position, value, this.#endian);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 2;
  }

  /**
   * @param {!number} value
   */
  writeInt32(value) {
    try {
      this.#dataView.setInt32(this.#position, value, this.#endian);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 4;
  }

  /**
   * @param {!number} value
   */
  writeUint8(value) {
    try {
      this.#dataView.setUint8(this.#position, value);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 1;
  }

  /**
   * @param {!!number} value
   */
  writeUint16(value) {
    try {
      this.#dataView.setUint16(this.#position, value, this.#endian);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 2;
  }

  /**
   * @param {!!number} value
   */
  writeUint32(value) {
    try {
      this.#dataView.setUint32(this.#position, value, this.#endian);
    } catch (exception) {
      Log.error(exception);
    }
    this.#position += 4;
  }

  /**
   * @param {!!number} bytes
   */
  skip(bytes) {
    if (this.#position + bytes > this.#dataView.byteLength) {
      Log.error(`Skip out of bounds ${this.#position} ${bytes}`);
    }
    this.#position += bytes;
  }

  /**
   * @param {!!number} bytes
   */
  rewind(bytes) {
    if (this.#position < bytes) {
      Log.error('Rewind out of bounds');
    }
    this.#position -= bytes;
  }
}

export default DataViewReader;
