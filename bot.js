const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// Load command files from commands/guildOnly folder
const commandsPath = path.join(__dirname, 'commands', 'guildOnly');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }
}

console.log(`Loaded commands: ${[...client.commands.keys()]}`);

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({ activities: [{ name: 'Roblox', type: 0 }], status: 'online' });
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      console.log(`Command received: ${interaction.commandName}`);
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.log('No matching command found.');
        return;
      }
      await command.execute(interaction);
    } else if (interaction.isStringSelectMenu()) {
      console.log(`SelectMenu interaction with customId: ${interaction.customId}`);
      if (interaction.customId === 'use_item_select') {
        const selectedItem = interaction.values[0];
        console.log(`Selected item: ${selectedItem}`);
        const shopCommand = client.commands.get('shop');

        if (!shopCommand) {
          console.log('Shop command not found in collection.');
          return interaction.reply({ content: 'Shop command not found.', ephemeral: true });
        }
        if (typeof shopCommand.useItem !== 'function') {
          console.log('useItem function not found on shop command.');
          return interaction.reply({ content: 'Shop command or useItem handler not found.', ephemeral: true });
        }

        const response = await shopCommand.useItem(interaction.user.id, selectedItem, interaction);
        return interaction.update({ embeds: [response.embed], components: [], content: null });
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'There was an error processing your command.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);