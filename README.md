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

App info: `heroku pg:info -a vaichoverbelem`
Logs: `heroku logs -t -a vaichoverbelem`

## Testing
- Run `npm test`

## CI/CD
`TO DO`

## Database
This project uses Postgres as the database to store the last rain status.

Postgres installation (macOS): `brew install postgresql`

For other operational systems, please check the official Postgres documentation

Connecting locally to Heroku's database: `heroku pg:psql -a vaichoverbelem`

If you get a connection error (instance not running), please check if you're connected to a VPN, and disconnect prior to trying agin.
