const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invitetosr')
    .setDescription("Gets the invite link to the bot's server"),

  async execute(interaction) {
    const inviteLink = 'https://discord.gg/RcnEvSBBuV';

    const embed = new EmbedBuilder()
      .setColor(0x014aad)
      .setTitle('WANNA JOIN OUR SERVER?')
      .setDescription('## The Republic of Supreme Rendezvous ##\n\n' + inviteLink)
      .setImage('https://i.imgur.com/em0epGU.png')
      .setTimestamp()
      .setFooter({ text: 'See you there!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};