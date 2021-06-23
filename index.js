require('dotenv').config();
const { Client } = require('pg');
const http = require('http');
const https = require('https');
const _ = require('lodash');

// REDEMET
const redemetKey = process.env.REDEMET_KEY;
const redemetURL = process.env.REDEMET_URL;
const redemetPath = '/mensagens/metar/SBJC,SBBE';

// DATABASE
const connectionString = process.env.DATABASE_URL;

// TELEGRAM
// const telegramBotURL = process.env.TELEGRAM_BOT_URL;

// TWITTER
const twitterURL = process.env.TWITTER_URL;
const sendTweetPath = '/api/v1/search';
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const accessTokenKey = process.env.ACCESS_TOKEN_KEY;
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

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
      res.on('data', (data) => {
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

function sendTweet(message) {
  const content = JSON.stringify({
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
    access_token_key: accessTokenKey,
    access_token_secret: accessTokenSecret,
    tweet: message,
  });

  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': content.length,
  };

  const options = {
    url: twitterURL,
    port: 3000,
    path: sendTweetPath,
    method: 'POST',
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      res.on('data', (bufferData) => {
        const data = bufferData.toString();
        resolve({ res, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(content);
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

  // let testMetar  = [
  //     {
  //       id_localidade: 'SBBE',
  //       validade_inicial: '2021-06-22 14:00:00',
  //       mens: 'METAR SBBE 221400Z 09008KT 9999 SCT030 30/23 Q1014=',
  //       recebimento: '2021-06-22 13:49:22'
  //     },
  //     {
  //       id_localidade: 'SBJC',
  //       validade_inicial: '2021-06-22 14:00:00',
  //       mens: 'METAR SBJC 221400Z 10002KT 9999 BKN020 30/25 Q1014=',
  //       recebimento: '2021-06-22 13:54:57'
  //     }
  // ];

  // Looks for rain
  const metarRain = checkRain(metar);
  // const metarRain = true; // TESTING PURPOSES
  console.log('Rain:', metarRain);

  client.connect();
  // Consulta se o ultimo status é de chuva (true)
  client.query("SELECT * FROM cidades WHERE cidade='BEL';", (err, res) => {
    if (err) throw err;
    const belResult = _.find(res.rows, ['cidade', 'BEL']);
    const belRain = belResult.vaichover;
    console.log('Database status:', belRain);

    // Updates status in the database if they're different
    if (belRain !== metarRain) {
      console.log(`Updating rain status (${metarRain}) in the database...`);
      client.query(`UPDATE cidades SET vaichover=${metarRain} WHERE cidade='BEL';`, (err, res) => {
        if (err) throw err;
        console.log('Update succeeded. Row count:', res.rowCount);
        client.end();
      });
    }

    // Sends tweet if database rain is false and METAR rain is true
    if (!belRain && metarRain) {
      const message = `Vai chover ${now}`;
      // Sends Telegram message
      // TO DO

      // Sends Tweet
      console.log('Sending tweet...');
      sendTweet('Teste').then((sentTweet) => {
        console.log('Tweet statusCode:', sentTweet.res.statusCode);
        console.log('Tweet data:', sentTweet.data);
        console.log('Tweet sent:', message);
        // return;
      });
    }

    // Does nothing if the status is the same
    if (belRain === metarRain) {
      console.log(`Database status is the same (${belRain}), do nothing.`);
      client.end();
      // return;
    }
  });
}

// Runs service
vaiChoverBelem()
  .catch((e) => console.log(e));
