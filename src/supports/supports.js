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

class Supports {
    /** @private @type {Map} */
    #osSupport = true;

    #deviceSupport = true;

    #browserSupport = true;

    #webAssemblySupport = false;

    #webGLSupport = false;

    #mediasourceSupport = true;

    #Error = false;

    #SupportStatus = false;

    #SupportError = '';

    constructor() {
      /** @type {boolean} */
      this.#osSupport = true;

      /** @type {boolean} */
      this.#deviceSupport = true;

      /** @type {boolean} */
      this.#browserSupport = true;

      /** @type {boolean} */
      this.#webAssemblySupport = false;

      /** @type {boolean} */
      this.#webGLSupport = false;

      /** @type {boolean} */
      this.#mediasourceSupport = true;

      /** @type {string} */
      this.#Error = '';
    }

    /**
     *
     * @returns {boolean}
     * @readonly
     * @memberof Supports
     */
    get osSupport() {
      if (Supports.userAgentContains_('Tizen')
        || Supports.userAgentContains_('Web0S')
        || Supports.userAgentContains_('Roku')) {
        this.#osSupport = false;
      }

      return this.#osSupport;
    }

    /**
     *
     * @returns {boolean}
     * @readonly
     * @memberof Supports
     */
    get deviceSupport() {
      return this.#deviceSupport;
    }

    /**
     *
     * @returns {boolean}
     * @readonly
     * @memberof Supports
     */
    get browserSupport() {
      return this.#browserSupport;
    }

    /**
     *
     * @returns {boolean}
     * @readonly
     * @memberof Supports
     */
    webAssemblySupport() {
      try {
        if (typeof WebAssembly === 'object'
            && typeof WebAssembly.instantiate === 'function') {
          const module = new WebAssembly.Module(
            Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
          );
          if (module instanceof WebAssembly.Module) {
            return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
          }
        }
      } catch (e) {
        this.#webAssemblySupport = false;
        this.#Error = 'LCEVC Error: WebAssembly Verification failed is not supported!';
        return this.#webAssemblySupport;
      }
      return this.#webAssemblySupport;
    }

    /**
     *
     * @param {!HTMLMediaElement | !HTMLCanvasElement} canvas Canvas
     * @returns {boolean}
     * @readonly
     * @memberof Supports
     */
    webGLSupport(canvas) {
      try {
        this.#webGLSupport = ((canvas.getContext('webgl')
        || canvas.getContext('experimental-webgl'))
        && !!window.WebGLRenderingContext);
        return this.#webGLSupport;
      } catch (e) {
        this.#Error = 'LCEVC Error: WebAssembly Verification failed is not supported!';
        return this.#webGLSupport;
      }
    }

    /**
     *
     * @returns {boolean}
     * @readonly
     * @memberof Supports
     */
    get mediasourceSupport() {
      // This was put in to make sure that these run in browsers with MSE/MME support.
      // But infact we do not use MSE/MME APIs directly in the library also the scope
      // of the library has extended to non-MSE/non-MME use cases Eg:WebRTC workflow.
      // So the logic for this is removed but kept the function as placeholder
      // if any restrictions come up in the future regarding MSE/MME.
      this.#mediasourceSupport = true;
      return true;
    }

    /**
     *
     * @returns {string}
     * @readonly
     * @memberof Supports
     */
    get Error() {
      return this.#Error;
    }

    /**
     * Set Support Status.
     *
     * @param {boolean} value Support Status.
     * @memberof Supports
     * @public
     */
    set SetSupportStatus(value) {
      this.#SupportStatus = value;
    }

    /**
     * Set Error Message
     *
     * @param {string} value Error Message.
     * @memberof Supports
     * @public
     */
    set SetSupportError(value) {
      this.#SupportError = value;
    }

    /**
     *
     * @returns {string}
     * @readonly
     * @memberof Supports
     */
    get SupportStatus() {
      return this.#SupportStatus;
    }

    /**
       *
       * @returns {string}
       * @readonly
       * @memberof Supports
       */
    get SupportError() {
      return this.#SupportError;
    }

    /**
     * Check if the user agent contains a key. This is the best way we know of
     * right now to detect platforms. If there is a better way, please send a
     * PR.
     *
     * @param {string} key
     * @returns {boolean}
     * @private
     */
    static userAgentContains_(key) {
      // eslint-disable-next-line compat/compat
      const userAgent = navigator.userAgent || '';
      return userAgent.includes(key);
    }
}

const SupportObject = new Supports();
let support = false;
let error = '';
const {
  osSupport,
  deviceSupport,
  browserSupport,
  webAssemblySupport,
  mediasourceSupport
} = SupportObject;

if (osSupport
    && deviceSupport
    && browserSupport
    && webAssemblySupport()
    && mediasourceSupport) {
  support = true;
  error = 'No Errors';
} else {
  error = SupportObject.Error;
  if (!webAssemblySupport()) {
    error = 'LCEVC Error: WebAssembly Verification failed is not supported!';
  }
}

/**
 * Returns true if all the requirements for LCEVCdec is satisfied else false.
 *
 * @readonly
 * @enum {boolean}
 * @exports
 */
SupportObject.SetSupportStatus = support;

/**
 * Returns errors if any if the requirements for LCEVCdec is not satisfied else null.
 *
 * @readonly
 * @enum {string}
 * @exports
 */
SupportObject.SetSupportError = error;

export default { SupportObject };
