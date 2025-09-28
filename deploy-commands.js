const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = '1396760691003752562';
const GUILD_ID = '1152050425986551888';

// Load commands from a folder
function loadCommands(folderPath) {
  const commandsPath = path.join(__dirname, 'commands', folderPath);
  if (!fs.existsSync(commandsPath)) return [];
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

  return commands;
}

// Load global and guild commands
const globalCommands = loadCommands('global');
const guildCommands = loadCommands('guildOnly');

console.log('Global commands loaded:', globalCommands.map(c => c.name));
console.log('Guild commands loaded:', guildCommands.map(c => c.name));

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands...');

    // Register global commands
    if (globalCommands.length > 0) {
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: globalCommands },
      );
      console.log(`✅ Registered ${globalCommands.length} global commands.`);
    }

    // Register guild commands
    if (guildCommands.length > 0) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: guildCommands },
      );
      console.log(`✅ Registered ${guildCommands.length} guild commands in server ${GUILD_ID}.`);
    } else {
      console.log('⚠️ No guild commands found to register.');
    }

    console.log('✅ All commands registration finished.');
  } catch (error) {
    console.error(error);
  }
})();