const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('talk')
    .setDescription('Make the bot say something anonymously.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message for the bot to say')
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('message');

    // Defer the reply to avoid timeout
    await interaction.deferReply({ ephemeral: true });

    // Reply privately to the user that the message was sent
    await interaction.editReply({ content: 'Message sent anonymously.' });

    // Send the message as the bot in the channel where the command was used
    await interaction.channel.send(text);
  },
};
