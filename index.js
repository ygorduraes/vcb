require('dotenv').config();
const { Client } = require('pg');
const http = require('http');
const request = require('request');
var _ = require('lodash');

const url = "http://www.redemet.aer.mil.br/api/consulta_automatica/index.php?local=sbjc,sbbe&msg=metar";
const connectionString = process.env.DATABASE_URL;

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

const req = http.get(url, (res) => {
    let body = '';
    
    console.log(url);
    console.log('Status:', res.statusCode);
    res.setEncoding('utf8');
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Successfully processed HTTP response');
        console.log(body);
        
        // body = 'SQLSTATE[HY000] [2002] php_network_getaddresses: getaddrinfo failed: Nome ou serviço desconhecido' // Testing errors
        
        //Verifica erros na API da REDEMET
        if (body.indexOf("SQLSTATE") !== -1){
            console.log("Erro na API da REDEMET");
            return;
        }
        
        //Salva a data e a hora
        const belemTZ = new Date().toLocaleString("en-US", { timeZone: "America/Belem"});
        const date = new Date(belemTZ);
        let hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;
        if (hour<0) hour+=24;
        
        let min  = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;
        
        const now = "(" + hour + ":" + min + ")";
        console.log("Now: " + now);
        
        //Trata a string para separar METARs e SPECIs e verificar se há sinal de chuva
        let metarRain = false;
        const metar = body.split(" - ");
        //let test  = "2018052316 - METAR SBJC 231600Z 05002KT 9999 BKN020 FEW025TCU 30/25 Q1013= 2018052316 - METAR COR SBBE 231600Z 28006KT 9999 RA BKN025 FEW030TCU 29/24 Q1013= 2018052316 - SPECI SBBE 231635Z 01012KT 2000 BKN010 FEW017TCU 26/24 Q1012=";
        //metar = test.split(" - ");
        for (let i in metar){
            console.log(metar[i]);
            if ((metar[i].indexOf("RA") !== -1 || metar[i].indexOf("TS") !== -1 || metar[i].indexOf("SH") !== -1 || metar[i].indexOf("VCSH") !== -1) && (metar[i].indexOf("RERA") == -1 && metar[i].indexOf("VCTS") == -1) ){
                metarRain = true;
            }
            console.log(`Metar ${i} rain:`, metarRain);
        }

        console.log("Rain:", metarRain);
        
        client.connect();
        // metarRain = true; // TESTING PURPOSES
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
                console.log(`Last status is the same (${belRain}), do nothing.`);
                client.end();
                return
            }
        });


        // if (metarRain == "true"){
        //     const message = "Vai chover" + " " + now;
        //     client.query("SELECT * FROM cidades WHERE cidade='BEL';", (err, res) => {
        //         if (err) throw err;
        //         const belResult = _.find(res.rows, ['cidade', 'BEL']);
        //         const belLastStatus = belResult.vaichover;
        //         console.log('belLastStatus', belLastStatus);

        //         if (belLastStatus === false) {
        //             console.log("Updating rain status in the database...");
        //             client.query("UPDATE cidades SET vaichover=true WHERE cidade='BEL';", (err, res) => {
        //                 if (err) throw err;
        //                 console.log('Update succeeded. Row count:', res.rowCount);
        //                 client.end();
        //                 console.log("Tweet enviado:", message);
        //             });
        //         }

        //         if (belLastStatus === true) {
        //             console.log("Last status is rain, does nothing.");
        //             client.end();
        //         }
        //     });

            // let paramsQuery = {
            //     TableName : table,
            //     KeyConditionExpression: "#c = :c",
            //     ExpressionAttributeNames:{
            //         "#c": "Cidade"
            //     },
            //     ExpressionAttributeValues: {
            //         ":c":cidade
            //     }
            // };
            
            // dynamo.query(paramsQuery, function(err, data) {
            //     if (err) {
            //         console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            //     } else {
            //         console.log("Query succeeded.");
            //         data.Items.forEach(function(item) {
            //             console.log("Valor na tabela: " + item.VaiChover);
            //             last = item.VaiChover;
            //             if (last == "false"){
            //                 let params = {
            //                 TableName:table,
            //                     Key:{
            //                         "Cidade": cidade
            //                     },
            //                     UpdateExpression: "set VaiChover = :vc",
            //                     ExpressionAttributeValues:{
            //                         ":vc":"true"
            //                     },
            //                     ReturnValues:"UPDATED_NEW"
            //                 };
                            
            //                 console.log("Atualizando a tabela...");
            //                 dynamo.update(params, function(err, data) {
            //                     if (err) {
            //                         console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            //                     } else {
            //                         console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            //                         console.log("Enviando tweet...");
                                    
            //                         let optionsTelegram = {
            //                           'method': 'POST',
            //                           'url': telegramBotURL + '?message=' + body,
            //                           'headers': {
            //                           }
            //                         };
            //                         request(optionsTelegram, function (error, response) { 
            //                           if (error) throw new Error(error);
            //                           console.log(response.body);
            //                         });
                                    
            //                         sendTweet(body).then(function(result){
            //                             callback(null,"Tweet enviado: " + body);
            //                             },function(error){
            //                                 console.log("Error:");
            //                                 console.log(error);
            //                                 callback(error);
            //                             });
            //                     }
            //                 });
            //             }
            //         });
            //     }
            // });              
        // }else{
        //     console.log("Updating status in the database...");
        //     client.query("UPDATE cidades SET vaichover=false WHERE cidade='BEL';", (err, res) => {
        //         if (err) throw err;
        //         console.log('Update succeeded. Row count:', res.rowCount);
        //         client.end();
        //     });
        // }
    });
    res.on('error', (e) => console.log(`error: ${e}`));
});
req.end();
