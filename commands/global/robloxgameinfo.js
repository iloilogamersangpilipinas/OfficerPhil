const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const delay = ms => new Promise(r => setTimeout(r, ms));
const COOLDOWN_TIME_MS = 60000; // 1 minute
const USER_COOLDOWN_TIME_MS = 60000;

const gameCooldowns = new Map();
const userCooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxgameinfo')
    .setDescription('Get info about a Roblox game by keyword')
    .addStringOption(option =>
      option.setName('keyword')
        .setDescription('Game name or keyword')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);

    // User cooldown check
    const userLastUsed = userCooldowns.get(discordUserId);
    if (userLastUsed && nowMs - userLastUsed < USER_COOLDOWN_TIME_MS) {
      const cooldownEnds = Math.floor((userLastUsed + USER_COOLDOWN_TIME_MS) / 1000);
      const remaining = cooldownEnds - nowSec;
      return interaction.reply({
        content: `Please wait ${remaining}s before using this command again. Cooldown ends <t:${cooldownEnds}:R>.`,
        ephemeral: true
      });
    }
    userCooldowns.set(discordUserId, nowMs);

    const keyword = interaction.options.getString('keyword');
    await interaction.deferReply();

    // Search games with the proper games API
    let searchResults;
    try {
      const searchRes = await axios.get(`https://games.roblox.com/v1/games/list?keyword=${encodeURIComponent(keyword)}&limit=10&sortOrder=Asc`);
      searchResults = searchRes.data?.data || [];
    } catch (err) {
      console.error('Game search error:', err);
      return interaction.editReply('Error searching for games. Try again later.');
    }

    if (!searchResults.length) {
      return interaction.editReply(`No games found matching "${keyword}".`);
    }

    const game = searchResults[0];
    const universeId = game.universeId;

    // Game cooldown check by universeId
    const gameLastUsed = gameCooldowns.get(universeId);
    if (gameLastUsed && nowMs - gameLastUsed < COOLDOWN_TIME_MS) {
      const cooldownEnds = Math.floor((gameLastUsed + COOLDOWN_TIME_MS) / 1000);
      const remaining = cooldownEnds - nowSec;
      return interaction.editReply(`Please wait ${remaining}s before requesting info for "${keyword}" again. Cooldown ends <t:${cooldownEnds}:R>.`);
    }

    try {
      const gameDetails = await fetchRobloxGame(universeId);
      if (!gameDetails || !gameDetails.name) {
        return interaction.editReply(`Game info for "${keyword}" could not be retrieved.`);
      }

      const createdDate = new Date(gameDetails.created);
      const yearPublished = isNaN(createdDate.getTime()) ? 'Unknown' : createdDate.getFullYear().toString();
      const thumbnailUrl = await fetchGameThumbnail(universeId);

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setTitle(`🎮 Game Info: ${gameDetails.name}`)
        .setDescription(gameDetails.description || '*No description provided.*')
        .addFields(
          { name: 'Published Year', value: yearPublished, inline: true },
          { name: 'Players Online', value: gameDetails.playing.toLocaleString(), inline: true },
          { name: 'Visits', value: gameDetails.visits.toLocaleString(), inline: true }
        )
        .setImage(thumbnailUrl)
        .setFooter({ text: 'Data provided by Roblox API' })
        .setTimestamp();

      gameCooldowns.set(universeId, nowMs);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply('Error fetching game info. Try again later.');
    }
  }
};

async function fetchRobloxGame(universeId) {
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