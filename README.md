# Rust RFC Data

Download and process data about Rust RFC PRs.

## Usage

You will need:

* a recent installation of [Node.js] (>=v8.1.3)
* a [GitHub personal access token](token) (no permissions necessary, just generate a token)

To install the dependencies:

```
npm install
```

To download the data to a file called `data.json`:

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

To collect some stats from the data and write a CSV file:

```
./process.js
# Or
node --harmony process.js
```

This is done in two stages so you don't have to redownload the data each time
you change how you process it.

[Node.js]: https://nodejs.org/
[token]: https://github.com/settings/tokens
