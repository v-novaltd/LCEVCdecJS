/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */

declare var libDPIModule: any
/* global libDPIModule */

/** @public @type {object} */
let libDPI = null; // eslint-disable-line import/no-mutable-exports

/** @exports @type {Promise} */
const ready = new Promise((resolve, reject) => {
  libDPIModule().then((Module) => {
    libDPI = Module;
    resolve(true);
  }).catch(() => {
    reject(new Error('Failed to load LCEVC.'));
  });
});

export { libDPI, ready };
