/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

const fs = require('fs');
const fd = require('./files_directory');

const writeShaders = (shadersDirectory, shadersOutput, licenseText) => {
  const br = String.fromCharCode(10);
  let text = '';

  const now = new Date();
  text += licenseText + br + br;
  text += `// shader source file automatically built on ${
    now.toISOString().substr(0, 10)}${br}${br}`;
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
      .replace(/\n[\n\t\s]*/g, '\n') // double blank lines
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
