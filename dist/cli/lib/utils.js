'use strict';

var _setImmediate2 = require('babel-runtime/core-js/set-immediate');

var _setImmediate3 = _interopRequireDefault(_setImmediate2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * CLI utilities and helpers.
 *
 * @author J. Scott Smith
 * @license ISC
 * @module lib/utils
 */

function asyncFlow(ctx, gen, cb) {
  function done(err) {
    if (typeof cb === 'function') (0, _setImmediate3.default)(cb.bind(ctx, err));
  }

  function resume(err, data) {
    if (err) {
      try {
        if (iter.throw(err).done === true) done();
      } catch (e) {
        done(e);
      }
      return;
    }

    var results = Array.prototype.slice.call(arguments, 1);
    if (iter.next(results.length > 1 ? results : results[0]).done === true) done();
  }

  var iter = gen(ctx, resume);
  if (iter.next().done === true) done();
}

exports.asyncFlow = asyncFlow;