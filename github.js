const fs = require('fs-extra');
const request = require('request-promise');

const ENDPOINT = 'https://api.github.com/graphql';

const PULL_REQUEST_QUERY = fs.readFileSync('pullRequest.graphql').toString();
const PULL_REQUEST_LIST_QUERY = fs.readFileSync('pullRequestList.graphql').toString();

/**
 * Fetch all pull requests rapidly in parallel
 */
exports.fetchPullRequestList = (token) => {
  const fetchPage = ({data: {repository: {pullRequests}}}) => {
    const {totalCount, pageInfo, nodes} = pullRequests;

    console.log(`Downloading ${totalCount} pull requests...`);
    let nextPage = Promise.resolve([]);
    if (pageInfo.hasNextPage) {
      nextPage = queryPullRequestList(token, pageInfo.endCursor).then(fetchPage);
    }

    const completed = Promise.all(nodes.map(({number, title}) => {
      console.log(`Downloading PR #${number} ${title}`);
      return fetchPullRequest(token, number);
    }));

    return nextPage.then((page) => completed.then((items) => items.concat(page)));
  };

  return queryPullRequestList(token).then(fetchPage);
};

function fetchPullRequest(token, number) {
  const fetchPage = ({data: {repository: {pullRequest}}}) => {
    const {totalCount, pageInfo, nodes} = pullRequest.timeline;

    let nextPage = Promise.resolve({timeline: []});
    if (pageInfo.hasNextPage) {
      nextPage = queryPullRequest(token, number, pageInfo.endCursor).then(fetchPage);
    }

    return nextPage.then(({timeline}) => ({
      ...pullRequest,
      timeline: [
        ...pullRequest.timeline,
        ...timeline,
      ],
    }));
  };

  return queryPullRequest(token, number).then(fetchPage);
}

function queryPullRequestList(token, after = undefined) {
  return queryAPI(token, PULL_REQUEST_LIST_QUERY
    .replace('$PAGEINATION', pagination({pageSize: 100, after})));
}

function queryPullRequest(token, number, after = undefined) {
  return queryAPI(token, PULL_REQUEST_QUERY
    .replace('$PR_NUMBER', number)
    .replace('$PAGEINATION', pagination({pageSize: 100, after})));
}

function queryAPI(token, query) {
  return request.post({
    url: ENDPOINT,
    auth: {
      bearer: token,
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
    },
    body: {query: query.toString()},
    json: true,
  });
}

function pagination({pageSize, after = null}) {
  const first = `first: ${pageSize}`;
  const afterRef = after ? `, after: "${after}"` : '';
  return first + afterRef;
}
