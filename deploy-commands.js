const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = '1396760691003752562'; // Your bot's client ID
const GUILD_ID = '1152050425986551888';   // Your guild/server ID

// Automatically load all commands from commands/global
const commandsPath = path.join(__dirname, 'commands', 'global');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`⚠️ Skipping ${file}: no 'data' property`);
  }
}

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log('✅ Successfully registered all commands.');
  } catch (error) {
    console.error(error);
  }
})();