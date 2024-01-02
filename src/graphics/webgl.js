/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

/**
 * @module webgl
 */

import { Log } from '../log.ts';
import { shadersrc, shaderNames } from '../shaders/shaders_src';
import { Result } from '../globals/enums';

let shaderPrecisionFloat = 'highp';

/**
 * Check the shader precision as older mobile devices are not guaranteed to have
 * highp precision support.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @public
 */
function _checkShaderPrecision(gl) {
  let precision = 'highp';

  let glShaderPrecisionFormat = gl.getShaderPrecisionFormat(
    gl.FRAGMENT_SHADER,
    gl.HIGH_FLOAT
  );

  if (!glShaderPrecisionFormat.precision) {
    precision = 'mediump';

    glShaderPrecisionFormat = gl.getShaderPrecisionFormat(
      gl.FRAGMENT_SHADER,
      gl.MEDIUM_FLOAT
    );

    if (!glShaderPrecisionFormat.precision) {
      precision = 'lowp';
    }
  }

  shaderPrecisionFloat = precision;
}

/**
 * Replace `##float_precision##` and `##video_function##` with the right
 * info of the given shader source.
 *
 * @param {!string} src The shader source.
 * @returns {string} The shader with the replaced values.
 * @public
 */
function _replaceShaderConstants(src) {
  // eslint-disable-next-line
  src = src.replace(/##float_precision##/g, shaderPrecisionFloat);
  // eslint-disable-next-line
  src = src.replace(/##video_functions##/g, shadersrc[shaderNames.video_functions]);

  return src;
}

/**
 * Compiles the shader.
 *
 * @param {!WebGLRenderingContext} gl The WebGL context.
 * @param {!string} shaderName The shader name.
 * @param {!string} shaderSource The shader source.
 * @param {!number} shaderType The shader type.
 * @returns {?WebGLShader} The compiled shader.
 * @public
 */
function _compileShader(gl, shaderName, shaderSource, shaderType) {
  const shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    Log.error('Problem compiling shader.');
    const message = gl.getShaderInfoLog(shader);
    if (message.length > 0) {
      Log.error(`ShaderInfoLog: ${message}`);
      Log.error('src', shaderSource);
      if (message.indexOf('ERROR') !== -1) {
        throw new TypeError(`COMPILE ERROR (${shaderName})`);
      }
    }
    return null;
  }

  return shader;
}

/**
 *
 * @typedef {object} ShaderObj
 * @property {string} name
 * @property {WebGLShader} vertShader
 * @property {WebGLShader} shaderFrag
 * @property {number[]} uniforms
 * @property {WebGLUniformLocation[]} attributes
 */
/**
 * Create and compile shader program.
 *
 * @param {!WebGLRenderingContext} gl The WebGL context.
 * @param {!string} vertstr The vertex shader name.
 * @param {!string} fragstr The fragment shader name.
 * @param {!string} attributes The attributes.
 * @param {!string} uniforms The uniforms.
 * @returns {ShaderObj} The shader object.
 * @public
 */
function _createShader(gl, vertstr, fragstr, attributes, uniforms) {
  const srcVert = _replaceShaderConstants(shadersrc[vertstr]);
  const srcFrag = _replaceShaderConstants(shadersrc[fragstr]);

  // Compile shaders.
  const shaderVert = _compileShader(gl, vertstr, srcVert, gl.VERTEX_SHADER);
  const shaderFrag = _compileShader(gl, fragstr, srcFrag, gl.FRAGMENT_SHADER);

  // Attach shaders to program.
  const program = gl.createProgram();
  gl.attachShader(program, shaderVert);
  gl.attachShader(program, shaderFrag);

  // Check for errors.
  const error = gl.getError();
  let msg = '';
  switch (error) {
    case gl.INVALID_ENUM:
      msg = 'INVALID_ENUM. An unacceptable value has been specified for an enumerated argument. '
        + 'The command is ignored and the error flag is set.';
      break;
    case gl.INVALID_VALUE:
      msg = 'INVALID_VALUE. A numeric argument is out of range. The command is ignored and the '
        + 'error flag is set.';
      break;
    case gl.INVALID_OPERATION:
      msg = 'INVALID_OPERATION. The specified command is not allowed for the current state. '
        + 'The command is ignored and the error flag is set.';
      break;
    case gl.INVALID_FRAMEBUFFER_OPERATION:
      msg = 'INVALID_FRAMEBUFFER_OPERATION. The currently bound framebuffer is not framebuffer '
        + 'complete when trying to render to or to read from it.';
      break;
    case gl.OUT_OF_MEMORY:
      msg = 'OUT_OF_MEMORY. Not enough memory is left to execute the command.';
      break;
    case gl.CONTEXT_LOST_WEBGL:
      msg = 'CONTEXT_LOST_WEBGL.';
      break;
    default:
      break;
  }
  if (msg) {
    Log.error(`ERROR in program "${fragstr}" : ${msg}`);
  }

  // Link and check errors.
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    Log.error(`ERROR linking program "${fragstr}"`);
    throw new Error('WEBGL LINK ERROR');
  }

  // Store.
  const res = {
    program,
    name: fragstr,
    vertShader: shaderVert,
    fragShader: shaderFrag,
    uniforms: {},
    attributes: {}
  };

  // Add uniforms to object
  attributes.forEach((attribute) => {
    res.attributes[attribute] = gl.getAttribLocation(program, attribute);
  });

  uniforms.forEach((uniform) => {
    res.uniforms[uniform] = gl.getUniformLocation(program, uniform);
  });

  return res;
}

/**
 * Deletes a shader object.
 *
 * @param {!WebGLRenderingContext} gl The WebGL context.
 * @param {!WebGLShader} shader The shader object.
 * @returns {Result} The status code.
 * @public
 */
function _deleteShader(gl, shader) {
  if (shader && shader.program) {
    gl.detachShader(shader.program, shader.vertShader);
    gl.detachShader(shader.program, shader.fragShader);
    gl.deleteShader(shader.vertShader);
    gl.deleteShader(shader.fragShader);
  }

  return Result.OK;
}

/**
 *
 * @typedef {object} FBO
 * @property {number} width
 * @property {number} height
 * @property {WebGLTexture} texture
 * @property {WebGLFramebuffer} framebuffer
 */
/**
 * Creates a FBO object.
 *
 * @param {!WebGLRenderingContext} gl The WebGL context.
 * @param {!number} width The width of the FBO.
 * @param {!number} height The height of the FBO.
 * @param {!number} filter The filter name.
 * @returns {FBO} The FBO.
 * @public
 */
function _createFBO(gl, width, height, filter) {
  if (!(width > 0 && height > 0)) {
    Log.error(`ERROR framebuffer texture dimensions are invalid. ${width} x ${height}`);
  }

  // Create texture.
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set initial texture that will be attached to framebuffer.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create framebuffer.
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  // Check for errors.
  const error = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  switch (error) {
    case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
      Log.error('gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: The attachment types are mismatched '
      + 'or not all framebuffer attachment points are framebuffer attachment complete.');
      break;
    case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
      Log.error('gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: There is no attachment.');
      break;
    case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
      Log.error('gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: Height and width of the attachment '
      + 'are not the same.');
      break;
    case gl.FRAMEBUFFER_UNSUPPORTED:
      Log.error('gl.FRAMEBUFFER_UNSUPPORTED: The format of the attachment is not supported or if '
      + 'depth and stencil attachments are not the same renderbuffer.');
      break;
    default:
      break;
  }

  // Reset state.
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return {
    width,
    height,
    texture,
    framebuffer
  };
}

/**
 * Deletes a FBO object.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {WebGLFramebuffer} framebufferObject The FBO.
 * @returns {Result} The status code.
 * @public
 */
function _deleteFBO(gl, framebufferObject) {
  gl.deleteTexture(framebufferObject.texture);
  gl.deleteFramebuffer(framebufferObject.framebuffer);
  return Result.OK;
}

/**
 * Creates a WebGLTexture.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @returns {WebGLTexture} The texture.
 * @public
 */
function _createTexture(gl) {
  const newTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, newTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return newTexture;
}

/**
 * Creates a lineal WebGLTexture.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @returns {WebGLTexture} The texture.
 * @public
 */
function _createTextureLinear(gl) {
  const newTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, newTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return newTexture;
}

/**
 * Deletes a WebGLTexture.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {WebGLTexture} texture The texture.
 * @returns {Result} The status code.
 * @public
 */
function _deleteTexture(gl, texture) {
  gl.deleteTexture(texture);
  return Result.OK;
}

/**
 * Creates a WebGLBuffer.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {BufferSource} data The Buffer source.
 * @returns {WebGLBuffer} The buffer.
 * @public
 */
function _createBuffer(gl, data) {
  const buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    data instanceof Float32Array ? data : new Float32Array(data),
    gl.STATIC_DRAW
  );

  return buffer;
}

/**
 * Deletes a WebGLBuffer.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {WebGLBuffer} buffer The buffer.
 * @returns {Result} The status code.
 * @public
 */
function _deleteBuffer(gl, buffer) {
  gl.deleteBuffer(buffer);
  return Result.OK;
}

/**
 *
 * @typedef {object} BDO
 * @property {WebGLBuffer} buffer
 * @property {Float32Array} array
 */
/**
 * Creates a BDO object.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {Float32Array} data The data array.
 * @returns {BDO} The BDO object.
 * @public
 */
function _createBDO(gl, data) {
  const buffer = gl.createBuffer();
  const array = data instanceof Float32Array ? data : new Float32Array(data);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

  return {
    buffer,
    array
  };
}

/**
 * Deletes a BDO object.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {WebGLBuffer} bufferDataObject The BDO.
 * @returns {Result} The status code.
 * @public
 */
function _deleteBDO(gl, bufferDataObject) {
  gl.deleteBuffer(bufferDataObject.buffer);
  bufferDataObject.array = null; // eslint-disable-line
  return Result.OK;
}

/**
 * Use a shader program.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {WebGLProgram} shaderObj The shader object.
 * @returns {Result} The status code.
 * @public
 */
function _useProgramAndLog(gl, shaderObj) {
  gl.useProgram(shaderObj.program);
  return Result.OK;
}

export {
  _checkShaderPrecision,
  _compileShader,
  _createBDO,
  _createFBO,
  _createShader,
  _createTexture,
  _createTextureLinear,
  _deleteBDO,
  _deleteFBO,
  _deleteShader,
  _deleteTexture,
  _deleteBuffer,
  _replaceShaderConstants,
  _createBuffer,
  _useProgramAndLog
};
