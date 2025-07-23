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
      const res = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: 'fr',
          format: 'text',
        }),
      });

      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }

      const data = await res.json();

      if (!data.translatedText) {
        throw new Error('No translation received from API.');
      }

      const responseMessage = `${text} in French 🇫🇷 is *"${data.translatedText}"*`;
      await interaction.reply({ content: responseMessage });

    } catch (error) {
      console.error('Translation Error:', error);
      await interaction.reply({
        content: "Whoops, I can't translate that right now. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
