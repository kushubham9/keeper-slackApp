# keeper-Slack App
### Password sharing was never so easy


## About
> Keeper allows you to share confidential informations such as passwords with your friends or team with a single command. The password or sensitive information will be stored in our safe vaults duely encrypted. Only the authorized will have access to the shared data.

![alt Keeper](https://media.giphy.com/media/2wVDCB9i0VR0yn7T9g/giphy.gif)

## How it works?
Any sensitive information shared with a team or a person will not be posted as message over slack. Keeper will generate a safe link which will be shared over the user's email address.


## Installation
1. Clone the app
2. Create a database table. Run the migration listed in the mysql/migrations.sql
3. Add the config details in 'constants/global.js'
4. Run 'yarn' or use npm to install packages.
5. Start the application 'npm start'

## App Setup
1. Use ngrok to setup a tunnel
2. Create a new app in slack and configure command.
3. Add app to workspace
4. Happy sharing :)
