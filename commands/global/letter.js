const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const sweetMessages = [
  "Aww.. you're so sweet! 💖",
  "You're too kind! 🌟",
  "Sending good vibes your way! 😊",
  "Such a thoughtful person! 💌",
  "Your kindness makes the world better! 🌈",
  "Keep being amazing! ✨",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('letter')
    .setDescription('Send a private DM letter to another user')
    .addUserOption(option =>
      option.setName('recipient')
        .setDescription('Who do you want to send the letter to?')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message content')
        .setRequired(true)),

  async execute(interaction) {
    const sender = interaction.user;
    const recipient = interaction.options.getUser('recipient');
    const messageContent = interaction.options.getString('message');

    // Get the server name where the command was used
    const serverName = interaction.guild ? interaction.guild.name : 'a Discord server';

    if (recipient.bot) {
      const randomSweet = sweetMessages[Math.floor(Math.random() * sweetMessages.length)];
      const sweetEmbed = new EmbedBuilder()
        .setTitle("💖 Sweet Message Just For You!")
        .setDescription(randomSweet)
        .setColor(0xFFC0CB)
        .setFooter({ text: "Your kindness is appreciated!" }) // Keep this one as is or change if you prefer
        .setTimestamp();

      try {
        await sender.send({ embeds: [sweetEmbed] });
        await interaction.reply({ content: "I sent you a sweet message in DMs! 💌", ephemeral: true });
      } catch (error) {
        console.error('Error sending sweet DM:', error);
        await interaction.reply({ content: "I couldn't DM you. Please check your privacy settings.", ephemeral: true });
      }
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`**${sender.username} has sent you a message.**`)
      .setDescription(`The letter says:\n"${messageContent}"`)
      .setFooter({ text: `Sent from ${serverName}` }) // <-- Changed this line
      .setColor(0x00AE86)
      .setTimestamp();

    try {
      await recipient.send({ content: `<@${recipient.id}>`, embeds: [embed] });
      await interaction.reply({ content: `Your letter has been sent to <@${recipient.id}>!`, ephemeral: true });
    } catch (error) {
      console.error('Error sending DM:', error);
      await interaction.reply({
        content: `Failed to send DM to <@${recipient.id}>. They might have DMs disabled.`,
        ephemeral: true,
      });
    }
  }, // closes async execute
}; // closes module.exports