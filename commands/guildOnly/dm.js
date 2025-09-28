const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a DM to another user through the bot')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to DM')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const message = interaction.options.getString('message');

    try {
      // Attempt to send DM
      await targetUser.send(`${message}`);
      // Confirmation visible only to the command executor
      await interaction.reply({ 
        content: `✅ Message successfully sent to <@${targetUser.id}>`, 
        ephemeral: true 
      });
    } catch (error) {
      console.error(`Failed to DM ${targetUser.tag}:`, error);
      // Handle users who cannot receive DMs
      await interaction.reply({ 
        content: `❌ Could not send the DM to <@${targetUser.id}>. They may have DMs disabled.`, 
        ephemeral: true 
      });
    }
  },
};