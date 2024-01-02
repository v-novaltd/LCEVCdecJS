/* Copyright (c) V-Nova International Limited 2021-2024. All rights reserved. */

const fs = require('fs');
const path = require('path');

const filesInDirectory = (dir, filter, fileList = []) => {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const fileStat = fs.lstatSync(filePath);

    if (fileStat.isDirectory()) {
      filesInDirectory(filePath, filter, fileList);
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  });

  return fileList;
};

exports.filesInDirectory = filesInDirectory;
