/**
 * CLI entrypoint.
 *
 * @author J. Scott Smith
 * @license ISC
 * @module cli/main
 */

// TODO: Support more photo formats; only allows JPEG for now

const fs = require('fs')
const path = require('path')
const config = require('config')
const program = require('commander')
const request = require('request')
const {asyncFlow} = require('./lib/utils')

/*
  Program option parsing
 */

let options

function parseInt10 (value) {
  return parseInt(value, 10)
}

program
  .version('0.0.1')
  .arguments('[timeline]')
  .description('Bulk download Twitter media for a specified timeline (search or user).')
  .option('  , --max-photos <count>', 'maximum number of photos to download, default is 100', parseInt10, 100)
  .option('  , --max-tweets <count>', 'maximum number of tweets to process, default is 100', parseInt10, 100)
  .option('  , --query <string>', 'search query string')
  .option('  , --geocode <spec>', 'search geocode specifier (ex: "37.781157 -122.398720 1mi")')
  .option('  , --photo-size <size>', 'size of photo to download (small, medium, large, thumb)', /^(small|medium|large|thumb)$/i, 'medium')
  .option('  , --screen-name <name>', 'user timeline screen name')
  .option('  , --user-id <id>', 'user timeline user ID')
  .action((t) => {
    options = config.get(`timelines.${t}`)
  })

program.parse(process.argv)

/*
  Main
 */

if (program.query) options.qs.q = program.query
if (program.geocode) options.qs.geocode = program.geocode
if (program.screenName) options.qs.screen_name = program.screenName
if (program.userId) options.qs.user_id = program.userId

options.json = true
options.oauth = config.get('oauth')

function downloadFile (src, filePath, cb) {
  let reqStream = request.get({
    url: src,
    oauth: options.oauth
  })

  function done (err) {
    reqStream.removeAllListeners()
    if (typeof cb === 'function') cb(err)
  }

  reqStream.on('error', done)
  reqStream.on('response', (res) => {
    if (res.statusCode === 200) {
      let ws = fs.createWriteStream(filePath)
      ws.once('close', done)
      res.pipe(ws)
    } else done(new Error(`Received non-success status ${res.statusCode}`))
  })
}

// Since this is JavaScript, we must treat all status/media IDs as string
// NOTE: A 64-bit unsigned int yields 20 digits
const INT64_DIGITS = 20
const zeroId = '0'.repeat(INT64_DIGITS)

function padId (str) {
  return (zeroId + str).substr(-INT64_DIGITS)
}

function *main (_, resume) {
  let downloadDir = path.resolve(config.get('downloadDir'))

  // Ensure download directory exists
  try {
    yield fs.mkdir(downloadDir, resume)
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
  }

  // Create download sub-directory for this session
  downloadDir = path.join(downloadDir, (new Date()).toISOString().substr(0, 19).replace('T', '-').replace(/:/g, ''))
  yield fs.mkdir(downloadDir, resume)

  /*
    Process the timeline
   */

  const opts = Object.assign({}, options)
  let minId = '9'.repeat(INT64_DIGITS)
  let photoCount = 0
  let tweetCount = 0
  let statuses
  let stop = false

  do {
    console.log('=> Fetching tweets...')

    const [res, data] = yield request.get(opts, resume)
    if (res.statusCode !== 200) {
      throw new Error(`Received non-success status: ${res.statusCode}`)
    }

    if (Array.isArray(data)) {
      statuses = data
    } else if (typeof data === 'object' && Array.isArray(data.statuses)) {
      statuses = data.statuses
    } else {
      statuses = []
    }

    for (let status of statuses) {
      // Since max_id is inclusive; skip the redundant first tweet
      // SEE: https://dev.twitter.com/rest/public/timelines
      const statusId = padId(status.id_str)
      if (opts.qs.max_id === statusId) continue

      /*
        Process this tweet; download media, etc.
       */

      console.log('=> Processing tweet: %s', statusId)

      // Track smallest tweet id
      if (statusId < minId) minId = statusId

      let originalStatus = status
      if (status.quoted_status) {
        originalStatus = status.quoted_status
      } else if (status.retweeted_status) {
        originalStatus = status.retweeted_status
      }

      if (originalStatus.extended_entities && originalStatus.extended_entities.media) {
        for (let media of originalStatus.extended_entities.media) {
          const size = program.photoSize
          if ((media.type === 'photo') && media.sizes && media.sizes[size] && media.media_url_https.endsWith('.jpg')) {
            /*
              Download photo
             */

            const src = `${media.media_url_https}:${size}`
            const fileName = `${padId(media.id_str)}.jpg`

            console.log('=> Downloading photo: %s [%s]', fileName, src)

            yield downloadFile(src, path.join(downloadDir, fileName), (err) => {
              if (err) {
                console.log('=> Download error: %s', err.message)
              } else {
                photoCount++
              }
              resume(err)
            })

            if (photoCount >= program.maxPhotos) stop = true
            if (stop) break
          }
        }
      }

      if (++tweetCount >= program.maxTweets) stop = true
      if (stop) break
    }

    opts.qs.max_id = minId
  } while (!stop && statuses.length > 0)
}

asyncFlow(null, main, () => {
  console.log('=> Download finished')
})
