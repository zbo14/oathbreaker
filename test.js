'use strict'

/* global AbortController */

const EventEmitter = require('events')
const https = require('https')
const t = require('tap')
const Oath = require('.')

t.test('rejects if non-function passed to Oath()', async t => {
  try {
    await Oath({})
    throw new Error('Should reject')
  } catch (err) {
    t.equal(err.message, 'First argument must be a function')
  }
})

t.test('rejects if non-AbortController passed to Oath()', async t => {
  try {
    await Oath(() => {}, new EventEmitter())
    throw new Error('Should reject')
  } catch (err) {
    t.equal(err.message, 'Second argument must be AbortController')
  }
})

t.test('rejects if AbortController already aborted', async t => {
  const ac = new AbortController()
  ac.abort()

  try {
    await Oath(() => {}, ac)
    throw new Error('Should reject')
  } catch (err) {
    t.equal(err.message, 'AbortController is already aborted')
  }
})

t.test('rejects if return value from function isn\'t function', async t => {
  try {
    await Oath(() => ({}))
    throw new Error('Should reject')
  } catch (err) {
    t.equal(err.message, 'Return value from function must be falsey or a function')
  }
})

t.test('rejects if item isn\'t oath', async t => {
  const oath = Oath(() => {})
  const promise = Promise.resolve()

  try {
    await Oath.all([oath, promise])
    throw new Error('Should reject')
  } catch (err) {
    t.equal(err.message, 'Argument must be an array of oaths')
  }
})

t.test('breaks other oaths after 1 rejects in Oath.all()', async t => {
  const oath1 = Oath((resolve, reject) => resolve(1))

  const oath2 = Oath((resolve, reject) => {
    const t = setTimeout(() => resolve(2), 10)

    return () => clearTimeout(t)
  })

  const oath3 = Oath((resolve, reject) => {
    const t = setTimeout(() => resolve(3), 20)

    return () => clearTimeout(t)
  })

  const results = await Oath.all([oath1, oath2, oath3])
  t.same(results, [1, 2, 3])
})

t.test('breaks other oaths after 1 rejects in Oath.all()', async t => {
  let resolved2 = false
  let resolved3 = false

  const oath1 = Oath((resolve, reject) => {
    reject(new Error('whoops'))
  })

  const oath2 = Oath((resolve, reject) => {
    const t = setTimeout(() => {
      resolve()
      resolved2 = true
    }, 10)

    return () => clearTimeout(t)
  })

  const oath3 = Oath((resolve, reject) => {
    const t = setTimeout(() => {
      resolve()
      resolved3 = true
    }, 20)

    return () => clearTimeout(t)
  })

  try {
    await Oath.all([oath1, oath2, oath3])
    throw new Error('Should reject')
  } catch (err) {
    t.equal(err.message, 'whoops')
  }

  t.equal(resolved2, false)
  t.equal(resolved3, false)
})

t.test('breaks other oaths after 1 resolves in Oath.any()', async t => {
  let resolved1 = false
  let resolved3 = false

  const oath1 = Oath((resolve, reject) => {
    const t = setTimeout(() => {
      resolve()
      resolved1 = true
    }, 5)

    return () => clearTimeout(t)
  })

  const oath2 = Oath((resolve, reject) => {
    setTimeout(() => resolve('fastfoo'), 1)
  })

  const oath3 = Oath((resolve, reject) => {
    const t = setTimeout(() => {
      resolve()
      resolved3 = true
    }, 10)

    return () => clearTimeout(t)
  })

  const oath4 = Oath((resolve, reject) => {
    reject(new Error('whoops'))
  })

  const result = await Oath.any([oath1, oath2, oath3, oath4])

  t.equal(result, 'fastfoo')
  t.equal(resolved1, false)
  t.equal(resolved3, false)
})

t.test('breaks other oaths after 1 rejects in Oath.race()', async t => {
  let resolved1 = false
  let resolved2 = false

  const oath1 = Oath((resolve, reject) => {
    const t = setTimeout(() => {
      resolve()
      resolved1 = true
    }, 5)

    return () => clearTimeout(t)
  })

  const oath2 = Oath((resolve, reject) => {
    const t = setTimeout(() => {
      resolve()
      resolved2 = true
    }, 10)

    return () => clearTimeout(t)
  })

  const oath3 = Oath((resolve, reject) => {
    reject(new Error('whoops'))
  })

  try {
    await Oath.race([oath1, oath2, oath3])
    throw new Error('Should reject')
  } catch (err) {
    t.equal(err.message, 'whoops')
  }

  t.equal(resolved1, false)
  t.equal(resolved2, false)
})

t.test('breaks other oaths after 1 resolves in Oath.race()', async t => {
  let resolved1 = false
  let resolved2 = false

  const oath1 = Oath((resolve, reject) => {
    const t = setTimeout(() => {
      resolve()
      resolved1 = true
    }, 5)

    return () => clearTimeout(t)
  })

  const oath2 = Oath((resolve, reject) => {
    const t = setTimeout(() => {
      resolve()
      resolved2 = true
    }, 10)

    return () => clearTimeout(t)
  })

  const oath3 = Oath((resolve, reject) => {
    resolve('fastbar')
  })

  const result = await Oath.race([oath1, oath2, oath3])

  t.equal(result, 'fastbar')
  t.equal(resolved1, false)
  t.equal(resolved2, false)
})

t.test('cancels HTTPS request when other oath resolves', async t => {
  let resolved2 = false

  const oath1 = Oath((resolve, reject) => resolve('ok'))

  const oath2 = Oath((resolve, reject, signal) => {
    https.get('https://v4.ident.me', { signal }, res => {
      let data = ''

      res
        .on('data', chunk => {
          data += chunk
        })
        .once('end', () => {
          resolve(data)
          resolved2 = true
        })
        .once('error', reject)
    }).once('error', reject)
  })

  const result = await Oath.race([oath1, oath2])

  t.equal(result, 'ok')
  t.equal(resolved2, false)
})
