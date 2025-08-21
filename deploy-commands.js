const { REST, Routes } = require('discord.js');
require('dotenv').config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = '1396760691003752562'; // Replace with your bot's application client ID
const GUILD_ID = '1152050425986551888';   // Replace with your Discord server (guild) ID

const commands = [
  {
    name: 'robloxinfo',
    description: 'Get Roblox user info',
    options: [
      {
        name: 'username',
        type: 3, // STRING type
        description: 'Roblox username',
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
