#!/usr/bin/env node

const fs = require('fs-extra');
const json2csv = require('json2csv');

const DATA = 'data.json';
const OUTPUT = 'rfcs.csv';

fs.readFile(DATA)
  .then(processData)
  .then((rows) => {
    console.info(`Result RFCs: ${rows.filter((row) => row.number).length}`);
    return rows;
  })
  .then(writeResults)
  .then(() => console.info(`Done. Output: ${OUTPUT}`));

function processData(contents) {
  const data = JSON.parse(contents);
  console.info(`Processing ${data.length} RFC PRs...`);

  return data.map((pr) => {
    const rfcbot = pr.timeline.nodes.filter(({author}) => (
      author && author.login === 'rfcbot'
    ));

    if (rfcbot.length === 0) {
      console.info(`Skipping because no rfcbot comments: RFC ${pr.number} ${pr.title}`);
      return {};
    }

    // we only care about the most recent things that happened
    rfcbot.reverse();
    const fcpProposed = rfcbot.find(({bodyText}) => (
      /^Team member @[^ ]+ has proposed to [^ ]+ this./.test(bodyText)
    ));
    const fcpEntered = rfcbot.find(({bodyText}) => (
      bodyText.includes('This is now entering its final comment period, as per the review above.')
    ));
    const fcpComplete = rfcbot.find(({bodyText}) => (
      bodyText.includes('The final comment period is now complete.')
    ));

    if (!fcpProposed || !fcpEntered || !fcpComplete) {
      console.info(`Skipping because not all required rfcbot comments were found: RFC ${pr.number} ${pr.title}`);
      return {};
    }

    const comments = pr.timeline.nodes
      .filter(({__typename: type}) => type === 'IssueComment');
    const beforeFCPProposed = comments.indexOf(fcpProposed);
    const beforeFCPEntered = comments.indexOf(fcpEntered) - beforeFCPProposed - 1;
    const beforeFCPComplete = comments.indexOf(fcpComplete) - (beforeFCPEntered + 1) - beforeFCPProposed - 1;

    // null if not closed, timestamp if closed
    const closed = pr.timeline.nodes.reduce((acc, {__typename: type, createdAt}) => {
      if (type === 'ClosedEvent') {
        return createdAt;
      }
      else if (type === 'ReopenedEvent') {
        return null;
      }
      return acc;
    }, null);

    return {
      number: pr.number,
      title: pr.title,
      labels: pr.labels.edges.map(({node: {name}}) => name).join(','),
      opened: pr.createdAt,
      state: pr.state,
      merged: pr.mergedAt || '',
      closed: closed || '',
      beforeFCPProposed,
      fcpProposed: fcpProposed.createdAt,
      beforeFCPEntered,
      fcpEntered: fcpEntered.createdAt,
      beforeFCPComplete,
      fcpComplete: fcpComplete.createdAt,
    };
  });
}

function writeResults(rows) {
  return fs.writeFile(OUTPUT, `${json2csv({data: rows})}\n`);
}
