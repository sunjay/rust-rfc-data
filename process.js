#!/usr/bin/env node

const fs = require('fs-extra');
const json2csv = require('json2csv');

const DATA = 'data.json';
const OUTPUT = 'rfcs.csv';

fs.readFile(DATA)
  .then(processData)
  .then(writeResults)
  .then(() => console.info(`Done. Output: ${OUTPUT}`));

function processData(jsondata) {
  const {data} = JSON.parse(jsondata);
  const pulls = data.repository.pullRequests;
  console.info(`Processing ${pulls.nodes.length} RFC PRs of the ${pulls.totalCount} which are available online`);

  return pulls.nodes.map((pr) => {
    return {
      number: pr.number,
      title: pr.title,
      opened: pr.createdAt,
      merged: pr.mergedAt,
      state: pr.state,
      labels: pr.labels.edges.map(({node: {name}}) => name).join(','),
      // Since our query is limited, some comments that exist may be missed
      analysisMissedComments: pr.comments.edges.length < pr.comments.totalCount,
    };
  });
}

function writeResults(rows) {
  return fs.writeFile(OUTPUT, json2csv({data: rows}));
}
