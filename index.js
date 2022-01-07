'use strict'

/* global AbortController */

class Oath extends Promise {}

const oath = (fn, ac = new AbortController()) => {
  if (typeof fn !== 'function') {
    const err = new TypeError('First argument must be a function')

    return Promise.reject(err)
  }

  if (!(ac instanceof AbortController)) {
    const err = new TypeError('Second argument must be AbortController')

    return Promise.reject(err)
  }

  if (ac?.signal?.aborted) {
    const err = new Error('AbortController is already aborted')

    return Promise.reject(err)
  }

  const oath = new Oath((resolve, reject) => {
    const breakOath = fn(resolve, reject, ac.signal)

    if (breakOath && typeof breakOath !== 'function') {
      const err = new TypeError('Return value from function must be falsey or a function')

      return reject(err)
    }

    ac.signal.onabort = () => {
      breakOath && breakOath()
      const err = new Error('Oath broken')
      reject(err)
    }
  })

  oath.break = () => ac.abort()

  return oath
}

const checkOaths = oaths => {
  const validOaths = (
    Array.isArray(oaths) &&
    oaths.every(oath => oath instanceof Oath)
  )

  if (!validOaths) {
    throw new Error('Argument must be an array of oaths')
  }
}

oath.all = async oaths => {
  checkOaths(oaths)

  try {
    const result = await Promise.all(oaths)
    return result
  } catch (err) {
    oaths.forEach(oath => oath.break())
    throw err
  }
}

oath.any = async oaths => {
  checkOaths(oaths)

  const result = await Promise.any(oaths)
  oaths.forEach(oath => oath.break())

  return result
}

oath.race = async oaths => {
  checkOaths(oaths)

  try {
    const result = await Promise.race(oaths)
    oaths.forEach(oath => oath.break())

    return result
  } catch (err) {
    oaths.forEach(oath => oath.break())
    throw err
  }
}

module.exports = oath
