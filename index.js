const _ = require('lodash'),
    Promise = require('bluebird'),
    cheerio = require('cheerio'),
    request = require('request'),
    winston = require('winston');

winston.level = 'debug';


const config = {
    source: 'http://scraping-challenge-2.herokuapp.com',

    opts: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.37 Safari/537.36',
        },
        //proxy: 'http://localhost:8888',
        tunnel: false,
    }
};


getProfilesUrls(config.source, config.opts)
    .then((urls) => {
        winston.info('Found %d profiles', urls.length);

        return Promise.map(urls,
            (url) => getProfile(url, config.opts)
                .then((profile) => {
                    winston.debug('Found %s (%s)', profile.name, profile.location);

                    return profile;
                })
                .catch(() => {
                    winston.debug('Cannot retrieve %s', url);

                    return;
                })
            , {concurrency: 1})
            .then((profiles) => {
                const results = _.compact(profiles);

                winston.info('Extract %d on %d profiles', results.length, urls.length);
            });
    })
    .catch((err) => winston.error('Error: ', err));


////////////

function getProfilesUrls(url, defaultOpts) {
    return new Promise((resolve, reject) => {
        const opts = _.merge({}, defaultOpts, {url});

        request(opts, (err, res, body) => {
            if (err) {
                return reject(err);
            }

            if (res.statusCode !== 200) {
                return reject(body);
            }

            const $ = cheerio.load(body);

            const urls = $('.profile a')
                .map((i, el) => $(el).attr('href'))
                .get()
                .map((url) => `${config.source}${url}`);

            resolve(urls);
        });
    });
}

function getProfile(url, defaultOpts) {
    return new Promise((resolve, reject) => {
        const opts = _.merge({}, defaultOpts, {url});

        request(opts, (err, res, body) => {
            if (err) {
                return reject(err);
            }

            if (res.statusCode !== 200) {
                return reject(body);
            }

            const $ = cheerio.load(body);

            const name = $('.profile-info-name').text(),
                location = $('.profile-info-location').text();

            resolve({name, location});
        });
    });
}
