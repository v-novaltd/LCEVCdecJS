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

const fs = require('fs');
const fd = require('./files_directory');

const writeShaders = (shadersDirectory, shadersOutput, licenseText) => {
  const br = String.fromCharCode(10);
  let text = '';

  const now = new Date();
  text += licenseText + br + br;
  text += `// shader source file automatically built on ${
    now.toISOString().slice(0, 10)}${br}${br}`;

  text += `const shadersrc = {};${br}${br}`;

  const shaderExtensions = /.*.+(frag|vert|glsl|gl)$/;
  const templates = fd.filesInDirectory(shadersDirectory, shaderExtensions);

  text += `const shaderNames = {${br}`;
  templates.forEach((filePath) => {
    const filename = filePath.split(/[/\\]/).pop(); // get filename from path
    const filevar = filename.replace(/\.[^/.]+$/, '');

    text += `\t${filevar}: '${filename}',${br}`;
  });
  text += `};${br}${br}`;

  templates.forEach((filePath) => {
    const filename = filePath.split(/[/\\]/).pop(); // get filename from path
    // Open file as text
    let filetext = fs.readFileSync(filePath, { encoding: 'utf8' });
    filetext = filetext
      .replace(/\/\*[^]*?\*\//g, '') // strip multiline comments
      .replace(/\/\/[^\n]*/g, '') // strip single line comments
      .replace(/\n[\s]*/g, '\n') // double blank lines
      .replace(/[ \t]+/g, ' ') // double spaces
      .trim();
    // write
    const filevar = `shaderNames.${filename.replace(/\.[^/.]+$/, '')}`;
    text += `shadersrc[${filevar}] = \`${br}${filetext
    }\`;${br}${br}`; // append text
  });

  text += `export {shadersrc, shaderNames};${br}`;

  fs.writeFileSync(shadersOutput, text, { encoding: 'utf8' });
};

exports.writeShaders = writeShaders;
