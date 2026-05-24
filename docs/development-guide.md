# Development guide

The server is a node server written in Typescript that implements the
[Language Server Protocol (LSP)][lsp].

The project has a root `package.json` file which is really just there for
convenience - it proxies to the `package.json` file in the `server` folder.

## Prerequisites

This guide presumes you have the following dependencies installed:

- [`bun`][bun].
- [`node`][node] (v20 or newer)

## Initial setup

Run the following in the root of the project

```
bun install
```

This uses the `postinstall` hook to install the dependencies in each of the
sub-projects.

To make sure that everything is configured correctly run the following command
to compile the server

```
bun compile
```

## Testing

## Working on the server

If you are working on the server, then simply compile
and install the server globally whenever you've made a change.

```
bun reinstall-server
```

If you for some reason cannot get access to logs through the client,
then you can hack the `server/util/logger` with:

```typescript
const fs = require('fs')
const util = require('util')
const log_file = fs.createWriteStream(`/tmp/bash-language-server-debug.log`, {
  flags: 'w',
})

// inside log function
log_file.write(`${severity} ${util.format(message)}\n`)
```

## Performance

To analyze the performance of the server using the Chrome inspector:

1. In Code start debugging "Run -> Start debugging"
2. Open `chrome://inspect` in Chrome and ensure the port `localhost:6009` is added

[lsp]: https://microsoft.github.io/language-server-protocol/
[jest]: https://facebook.github.io/jest/
[bun]: https://bun.sh
[node]: https://nodejs.org/en/download/
