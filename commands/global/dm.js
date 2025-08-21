const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a DM to another user through the bot.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user you want to DM')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const message = interaction.options.getString('message');

    try {
      await targetUser.send(`📩 **Message from ${interaction.user.tag}:**\n${message}`);
      await interaction.reply({ content: `✅ Your message was sent to **${targetUser.tag}**`, ephemeral: true });
    } catch (err) {
      console.error('Error sending DM:', err);
      await interaction.reply({ content: `⚠️ I couldn’t DM **${targetUser.tag}**. They might have DMs disabled.`, ephemeral: true });
    }
  },
};