const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = '1396760691003752562'; // Your bot's client ID
const GUILD_ID = '1152050425986551888';  // Your server ID

// Function to load commands from a folder
function loadCommands(folderPath) {
  const commands = [];
  if (!fs.existsSync(folderPath)) return commands; // Skip if folder doesn't exist

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command.data) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`⚠️ Skipping ${file}: no 'data' property`);
    }
  }
  return commands;
}

// Load commands
const guildOnlyCommands = loadCommands(path.join(__dirname, 'commands', 'guildOnly'));
const globalCommands = loadCommands(path.join(__dirname, 'commands', 'global'));

// Merge commands for your guild
const commandsForGuild = [...guildOnlyCommands, ...globalCommands];

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('🧹 Clearing existing guild commands...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });

    console.log('🧹 Clearing existing global commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });

    console.log(`🔄 Registering ${commandsForGuild.length} commands for your guild...`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commandsForGuild });

    console.log(`🔄 Registering ${globalCommands.length} global commands...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands });

    console.log('✅ Successfully deployed guild-only and global commands.');
  } catch (error) {
    console.error(error);
  }
})();