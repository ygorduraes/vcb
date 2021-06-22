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

## Testing
- Run `npm test`

## CI/CD
`TO DO`

## Database
This project uses Postgres as the database to store the last rain status.

Postgres installation (macOS): `brew install postgresql`
Start postgre (macOS): `brew services start postgres`
Stop postgre (macOS): `brew services stop postgres`

For other operational systems, please check the official Postgres documentation

Postgres's app info: `heroku pg:info -a vaichoverbelem`

Connecting to Heroku's database: `heroku pg:psql -a vaichoverbelem`

Pulling the database locally (for development): `heroku pg:pull postgresql-polished-86943 vaichoverbelem -a vaichoverbelem`

Create a `.env` file with the connection info:
```
DATABASE_URL=postgres://username:password@localhost:5432/vaichoverbelem
```

Note: usually, the username/password for locally-installed Postgres databases is the system's username.

Connecting to the local database: `psql -h localhost -d vaichoverbelem`

Updating the status for testing purposes: `UPDATE cidades SET vaichover=false WHERE cidade='BEL';`

If you get a connection error (instance not running), please check if you're connected to a VPN, and disconnect prior to trying agin.
