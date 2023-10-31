/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

import { Result } from '../globals/enums';

const VERTS_PER_QUAD = 6;
const FLOATS_PER_VERT = 2;

/**
 * The TimeRangeData class represent the timeline of the video.
 *
 * Given a WebGL context, the start and end and the buffered data of the video,
 * it will render a timebar and using the next colours to specify the type of
 * data it is in there:
 *  - Light grey: Buffered data.
 *  - Dark grey: Un-buffered data.
 *
 * @class TimeRangeData
 */
class TimeRangeData {
  /** @private @type {number} */
  #regionCountMax = 50;

  /** @private @type {number} */
  #regionCount = 0;

  /** @private @type {number} */
  #time0 = 0;

  /** @private @type {number} */
  #time1 = 0;

  /** @private @type {WebGLBuffer} */
  #glBuffer = null;

  /** @private @type {number} */
  #geometryBytes = null;

  /** @private @type {boolean} */
  #glNeedsUpdate = false;

  get regionCount() {
    return this.#regionCount;
  }

  /**
   * Creates an instance of TimeRangeData.
   *
   * @param {WebGLRenderingContext} gl
   * @memberof TimeRangeData
   */
  constructor(gl) {
    // Create gl buffer.
    this.#glBuffer = gl.createBuffer();

    // Create memory for quads.
    this.#geometryBytes = new Float32Array(this.#regionCountMax * VERTS_PER_QUAD * FLOATS_PER_VERT);

    // Upload empty buffer data.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#glBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.#geometryBytes, gl.DYNAMIC_DRAW);

    return Result.OK;
  }

  /**
   * Deletes the WebGL buffer and remove the geometry.
   *
   * @param {!WebGLRenderingContext} gl
   * @returns {Result} The result code.
   * @memberof TimeRangeData
   * @public
   */
  _close(gl) {
    gl.deleteBuffer(this.#glBuffer);
    this.#geometryBytes = null;
    return Result.OK;
  }

  /**
   * Updates the timebar with the given buffered time ranges.
   *
   * @param {!TimeRangeData} timeRanges The buffered time ranges.
   * @returns {Result} The result code.
   * @memberof TimeRangeData
   * @public
   */
  _update(timeRanges) {
    if (timeRanges.length > 0) {
      this.#time0 = timeRanges.start(0);
      this.#time1 = timeRanges.end(0);

      const endRange = timeRanges.length;
      const startRange = Math.max(0, endRange - this.#regionCountMax);

      const arr = this.#geometryBytes;
      for (let r = startRange; r < endRange; r += 1) {
        const t0 = timeRanges.start(r);
        const t1 = timeRanges.end(r);

        this.#time0 = Math.min(t0, this.#time0);
        this.#time1 = Math.max(t1, this.#time1);

        const i = r * VERTS_PER_QUAD * FLOATS_PER_VERT;

        // ABC.
        arr[i + 0] = 0;
        arr[i + 1] = t0;
        arr[i + 2] = 1;
        arr[i + 3] = t1;
        arr[i + 4] = 2;
        arr[i + 5] = t0;

        // DCB.
        arr[i + 6] = 3;
        arr[i + 7] = t1;
        arr[i + 8] = 2;
        arr[i + 9] = t0;
        arr[i + 10] = 1;
        arr[i + 11] = t1;
      }

      this.#regionCount = endRange - startRange;
    } else {
      this.#regionCount = 0;
    }

    this.#glNeedsUpdate = true;

    return Result.OK;
  }

  /**
   * Updates the timebar using a duration time.
   *
   * Used to set the end time.
   *
   * @param {!number} duration The duration time.
   * @returns {Result} The result code.
   * @memberof TimeRangeData
   * @public
   */
  _updateFrom(duration) {
    this.#time0 = 0;
    this.#time1 = duration;

    const arr = this.#geometryBytes;

    // ABC.
    arr[0] = 0;
    arr[1] = this.#time0;
    arr[2] = 1;
    arr[3] = this.#time1;
    arr[4] = 2;
    arr[5] = this.#time0;

    // DCB.
    arr[6] = 3;
    arr[7] = this.#time1;
    arr[8] = 2;
    arr[9] = this.#time0;
    arr[10] = 1;
    arr[11] = this.#time1;

    this.#regionCount = 1;

    this.#glNeedsUpdate = true;

    return Result.OK;
  }

  /**
   * Binds the buffer to the WebGL context of the timebar.
   *
   * @param {!WebGLRenderingContext} gl The WebGL context.
   * @param {!number} attribute The attribute.
   * @returns {Result} The result code.
   * @memberof TimeRangeData
   * @public
   */
  _bindBuffer(gl, attribute) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#glBuffer);
    gl.vertexAttribPointer(attribute, FLOATS_PER_VERT, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribute);

    if (this.#glNeedsUpdate) {
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        this.#geometryBytes.subarray(
          0, FLOATS_PER_VERT * VERTS_PER_QUAD * this.#regionCount
        )
      );
      this.#glNeedsUpdate = false;
    }

    return Result.OK;
  }
}

export default TimeRangeData;
