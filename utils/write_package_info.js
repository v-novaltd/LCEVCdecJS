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
