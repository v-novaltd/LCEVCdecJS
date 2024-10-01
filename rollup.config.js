import fs from 'fs';
import path from 'path';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';
import execute from 'rollup-plugin-shell';
import { babel } from '@rollup/plugin-babel';
import eslint from '@rollup/plugin-eslint';
import replace from '@rollup/plugin-replace';

const shaders = require('./utils/write_shaders');
const packageInfo = require('./utils/write_package_info');

// Production build will be minified, whereas development will contain the full source code
const production = process.env.ENV_PRODUCTION;
console.log(`Building a ${production ? 'production' : 'development'} bundle`);

// Create the output directory if it does not exist yet, needed for writePackageInfo
const outputDirectory = './dist';
if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory);
}

// Write package info into an automatically generated file package-info.txt
packageInfo.writePackageInfo(
  path.resolve(__dirname, './templates/package-info.tpl'),
  path.resolve(__dirname, `${outputDirectory}/package-info.txt`)
);

const license = `/**
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
 */`;

// Write shaders into an automatically generated file shaders_src.js
const shadersDirectory = './shaders/';
const shadersOutput = './src/shaders/shaders_src.js';
shaders.writeShaders(shadersDirectory, shadersOutput, license);

// Rollup.js config
export default {
  input: 'src/index.js',
  treeshake: 'smallest',
  output: {
    file: `dist/${production ? 'lcevc_dec.min.js' : 'lcevc_dec.js'}`,
    format: 'umd',
    name: 'LCEVCdec',
    sourcemap: true
  },
  plugins: [
    webWorkerLoader({ loadPath: '', targetPlatform: 'browser' }),
    typescript({ tsconfig: 'tsconfig.json' }),
    eslint({ formatter: 'codeframe' }),
    babel({ babelHelpers: 'bundled' }),
    production && terser({
      keep_fnames: false,
      safari10: true,
      mangle: {
        toplevel: true
      }
    }),
    replace({
      preventAssignment: true,
      '__BUILD_DATE__': new Date().toLocaleDateString(),
    }),
    production && execute({ commands: ['python3 concat/concat.py prod'], hook: 'writeBundle' }),
    !production && execute({ commands: ['python3 concat/concat.py debug'], hook: 'writeBundle' })
  ],
  onwarn (warning, warn) {
    // Skip warnings for non-existent exports as these are used to import JSDoc typedefs
    if (warning.code === 'NON_EXISTENT_EXPORT') return;
    warn(warning);
  }
};
