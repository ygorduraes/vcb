const express = require('express');
const https = require('https');
const fs = require('fs');

const api = express();

const port = 443;
const redemetEndpoint = '/mensagens/metar/SBJC,SBBE';
const telegramEndpoint = '/telegram';

api.use(express.json());

const httpsOptions = {
  key: fs.readFileSync('api-tests/key.pem'),
  cert: fs.readFileSync('api-tests/cert.pem'),
};

/**
 * Error handling
 */
api.use((req, res, next) => {
  req.socket.on('error', (e) => {
    console.log(e);
  });
  res.socket.on('error', (e) => {
    console.log(e);
  });
  next();
});

/**
 * REDEMET METAR endpoint (tests only)
 */
api.get(redemetEndpoint, (req, res) => {
  const responseTest = { data: {} };
  responseTest.data.data = [
    {
      id_localidade: 'SBBE',
      validade_inicial: '2021-06-25 14:00:00',
      mens: 'METAR SBBE 251400Z 09007KT 050V120 9999 BKN026 29/23 Q1014=',
      recebimento: '2021-06-25 13:52:02',
    },
    {
      id_localidade: 'SBJC',
      validade_inicial: '2021-06-25 14:00:00',
      mens: 'METAR SBJC 251400Z 12005KT 9999 SCT027 30/24 Q1014=',
      recebimento: '2021-06-25 13:55:02',
    },
  ];

  const xApiKey = req.headers['x-api-key'];

  // Validates API Key
  if (!xApiKey) {
    const error = 'Missing x-api-key header';
    console.log(`Error: ${error}`);
    res.status(403);
    res.send({ error });
    return;
  }

  console.log('x-api-key found in the Headers');

  res.send(responseTest);
});

/**
 * Send Telegram message endpoint (tests only)
 */
api.get(telegramEndpoint, (req, res) => {
  const { message } = req.query;

  // Validates message
  if (!message) {
    const error = 'Missing message';
    console.log(`Error: ${error}`);
    res.status(500);
    res.send({ error });
    return;
  }

  console.log(`Telegram message sent: ${message}`);
  const responseTest = `Telegram message sent: ${message}`;

  res.send(responseTest);
});

const httpsServer = https.createServer(httpsOptions, api);

httpsServer.listen(port, () => {
  console.log(`Listening on ${port}.`);
});
