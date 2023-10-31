import fs from 'fs';
import path from 'path';
import typescript from '@rollup/plugin-typescript';
import { terser } from "rollup-plugin-terser";
import webWorkerLoader from 'rollup-plugin-web-worker-loader';
import execute from "rollup-plugin-shell";
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
if (!fs.existsSync(outputDirectory)){
  fs.mkdirSync(outputDirectory);
}

// Write package info into an automatically generated file package-info.txt
packageInfo.writePackageInfo(
  path.resolve(__dirname, './templates/package-info.tpl'),
  path.resolve(__dirname, `${outputDirectory}/package-info.txt`)
);

// Write shaders into an automatically generated file shaders_src.js
const shadersDirectory = './shaders/';
const shadersOutput = './src/shaders/shaders_src.js';
const licenseText = '/* Copyright (c) V-Nova International Limited 2021. All rights reserved. */';
shaders.writeShaders(shadersDirectory, shadersOutput, licenseText);

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
