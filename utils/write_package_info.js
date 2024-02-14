/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

const fs = require('fs');
const git = require('git-rev-sync');
const packageJson = require('../package.json');

const writePackageInfo = (templatePath, outputPath) => {
  let packageInfoText = '';

  try {
    packageInfoText = fs.readFileSync(templatePath, 'utf8');
  } catch (err) {
    console.error(err);
  }

  const now = new Date().toISOString().slice(0, 10);

  packageInfoText = packageInfoText.replace(/{{pkg_name}}/g, packageJson.name);
  packageInfoText = packageInfoText.replace(/{{date}}/g, now);
  packageInfoText = packageInfoText.replace(/{{git_branch}}/g, git.branch());
  packageInfoText = packageInfoText.replace(/{{pkg_version}}/g, packageJson.version);
  packageInfoText = packageInfoText.replace(/{{git_main}}/g, git.short());

  fs.writeFile(outputPath, packageInfoText, 'utf8', (err) => {
    if (err) return console.error(err);
    return 0;
  });
};

exports.writePackageInfo = writePackageInfo;
