require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

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

client.connect();

client.query("SELECT vaichover FROM cidades WHERE cidade='BEL';", (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
  client.end();
});

console.log("Vai chover (10:51)");