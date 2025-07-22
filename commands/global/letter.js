const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('letter')
    .setDescription('Send a private message (DM) to another user through the bot')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user you want to send a letter to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message you want to send')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const message = interaction.options.getString('message');
    const sender = interaction.user;
    const sentAt = new Date();

    const embed = new EmbedBuilder()
      .setTitle(`${sender.tag} has sent you a letter.`)
      .setDescription(`*"${message}"*`)
      .setFooter({ text: `Sent at ${sentAt.toLocaleString()}` })
      .setColor(0x1D82B6);

    try {
      // Send the embed as DM to the target user
      await targetUser.send({ embeds: [embed] });

      await interaction.reply({ content: `Your letter was sent to ${targetUser.tag}.`, ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: `I couldn't send a DM to ${targetUser.tag}. They might have DMs disabled.`, ephemeral: true });
    }
  },
};