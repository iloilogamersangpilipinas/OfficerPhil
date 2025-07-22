const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invitetosr')
    .setDescription("Sends an invite link embed for the Republic of Supreme Rendezvous server"),

  async execute(interaction) {
    const inviteLink = 'https://discord.gg/RcnEvSBBuV';

    const embed = new EmbedBuilder()
      .setColor(0x014aad)
      .setAuthor({
        name: 'rem_robloxboi',
        iconURL: 'https://cdn-icons-png.flaticon.com/512/2111/2111370.png',
        url: inviteLink,
      })
      .setTitle('The Republic of Supreme Rendezvous Discord Server')
      .setDescription(
        `**The Republic of Supreme Rendezvous** <:flag_sr:1397090597394710528> is a nation that consists of two islands, Supreme and Petit Rendezvous.\n\n` +
        'Created on September 14, 2023 (called Independence Day).\n\n' +
        'Named by *itznotalvinjk*.\n\n' +
        'We also have a functioning minister of defense, internal affairs, immigration, etc.\n\n' +
        `[Join us here!](${inviteLink})`
      )
      .setImage('https://i.imgur.com/em0epGU.png')
      .setTimestamp()
      .setFooter({ text: 'See you there!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
