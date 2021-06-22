require('dotenv').config();
const { Client } = require('pg');
const http = require('http');
const request = require('request');
var _ = require('lodash');

// REDEMET
const redemetKey = process.env.REDEMET_KEY;
const url = process.env.REDEMET_URL;

// DATABASE
const connectionString = process.env.DATABASE_URL;

// TELEGRAM
const telegramBotURL = process.env.TELEGRAM_BOT_URL;

// TWITTER
const sendTweetURL = process.env.SEND_TWEET_URL;
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

const getMETAR = async () =>  {
    const headers = {
        'X-Api-Key': redemetKey,
    };
    	
    const options = {
        url,
        method: 'GET',
        headers,
    };
    
    return new Promise((resolve,reject) => {
       request.get(options, (error,response,body) => {
           if (error){
               reject(error);
           }else{
               resolve({ response, body });
           }
       }) 
    });
};

const getNow = () => {
    const belemTZ = new Date().toLocaleString("en-US", { timeZone: "America/Belem"});
    const date = new Date(belemTZ);
    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    if (hour<0) {
        hour+=24
    }
    
    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    
    const nowString = "(" + hour + ":" + min + ")";
    return nowString;
}

const checkRain = (metar) => {
    let metarRain = false;
    for (let i in metar){
        console.log(`Checking ${metar[i].id_localidade}...`);
        if ((metar[i].mens.indexOf("RA") !== -1 
                || metar[i].mens.indexOf("TS") !== -1
                || metar[i].mens.indexOf("SH") !== -1
                || metar[i].mens.indexOf("VCSH") !== -1) 
            && (metar[i].mens.indexOf("RERA") == -1 && metar[i].mens.indexOf("VCTS") == -1) ){
            metarRain = true;
        }
        console.log(`Metar ${metar[i].id_localidade} rain result:`, metarRain);
    }

    return metarRain;
}

async function vaiChoverBelem() {
    //Gets Hours and Minutes
    const now = getNow();
    console.log("Now: " + now);

    console.log("Getting METAR from REDEMET's API...")
    const metarResponse = await getMETAR();
    
    // Validates Status Code
    const statusCode = metarResponse.response.statusCode;
    if (statusCode !== 200) {
        throw new Error(`Status code: ${statusCode}`);
    }

    const body = JSON.parse(metarResponse.body);

    // Looks for METAR data and throws error if not found
    if (!body.data) {
        throw new Error('Data not found');
    }

    const metar = body.data.data;
    console.log("METARs:", metar);

    
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
    console.log("Rain:", metarRain);

    client.connect();
    //Consulta se o ultimo status é de chuva (true)
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
            const message = "Vai chover" + " " + now;
            // Sends Telegram message
            // TO DO

            // Sends Tweet
            // TO DO
            console.log("Tweet enviado:", message);
            return;
        }

        // Does nothing if the status is the same
        if (belRain === metarRain) {
            console.log(`Database status is the same (${belRain}), do nothing.`);
            client.end();
            return
        }
    });
}

// Runs service
vaiChoverBelem()
.catch((e) => console.log(e));
