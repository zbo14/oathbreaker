'use strict'

const https = require('https')
const Oath = require('.')

const oath1 = Oath((resolve, reject) => {
  setTimeout(() => resolve('foo'), 1)
})

const oath2 = Oath((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('bar')), 2e3)

  return () => clearTimeout(t)
})

const oath3 = Oath((resolve, reject) => {
  const t = setTimeout(() => {
    console.log('here1')
    resolve('baz')
  }, 3e3)

  return () => clearTimeout(t)
})

const oath4 = Oath((resolve, reject, signal = null) => {
  https.get('https://v4.ident.me/', { signal }, res => {
    console.log('here2')

    if (signal?.aborted) {
      return reject(new Error('Oath broken'))
    }

    let data = ''

    res
      .on('data', chunk => {
        data += chunk
      })
      .once('end', () => resolve('Address: ' + data.trim()))
      .once('error', reject)
  }).once('error', reject)
})

Oath.any([oath1, oath2, oath3, oath4])
  .then(console.log)
  .catch(console.error)
