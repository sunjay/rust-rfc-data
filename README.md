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
