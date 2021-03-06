import 'dotenv/config';
import pkg from 'pg';
import https from 'https';
import Twitter from 'twit';
import _ from 'lodash';
import getClimaAoVentoURL, { base64Photo } from './climaAoVento.js';

const { Client } = pkg;
// require('dotenv').config();
// const { Client } = require('pg');
// const https = require('https');
// const Twitter = require('twit');
// const _ = require('lodash');

// REDEMET
const redemetKey = process.env.REDEMET_KEY;
const redemetURL = process.env.REDEMET_URL;
const redemetPath = '/mensagens/metar/SBJC,SBBE';

// DATABASE
const connectionString = process.env.DATABASE_URL;

// TELEGRAM
const telegramBotURL = process.env.TELEGRAM_BOT_URL;
const telegramEndpoint = process.env.TELEGRAM_ENDPOINT;

// TWITTER
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const accessTokenKey = process.env.ACCESS_TOKEN_KEY;
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

const twitter = new Twitter({
  consumer_key: consumerKey,
  consumer_secret: consumerSecret,
  access_token: accessTokenKey,
  access_token_secret: accessTokenSecret,
});

/**
 * Checks if the database is local (dev) or production
 */
const isLocal = connectionString.indexOf('localhost') > -1;

const clientSettings = {
  connectionString,
};

if (!isLocal) {
  clientSettings.ssl = {
    rejectUnauthorized: false,
  };
}

const client = new Client(clientSettings);

const getMETAR = async () => {
  const headers = {
    'X-Api-Key': redemetKey,
  };

  const options = {
    hostname: redemetURL,
    path: redemetPath,
    port: 443,
    method: 'GET',
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.on('data', (bufferData) => {
        const data = bufferData.toString();
        resolve({ res, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

const getNow = () => {
  const belemTZ = new Date().toLocaleString('en-US', { timeZone: 'America/Belem' });
  const date = new Date(belemTZ);
  let hour = date.getHours();
  hour = (hour < 10 ? '0' : '') + hour;
  if (hour < 0) {
    hour += 24;
  }

  let min = date.getMinutes();
  min = (min < 10 ? '0' : '') + min;

  const nowString = `(${hour}:${min})`;
  return nowString;
};

const checkRain = (metar) => {
  let metarRain = false;
  _.forEach(metar, (metarItem) => {
    console.log(`Checking ${metarItem.id_localidade}...`);
    if ((metarItem.mens.indexOf('RA') !== -1
                || metarItem.mens.indexOf('TS') !== -1
                || metarItem.mens.indexOf('SH') !== -1
                || metarItem.mens.indexOf('VCSH') !== -1)
            && (metarItem.mens.indexOf('RERA') === -1 && metarItem.mens.indexOf('VCTS') === -1)) {
      metarRain = true;
    }
    console.log(`Metar ${metarItem.id_localidade} rain result:`, metarRain);
  });

  return metarRain;
};

const getMediaID = async (b64content) => {
  const content = {
    media_data: b64content,
  };

  try {
    const updloadData = await twitter.post('media/upload', content);
    const mediaID = updloadData.data.media_id_string;
    return mediaID;
  } catch {
    return false;
  }
};

function sendTweet(message, mediaID) {
  const content = {
    status: message,
  };

  if (mediaID) {
    content.media_ids = [mediaID];
  }

  return new Promise((resolve, reject) => {
    // twitter.post('statuses/update', { status: message })
    twitter.post('statuses/update', content)
      .then((tweetResponse) => {
        resolve(tweetResponse);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function sendTelegram(message) {
  const completeTelegramPath = encodeURI(`${telegramEndpoint}?message=${message}`);
  const options = {
    hostname: telegramBotURL,
    port: 443,
    path: completeTelegramPath,
    method: 'GET',
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.on('data', (bufferData) => {
        const data = bufferData.toString();
        resolve({ res, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function vaiChoverBelem() {
  // Gets Hours and Minutes
  const now = getNow();
  console.log(`Now: ${now}`);

  console.log("Getting METAR from REDEMET's API...");
  const metarResponse = await getMETAR();

  // Validates Status Code
  const { statusCode } = metarResponse.res;
  if (statusCode !== 200) {
    throw new Error(`Status code: ${statusCode}`);
  }

  const body = JSON.parse(metarResponse.data);

  // Looks for METAR data and throws error if not found
  if (!body.data) {
    throw new Error('Data not found');
  }

  const metar = body.data.data;
  console.log('METARs:', metar);

  // Looks for rain
  const metarRain = checkRain(metar);
  // const metarRain = true; // TESTING PURPOSES, KEEP COMMENTED ON PRODUCTION
  console.log('Rain:', metarRain);
  if (metarRain) {
    console.log('????');
  }

  client.connect();
  // Consulta se o ultimo status ?? de chuva (true)
  client.query("SELECT * FROM cidades WHERE cidade='BEL';", (errSel, resSel) => {
    if (errSel) throw errSel;
    const belResult = _.find(resSel.rows, ['cidade', 'BEL']);
    const belRain = belResult.vaichover;
    console.log('Database status:', belRain);

    // Updates status in the database if they're different
    if (belRain !== metarRain) {
      console.log(`Updating rain status (${metarRain}) in the database...`);
      client.query(`UPDATE cidades SET vaichover=${metarRain} WHERE cidade='BEL';`, (errUpd, resUpd) => {
        if (errUpd) throw errUpd;
        console.log('Update succeeded. Row count:', resUpd.rowCount);
        client.end();
      });
    }

    // Sends tweet if database rain is false and METAR rain is true
    if (!belRain && metarRain) {
      const message = `Vai chover ${now}`;

      // Sends Tweet
      console.log('Generating photo URL...');
      const nowUTC = new Date();
      const photoURL = getClimaAoVentoURL(nowUTC);
      console.log('Photo URL:', photoURL);
      console.log('Fetching photo...');
      base64Photo(photoURL)
        .then((b64content) => {
          getMediaID(b64content)
            .then((mediaID) => {
              console.log('Sending tweet...');
              sendTweet(message, mediaID).then((sentTweet) => {
                if (sentTweet.data) {
                  console.log('Sent tweet:', sentTweet.data.text);
                }

                if (!sentTweet.data) {
                  console.log('Error sending tweet:', sentTweet);
                }
              });
            });
        });

      // Sends Telegram message
      console.log('Sending telegram message...');
      sendTelegram(message).then((sentTelegram) => {
        console.log('Telegram statusCode:', sentTelegram.res.statusCode);
        console.log('Telegram response:', sentTelegram.data);
      });
    }

    // Does nothing if the status is the same
    if (belRain === metarRain) {
      console.log(`Database status is the same (${belRain}), do nothing.`);
      client.end();
    }
  });
}

// Runs service
vaiChoverBelem()
  .catch((e) => console.log(e));
