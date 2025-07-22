const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('animal')
        .setDescription('Get a random cat or dog image.')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Choose an animal')
                .setRequired(true)
                .addChoices(
                    { name: 'Cat', value: 'cat' },
                    { name: 'Dog', value: 'dog' }
                )
        ),
    async execute(interaction) {
        const type = interaction.options.getString('type');
        let imageUrl;
        let apiUrl;
        let title;

        try {
            if (type === 'cat') {
                apiUrl = 'https://api.thecatapi.com/v1/images/search';
                const response = await axios.get(apiUrl);
                imageUrl = response.data[0].url;
                title = '🐱 Here is a random cat!';
            } else if (type === 'dog') {
                apiUrl = 'https://dog.ceo/api/breeds/image/random';
                const response = await axios.get(apiUrl);
                imageUrl = response.data.message;
                title = '🐶 Here is a random dog!';
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setImage(imageUrl)
                .setColor(0x00AE86)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply('Failed to fetch an animal image. Please try again later!');
        }
    }
};