const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play rock-paper-scissors with a select menu'),

  async execute(interaction) {
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rps_select')
          .setPlaceholder('Choose your move...')
          .addOptions([
            { label: 'Rock', description: 'Choose Rock', value: 'rock', emoji: '🪨' },
            { label: 'Paper', description: 'Choose Paper', value: 'paper', emoji: '📄' },
            { label: 'Scissors', description: 'Choose Scissors', value: 'scissors', emoji: '✂️' },
          ])
      );

    await interaction.reply({ content: 'Choose your move:', components: [row] });
  }
};