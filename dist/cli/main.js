'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [main].map(_regenerator2.default.mark);

/**
 * CLI entrypoint.
 *
 * @author J. Scott Smith
 * @license ISC
 * @module cli/main
 */

var fs = require('fs');
var path = require('path');
var config = require('config');
var program = require('commander');
var request = require('request');

var _require = require('./lib/utils'),
    asyncFlow = _require.asyncFlow;

var options = void 0;

function parseInt10(value) {
  return parseInt(value, 10);
}

program.version('0.0.1').arguments('[timeline]').description('Bulk download Twitter media for a specified timeline (search or user).').option('  , --max-photos <count>', 'maximum number of photos to download, default is 100', parseInt10, 100).option('  , --max-tweets <count>', 'maximum number of tweets to process, default is 100', parseInt10, 100).option('  , --query <string>', 'search query string').option('  , --geocode <spec>', 'search geocode specifier (ex: "37.781157 -122.398720 1mi")').option('  , --photo-size <size>', 'size of photo to download (small, medium, large, thumb)', /^(small|medium|large|thumb)$/i, 'medium').option('  , --screen-name <name>', 'user timeline screen name').option('  , --user-id <id>', 'user timeline user ID').action(function (t) {
  options = config.get('timelines.' + t);
});

program.parse(process.argv);

if (program.query) options.qs.q = program.query;
if (program.geocode) options.qs.geocode = program.geocode;
if (program.screenName) options.qs.screen_name = program.screenName;
if (program.userId) options.qs.user_id = program.userId;

options.json = true;
options.oauth = config.get('oauth');

function downloadFile(src, filePath, cb) {
  var reqStream = request.get({
    url: src,
    oauth: options.oauth
  });

  function done(err) {
    reqStream.removeAllListeners();
    if (typeof cb === 'function') cb(err);
  }

  reqStream.on('error', done);
  reqStream.on('response', function (res) {
    if (res.statusCode === 200) {
      var ws = fs.createWriteStream(filePath);
      ws.once('close', done);
      res.pipe(ws);
    } else done(new Error('Received non-success status ' + res.statusCode));
  });
}

var INT64_DIGITS = 20;
var zeroId = '0'.repeat(INT64_DIGITS);

function padId(str) {
  return (zeroId + str).substr(-INT64_DIGITS);
}

function main(_, resume) {
  var downloadDir, opts, minId, photoCount, tweetCount, statuses, stop, _ref, _ref2, res, data, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, status, statusId, originalStatus, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, media, size, src, fileName;

  return _regenerator2.default.wrap(function main$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          downloadDir = path.resolve(config.get('downloadDir'));
          _context.prev = 1;
          _context.next = 4;
          return fs.mkdir(downloadDir, resume);

        case 4:
          _context.next = 10;
          break;

        case 6:
          _context.prev = 6;
          _context.t0 = _context['catch'](1);

          if (!(_context.t0.code !== 'EEXIST')) {
            _context.next = 10;
            break;
          }

          throw _context.t0;

        case 10:
          downloadDir = path.join(downloadDir, new Date().toISOString().substr(0, 19).replace('T', '-').replace(/:/g, ''));
          _context.next = 13;
          return fs.mkdir(downloadDir, resume);

        case 13:
          opts = (0, _assign2.default)({}, options);
          minId = '9'.repeat(INT64_DIGITS);
          photoCount = 0;
          tweetCount = 0;
          statuses = void 0;
          stop = false;

        case 19:
          console.log('=> Fetching tweets...');

          _context.next = 22;
          return request.get(opts, resume);

        case 22:
          _ref = _context.sent;
          _ref2 = (0, _slicedToArray3.default)(_ref, 2);
          res = _ref2[0];
          data = _ref2[1];

          if (!(res.statusCode !== 200)) {
            _context.next = 28;
            break;
          }

          throw new Error('Received non-success status: ' + res.statusCode);

        case 28:

          if (Array.isArray(data)) {
            statuses = data;
          } else if ((typeof data === 'undefined' ? 'undefined' : (0, _typeof3.default)(data)) === 'object' && Array.isArray(data.statuses)) {
            statuses = data.statuses;
          } else {
            statuses = [];
          }

          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context.prev = 32;
          _iterator = (0, _getIterator3.default)(statuses);

        case 34:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context.next = 84;
            break;
          }

          status = _step.value;
          statusId = padId(status.id_str);

          if (!(opts.qs.max_id === statusId)) {
            _context.next = 39;
            break;
          }

          return _context.abrupt('continue', 81);

        case 39:

          console.log('=> Processing tweet: %s', statusId);

          if (statusId < minId) minId = statusId;

          originalStatus = status;

          if (status.quoted_status) {
            originalStatus = status.quoted_status;
          } else if (status.retweeted_status) {
            originalStatus = status.retweeted_status;
          }

          if (!(originalStatus.extended_entities && originalStatus.extended_entities.media)) {
            _context.next = 78;
            break;
          }

          _iteratorNormalCompletion2 = true;
          _didIteratorError2 = false;
          _iteratorError2 = undefined;
          _context.prev = 47;
          _iterator2 = (0, _getIterator3.default)(originalStatus.extended_entities.media);

        case 49:
          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
            _context.next = 64;
            break;
          }

          media = _step2.value;
          size = program.photoSize;

          if (!(media.type === 'photo' && media.sizes && media.sizes[size] && media.media_url_https.endsWith('.jpg'))) {
            _context.next = 61;
            break;
          }

          src = media.media_url_https + ':' + size;
          fileName = padId(media.id_str) + '.jpg';


          console.log('=> Downloading photo: %s [%s]', fileName, src);

          _context.next = 58;
          return downloadFile(src, path.join(downloadDir, fileName), function (err) {
            if (err) {
              console.log('=> Download error: %s', err.message);
            } else {
              photoCount++;
            }
            resume(err);
          });

        case 58:

          if (photoCount >= program.maxPhotos) stop = true;

          if (!stop) {
            _context.next = 61;
            break;
          }

          return _context.abrupt('break', 64);

        case 61:
          _iteratorNormalCompletion2 = true;
          _context.next = 49;
          break;

        case 64:
          _context.next = 70;
          break;

        case 66:
          _context.prev = 66;
          _context.t1 = _context['catch'](47);
          _didIteratorError2 = true;
          _iteratorError2 = _context.t1;

        case 70:
          _context.prev = 70;
          _context.prev = 71;

          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }

        case 73:
          _context.prev = 73;

          if (!_didIteratorError2) {
            _context.next = 76;
            break;
          }

          throw _iteratorError2;

        case 76:
          return _context.finish(73);

        case 77:
          return _context.finish(70);

        case 78:

          if (++tweetCount >= program.maxTweets) stop = true;

          if (!stop) {
            _context.next = 81;
            break;
          }

          return _context.abrupt('break', 84);

        case 81:
          _iteratorNormalCompletion = true;
          _context.next = 34;
          break;

        case 84:
          _context.next = 90;
          break;

        case 86:
          _context.prev = 86;
          _context.t2 = _context['catch'](32);
          _didIteratorError = true;
          _iteratorError = _context.t2;

        case 90:
          _context.prev = 90;
          _context.prev = 91;

          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }

        case 93:
          _context.prev = 93;

          if (!_didIteratorError) {
            _context.next = 96;
            break;
          }

          throw _iteratorError;

        case 96:
          return _context.finish(93);

        case 97:
          return _context.finish(90);

        case 98:

          opts.qs.max_id = minId;

        case 99:
          if (!stop && statuses.length > 0) {
            _context.next = 19;
            break;
          }

        case 100:
        case 'end':
          return _context.stop();
      }
    }
  }, _marked[0], this, [[1, 6], [32, 86, 90, 98], [47, 66, 70, 78], [71,, 73, 77], [91,, 93, 97]]);
}

asyncFlow(null, main, function () {
  console.log('=> Download finished');
});