/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

import Package from '../package.json';
import { LCEVC_DPI_HELPERS_VERSION } from './helpers';
import { Log } from './log.ts';

class Version {
  /**
   * Prints all version numbers of classes in the lcevc namespace of the current thread.
   *
   * @public
   */
  static getVersions() {
    if (Package.version) {
      Log.info(`V-Nova LCEVC Version: ${Package.version}`);
    }

    if (LCEVC_DPI_HELPERS_VERSION) {
      Log.info(`V-Nova LCEVC Helper Version: ${LCEVC_DPI_HELPERS_VERSION}`);
    }
  }
}

export default Version;
