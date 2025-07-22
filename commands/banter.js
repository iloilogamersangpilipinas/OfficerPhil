const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banter')
        .setDescription('Get a random meme or joke.')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Choose meme or joke')
                .setRequired(true)
                .addChoices(
                    { name: 'Meme', value: 'meme' },
                    { name: 'Joke', value: 'joke' }
                )
        ),
    async execute(interaction) {
        const type = interaction.options.getString('type');

        try {
            if (type === 'meme') {
                const response = await axios.get('https://meme-api.com/gimme');
                const meme = response.data;

                const memeEmbed = new EmbedBuilder()
                    .setTitle(meme.title)
                    .setURL(meme.postLink)
                    .setImage(meme.url)
                    .setColor(0x00AE86)
                    .setFooter({ text: `👍 ${meme.ups} | From r/${meme.subreddit}` });

                await interaction.reply({ embeds: [memeEmbed] });

            } else if (type === 'joke') {
                const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
                const joke = response.data;

                const jokeEmbed = new EmbedBuilder()
                    .setTitle('😂 Here\'s a joke for you!')
                    .setDescription(`${joke.setup}\n\n||${joke.punchline}||`)
                    .setColor(0x00AE86)
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [jokeEmbed] });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply('Failed to fetch a meme or joke. Please try again later!');
        }
    }
};
