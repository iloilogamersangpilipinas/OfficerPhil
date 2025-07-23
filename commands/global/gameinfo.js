const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const delay = ms => new Promise(r => setTimeout(r, ms));

const gameCache = new Map();
const gameCooldowns = new Map();
const COOLDOWN_TIME = 60000; // 1 minute cooldown for game ID

const userCooldowns = new Map();
const USER_COOLDOWN_TIME = 60000; // 1 minute cooldown per Discord user

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gameinfo')
    .setDescription('Get info about a Roblox game')
    .addStringOption(option =>
      option.setName('gameid')
        .setDescription('Roblox Universe ID (game ID)')
        .setRequired(true)
    ),
  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const now = Date.now();

    // Discord user cooldown check
    if (userCooldowns.has(discordUserId)) {
      const lastUsed = userCooldowns.get(discordUserId);
      if (now - lastUsed < USER_COOLDOWN_TIME) {
        const remainingUnix = Math.floor((lastUsed + USER_COOLDOWN_TIME) / 1000);
        return interaction.reply({
          content: `Please wait until <t:${remainingUnix}:R> before using this command again.`,
          ephemeral: true
        });
      }
    }
    userCooldowns.set(discordUserId, now);

    const gameId = interaction.options.getString('gameid');
    await interaction.deferReply();

    // Game cooldown check
    const cooldownTimestamp = gameCooldowns.get(gameId);
    if (cooldownTimestamp && (now - cooldownTimestamp < COOLDOWN_TIME)) {
      const remainingUnix = Math.floor((cooldownTimestamp + COOLDOWN_TIME) / 1000);
      return interaction.editReply(`Please wait until <t:${remainingUnix}:R> before using this command again.`);
    }

    try {
      const game = await fetchRobloxGame(gameId);
      if (!game || !game.name) {
        return interaction.editReply(`Game with ID "${gameId}" not found.`);
      }

      const createdDate = new Date(game.created);
      const yearPublished = isNaN(createdDate.getTime()) ? 'Unknown' : createdDate.getFullYear().toString();
      const thumbnailUrl = await fetchGameThumbnail(gameId);

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({
          name: `Game Info: ${game.name}`,
          iconURL: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Roblox_Logo_2022.png'
        })
        .setDescription(game.description || '*No description provided.*')
        .addFields(
          { name: 'Published Year', value: yearPublished, inline: true },
          { name: 'Players Online', value: game.playing.toLocaleString(), inline: true },
          { name: 'Visits', value: game.visits.toLocaleString(), inline: true }
        )
        .setImage(thumbnailUrl)
        .setFooter({ text: 'Data provided by Roblox API' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply('Error fetching game info. Try again later.');
    }
  }
};

async function fetchRobloxGame(gameId) {
  const now = Date.now();
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await axios.get(`https://games.roblox.com/v1/games?universeIds=${gameId}`);
      const game = res.data?.data?.[0];

      gameCooldowns.set(gameId, now);
      gameCache.set(gameId, game || null);
      return game || null;
    } catch (err) {
      if (err.response?.status === 429) await delay(1000 * (attempt + 1));
      else {
        console.error('Game fetch error:', err);
        break;
      }
    }
  }

  gameCooldowns.set(gameId, now);
  gameCache.set(gameId, null);
  return null;
}

async function fetchGameThumbnail(gameId) {
  try {
    const res = await axios.get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${gameId}&size=512x512&format=Png&isCircular=false`);
    return res.data?.data?.[0]?.imageUrl || '';
  } catch (err) {
    console.error('Thumbnail fetch error:', err);
    return '';
  }
}