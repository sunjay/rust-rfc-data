#!/usr/bin/node --harmony

const fs = require('fs-extra');

const github = require('./github');

const OUTPUT = 'data.json';
const TOKEN = process.argv[2].trim();
if (!TOKEN) {
  console.error(`\
Please pass a GitHub personal access token as the only command line argument.
You can get one here: https://github.com/settings/tokens (no need for any permissions at all)`);
  process.exit(1);
}

github.fetchPullRequestList(TOKEN)
  .then(writeData)
  .then(() => console.info(`Done. Output: ${OUTPUT}`));

function writeData(data) {
  return fs.writeFile(OUTPUT, JSON.stringify(data, null, 2));
}
