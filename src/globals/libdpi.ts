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

import { Log } from '../log';

declare var libDPIModule: any
/* global libDPIModule */

/** @public @type {object} */
let libDPI = null; // eslint-disable-line import/no-mutable-exports

/** @exports @type {Promise} */
const ready = new Promise((resolve) => {
  // Preliminary check for WebAssembly support
  if (typeof WebAssembly === 'object') {
    libDPIModule().then((Module) => {
      libDPI = Module;
      resolve(true);
    }).catch(() => {
      Log.always('Could not load WebAssembly, ensure file is reachable and browser supports it.');
      resolve(false);
    });
  } else {
    Log.always('Current platform does not support WebAssembly.');
    resolve(false);
  }
});

export { libDPI, ready };
