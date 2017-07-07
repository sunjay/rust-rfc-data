# Rust RFC Data

Download and process data about Rust RFC PRs.

This is done in two stages so you don't have to redownload the data each time
you change how you process it.

## Installation & Usage

You will need:

* a recent installation of [Node.js] (>=v8.1.3)
* a [GitHub personal access token](token) (no permissions necessary, just generate a token)

### 1. To install the dependencies

```
npm install
```

### 2. To download the data

Data is downloaded into a file called `data.json`.

```sh
./getdata.js <TOKEN>
# Or
node --harmony getdata.js <TOKEN>
```

Notes:

* Data downloading is resumable and each PR will be cached one at a time in the `data/` directory.
* Once all downloads succeed, they will all be placed into a single `data.json` file
* You may *often* need to stop the downloading with Ctrl/Cmd+C when you run into GitHub's rate limiting
* This is despite the very conservative limits imposed on the downloading code (downloading is slow on purpose)

### 3. To process the data

Certain information is collected from each PR and written to a CSV. Output is
written to a file called `rfcs.csv`.

```
./process.js
# Or
node --harmony process.js
```

#### CSV Column Names:

* **number** - PR number
* **title** - PR title
* **labels** - PR GitHub labels
* **opened** - date and time when was the PR opened
* **state** - usually MERGED or CLOSED
* **merged** - date that the PR was merged
* **closed** - date that the PR was last closed
* **beforeFCPProposed** - number of comments before and not including the FCP proposal comment
* **fcpProposed** - date and time of the FCP proposal comment
  > Team member @... has proposed to ... this.
* **beforeFCPEntered** - number of comments between the FCP proposal comment and the FCP entered comment (not including either comment)
* **fcpEntered** - date and time of the FCP entered comment:
  > This is now entering its final comment period, as per the review above.
* **beforeFCPComplete** - number of comments between the FCP entered comment and the FCP complete comment (not including either comment)
* **fcpComplete** - date and time of the FCP complete comment:
  > The final comment period is now complete.


[Node.js]: https://nodejs.org/
[token]: https://github.com/settings/tokens
