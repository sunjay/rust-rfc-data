const path = require('path');

const fs = require('fs-extra');
const request = require('request-promise');

const ENDPOINT = 'https://api.github.com/graphql';
// The limit on the number of concurrent requests (so GitHub doesn't think we're spamming)
const CONNECTION_LIMIT = 2;
// Avoid everything failing and GitHub thinking you're abusing the API by adding
// a delay between requests
const REQUEST_DELAY = 2000; // ms

const PULL_REQUEST_QUERY = fs.readFileSync('pullRequest.graphql').toString();
const PULL_REQUEST_LIST_QUERY = fs.readFileSync('pullRequestList.graphql').toString();

/**
 * Fetch all pull requests rapidly in parallel
 */
exports.fetchPullRequestList = (token, dataDir) => {
  const pool = new QueryPool(token);
  const fetchPage = ({data: {repository: {pullRequests}}}) => {
    const {totalCount, pageInfo, nodes} = pullRequests;

    let nextPage = Promise.resolve([]);
    if (pageInfo.hasNextPage) {
      nextPage = queryPullRequestList(pool, pageInfo.endCursor).then(fetchPage);
    }

    const completed = Promise.all(nodes.map((pr) => {
      return fetchPullRequest(pool, dataDir, pr);
    }));

    return nextPage.then((page) => completed.then((items) => items.concat(page)));
  };

  return queryPullRequestList(pool).then(fetchPage);
};

function fetchPullRequest(pool, dataDir, {number, title}) {
  const fetchPage = ({data: {repository: {pullRequest}}}) => {
    const {pageInfo} = pullRequest.timeline;

    let nextPage = Promise.resolve({timeline: {nodes: []}});
    if (pageInfo.hasNextPage) {
      nextPage = queryPullRequest(pool, number, pageInfo.endCursor).then(fetchPage);
    }

    return nextPage.then(({timeline}) => {
      pullRequest.timeline.nodes.push(...timeline.nodes);
      return pullRequest;
    });
  };

  const cache = path.join(dataDir, `PR${number}.json`);
  return fs.readFile(cache).then((data) => {
    console.info(`Not downloading from API: Found local cache for PR #${number} ${title}`);
    return JSON.parse(data);
  }).catch((err) => {
    if (err.code === 'ENOENT') {
      return queryPullRequest(pool, number, null, () => {
        console.info(`Downloading PR #${number} ${title}`);
      }).then(fetchPage).then((pr) => {
        return fs.writeFile(cache, JSON.stringify(pr, null, 2)).then(() => pr);
      });
    }
    return Promise.reject(err);
  });
}

function queryPullRequestList(pool, after = null) {
  return pool.query(PULL_REQUEST_LIST_QUERY
    .replace('$PAGEINATION', pagination({pageSize: 100, after})));
}

function queryPullRequest(pool, number, after = null, before = () => {}) {
  return pool.query(PULL_REQUEST_QUERY
    .replace('$PR_NUMBER', number)
    .replace('$PAGEINATION', pagination({pageSize: 100, after})), before);
}

function pagination({pageSize, after = null}) {
  const first = `first: ${pageSize}`;
  const afterRef = after ? `, after: "${after}"` : '';
  return first + afterRef;
}

class QueryPool {
  constructor(token) {
    this.token = token;
    this.queue = [];
    this.requests = 0;
  }

  query(query, before = () => {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({query, before, resolve, reject});
      this._dispatchNext();
    });
  }

  _sendQuery({query, before, resolve, reject}) {
    before();
    request.post({
      url: ENDPOINT,
      auth: {
        bearer: this.token,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
      },
      body: {query},
      json: true,
    }).then((result) => {
      if (result.errors && result.errors.length) {
        return Promise.reject(JSON.stringify(result.errors));
      }
      this.requests -= 1;
      this._dispatchNext();

      return resolve(result);
    }).catch((err) => {
      this.requests -= 1;
      this._dispatchNext();
      reject(err);
    });
  }

  _dispatchNext() {
    if (this.requests < CONNECTION_LIMIT && this.queue.length > 0) {
      this.requests += 1;
      const next = this.queue.shift();
      setTimeout(() => this._sendQuery(next), (Math.random() * 0.4 + 0.8) * REQUEST_DELAY);
    }
  }
}
