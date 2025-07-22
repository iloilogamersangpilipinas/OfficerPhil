const { REST, Routes } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Your bot's client ID
const GUILD_ID = process.env.GUILD_ID;   // Your guild ID

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

// Load guild-only commands
const guildCommandsPath = path.join(__dirname, 'commands', 'guildOnly');
const guildCommandFiles = fs.existsSync(guildCommandsPath)
  ? fs.readdirSync(guildCommandsPath).filter(file => file.endsWith('.js'))
  : [];
const guildCommands = guildCommandFiles.map(file => {
  const command = require(path.join(guildCommandsPath, file));
  return command.data.toJSON();
});

// Load global commands
const globalCommandsPath = path.join(__dirname, 'commands', 'global');
const globalCommandFiles = fs.existsSync(globalCommandsPath)
  ? fs.readdirSync(globalCommandsPath).filter(file => file.endsWith('.js'))
  : [];
const globalCommands = globalCommandFiles.map(file => {
  const command = require(path.join(globalCommandsPath, file));
  return command.data.toJSON();
});

(async () => {
  try {
    console.log('Refreshing application (/) commands...');

    // Register guild-only commands for your guild
    if (guildCommands.length > 0) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: guildCommands }
      );
      console.log(`Registered ${guildCommands.length} guild-only commands.`);
    }

    // Register global commands
    if (globalCommands.length > 0) {
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: globalCommands }
      );
      console.log(`Registered ${globalCommands.length} global commands.`);
    }

    console.log('All commands reloaded successfully.');
  } catch (error) {
    console.error(error);
  }
})();
