const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate a message to French 🇫🇷')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('The text to translate')
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('text');

    try {
      const res = await fetch('https://translate.argosopentech.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: 'fr',
          format: 'text'
        }),
      });

      const data = await res.json();

      if (!data.translatedText) throw new Error('No translation received');

      const responseMessage = `${text} in French 🇫🇷 is *"${data.translatedText}"*`;
      await interaction.reply({ content: responseMessage });

    } catch (err) {
      console.error('Translation Error:', err);
      await interaction.reply({
        content: "Whoops, I can't translate that right now. Please try again later.",
        ephemeral: true,
      });
    }
  },
};