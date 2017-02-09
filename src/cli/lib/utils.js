/**
 * CLI utilities and helpers.
 *
 * @author J. Scott Smith
 * @license ISC
 * @module lib/utils
 */

function asyncFlow (ctx, gen, cb) {
  function done (err) {
    if (typeof cb === 'function') setImmediate(cb.bind(ctx, err))
  }

  function resume (err, data) {
    if (err) {
      try {
        if (iter.throw(err).done === true) done()
      } catch (e) {
        done(e) // Uncaught error in generator
      }
      return
    }

    let results = Array.prototype.slice.call(arguments, 1)
    if (iter.next(results.length > 1 ? results : results[0]).done === true) done()
  }

  var iter = gen(ctx, resume) // Init generator with context and resume callback
  if (iter.next().done === true) done() // Get it started
}

exports.asyncFlow = asyncFlow
