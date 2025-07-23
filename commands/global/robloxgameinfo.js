const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const delay = ms => new Promise(r => setTimeout(r, ms));

const gameCache = new Map();
const gameCooldowns = new Map();
const COOLDOWN_TIME = 60000; // 1 minute cooldown per universe ID

const userCooldowns = new Map();
const USER_COOLDOWN_TIME = 60000; // 1 minute cooldown per Discord user

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxgameinfo')
    .setDescription('Get info about a Roblox game by keyword')
    .addStringOption(option =>
      option.setName('keyword')
        .setDescription('Search keyword or game name')
        .setRequired(true)
    ),
  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const now = Date.now();

    // User cooldown check
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

    const keyword = interaction.options.getString('keyword');
    await interaction.deferReply();

    // Search games by keyword
    let searchResults;
    try {
      const searchRes = await axios.get(`https://search.roblox.com/catalog/json?Category=1&SortType=Relevance&Keyword=${encodeURIComponent(keyword)}`);
      searchResults = searchRes.data;
    } catch (err) {
      console.error('Game search error:', err);
      return interaction.editReply('Error searching for games. Try again later.');
    }

    if (!searchResults.length) {
      return interaction.editReply(`No games found matching "${keyword}".`);
    }

    const universeId = searchResults[0].UniverseId || searchResults[0].universeId;
    if (!universeId) {
      return interaction.editReply('Could not find a valid Universe ID for the top result.');
    }

    // Game cooldown check by universeId
    const cooldownTimestamp = gameCooldowns.get(universeId);
    if (cooldownTimestamp && (now - cooldownTimestamp < COOLDOWN_TIME)) {
      const remainingUnix = Math.floor((cooldownTimestamp + COOLDOWN_TIME) / 1000);
      return interaction.editReply(`Please wait until <t:${remainingUnix}:R> before requesting info for "${keyword}" again.`);
    }

    try {
      const game = await fetchRobloxGame(universeId);
      if (!game || !game.name) {
        return interaction.editReply(`Game info for "${keyword}" could not be retrieved.`);
      }

      const createdDate = new Date(game.created);
      const yearPublished = isNaN(createdDate.getTime()) ? 'Unknown' : createdDate.getFullYear().toString();
      const thumbnailUrl = await fetchGameThumbnail(universeId);

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setTitle(`<:roblox:1397454614520926350> Game Info: ${game.name}`)
        .setDescription(game.description || '*No description provided.*')
        .addFields(
          { name: 'Published Year', value: yearPublished, inline: true },
          { name: 'Players Online', value: game.playing.toLocaleString(), inline: true },
          { name: 'Visits', value: game.visits.toLocaleString(), inline: true }
        )
        .setImage(thumbnailUrl)
        .setFooter({ text: 'Data provided by Roblox API' })
        .setTimestamp();

      gameCooldowns.set(universeId, now);
      gameCache.set(universeId, game);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply('Error fetching game info. Try again later.');
    }
  }
};

async function fetchRobloxGame(universeId) {
  const now = Date.now();
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await axios.get(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
      const game = res.data?.data?.[0];

      return game || null;
    } catch (err) {
      if (err.response?.status === 429) await delay(1000 * (attempt + 1));
      else {
        console.error('Game fetch error:', err);
        break;
      }
    }
  }

  return null;
}

async function fetchGameThumbnail(universeId) {
  try {
    const res = await axios.get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`);
    return res.data?.data?.[0]?.imageUrl || '';
  } catch (err) {
    console.error('Thumbnail fetch error:', err);
    return '';
  }
}