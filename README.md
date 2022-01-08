# oathbreaker

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

Cancel pending promises with ease!

## Install

`npm i oathbreaker`

## Usage

### `Oath()`

Create an `Oath` and break it:

```js
const Oath = require('oathbreaker')

const oath = Oath((resolve, reject) => {
  const t = setTimeout(() => resolve('ok'), 5e3)

  return () => clearTimeout(t)
})

setTimeout(() => oath.break(), 3e3)
```

The callback return value should be falsy or a function. If a function's returned, it's called if/when the oath is broken.

The callback takes an optional 3rd argument. This is an [`AbortSignal`](https://nodejs.org/docs/latest-v16.x/api/globals.html#class-abortsignal), which can be passed to other methods (e.g. `https.request()`) or checked in business logic to see whether the oath was broken:

```js
const https = require('https')
const Oath = require('oathbreaker')

const oath1 = Oath((resolve, reject, signal) => {
  https.get('<url>', { signal }, res => {
    // handle response
  }).once('error', reject)
})

const oath2 = Oath((resolve, reject, signal) => {
  // do some stuff

  if (signal.aborted) return

  // do some other stuff
})
```

### `Oath.all()`

Similar to `Promise.all()` except it breaks other oaths (i.e. cancels pending promises) when 1 rejects:

```js
Oath.all([oath1, oath2, ... ])
  .then(() => {
    // all promises resolved
  })
  .catch(() => {
    // 1 promise rejected,
    // others pending are canceled
  })
```

### `Oath.any()`

Similar to `Promise.any()` except it breaks other oaths when 1 resolves:

```js
Oath.any([oath1, oath2, ... ])
  .then(() => {
    // 1 promise resolved,
    // others pending are canceled
  })
  .catch(() => {
    // All promises rejected
  })
```

### `Oath.race()`

Similar to `Promise.race()` except it breaks others oaths when 1 resolves *or* rejects:

```js
Oath.race([oath1, oath2, ... ])
  .then(() => {
    // 1 promise resolved,
    // others pending are canceled
  })
  .catch(() => {
    // 1 promise rejected,
    // others pending are canceled
  })
```

## Test

`npm test`

## Lint

`npm run lint` or `npm run lint:fix`

## License

Licensed under [MIT](./LICENSE).
