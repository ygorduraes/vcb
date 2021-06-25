# vcb
Vai Chover Belém

## Project requirements
- Node.js
- npm
- nvm
- heroku

## Prepare for development
- Install requirements above
- Switch to the target Node version with `nvm use`
- Install Node requirements with `npm i`

## Getting info from heroku

App info: `heroku ps -a vaichoverbelem`
Logs: `heroku logs -t -a vaichoverbelem`

## Scaling up app on Heroku

`heroku ps:scale -a vaichoverbelem worker=1`

## Testing environment
- Run `npm run api` to start the local api for development support. Add the endpoints to the `.env` file as described below.

## CI/CD
`TO DO`

## .env (development-only)

Create a `.env` file at the repository root with the following info:
```
NODE_TLS_REJECT_UNAUTHORIZED=0
REDEMET_KEY=12345
REDEMET_URL=localhost
DATABASE_URL=(see ##Database section)
TELEGRAM_BOT_URL=localhost
TELEGRAM_ENDPOINT=/s2qg75htis92xq92172kapow1go0s3ul
TWITTER_URL=localhost
CONSUMER_KEY=12345
CONSUMER_SECRET=12345
ACCESS_TOKEN_KEY=12345
ACCESS_TOKEN_SECRET=12345
```

Note: Production's REDEMET's API for METAR info is `https://api-redemet.decea.mil.br/mensagens/metar/SBJC,SBBE`. You'll ned an API Key, which you can request at https://www.atd-1.com/cadastro-api/ (you might receive it instantly at your e-mail).

## Database
This project uses Postgres as the database to store the last rain status.

Postgres installation (macOS): `brew install postgresql`
Start postgre (macOS): `brew services start postgres`
Stop postgre (macOS): `brew services stop postgres`

For other operational systems, please check the official Postgres documentation

Postgres's app info: `heroku pg:info -a vaichoverbelem`

Connecting to Heroku's database: `heroku pg:psql -a vaichoverbelem`

Pulling the database locally (for development): `heroku pg:pull postgresql-polished-86943 vaichoverbelem -a vaichoverbelem`

Add to the `.env` file the connection info:
```
DATABASE_URL=postgres://username:password@localhost:5432/vaichoverbelem
```

Note: usually, the username/password for locally-installed Postgres databases is the system's username.

Connecting to the local database: `psql -h localhost -d vaichoverbelem`

Updating the status for testing purposes: `UPDATE cidades SET vaichover=false WHERE cidade='BEL';`

If you get a connection error (instance not running), please check if you're connected to a VPN, and disconnect prior to trying agin.
