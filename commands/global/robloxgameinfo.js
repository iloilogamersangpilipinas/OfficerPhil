const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const delay = ms => new Promise(res => setTimeout(res, ms));

// Cooldown in milliseconds
const COOLDOWN_TIME_MS = 60000; // 1 min per universeId
const USER_COOLDOWN_TIME_MS = 60000; // 1 min per user

// Store cooldown timestamps in Unix seconds
const gameCooldowns = new Map(); // universeId -> timestamp in seconds
const userCooldowns = new Map(); // discordUserId -> timestamp in seconds

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
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);

    // User cooldown check
    const userLastUsed = userCooldowns.get(discordUserId);
    if (userLastUsed && nowMs - userLastUsed * 1000 < USER_COOLDOWN_TIME_MS) {
      const cooldownEnds = userLastUsed + USER_COOLDOWN_TIME_MS / 1000;
      const remaining = cooldownEnds - nowSec;
      return interaction.reply({
        content: `⏳ Please wait ${remaining}s before using this command again. Cooldown ends <t:${cooldownEnds}:R>.`,
        ephemeral: true
      });
    }
    userCooldowns.set(discordUserId, nowSec);

    const keyword = interaction.options.getString('keyword');
    await interaction.deferReply();

    // Search games by keyword using new games list endpoint
    let searchResults;
    try {
      const searchRes = await axios.get(`https://games.roblox.com/v1/games/list`, {
        params: {
          searchTerm: keyword,
          limit: 10,
          sortOrder: "Asc"
        }
      });
      searchResults = searchRes.data?.data || [];
    } catch (err) {
      console.error('Game search error:', err);
      return interaction.editReply('❌ Error searching for games. Try again later.');
    }

    if (!searchResults.length) {
      return interaction.editReply(`❌ No games found matching "${keyword}".`);
    }

    const game = searchResults[0];
    const universeId = game.universeId;
    if (!universeId) {
      return interaction.editReply('❌ Could not find a valid Universe ID for the top result.');
    }

    // Game cooldown check by universeId
    const gameLastUsed = gameCooldowns.get(universeId);
    if (gameLastUsed && nowMs - gameLastUsed * 1000 < COOLDOWN_TIME_MS) {
      const cooldownEnds = gameLastUsed + COOLDOWN_TIME_MS / 1000;
      const remaining = cooldownEnds - nowSec;
      return interaction.editReply(`⏳ Please wait ${remaining}s before requesting info for "${keyword}" again. Cooldown ends <t:${cooldownEnds}:R>.`);
    }

    try {
      // Fetch detailed game info by universeId (some fields might be redundant but we keep consistency)
      const detailedRes = await axios.get(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
      const detailedGame = detailedRes.data?.data?.[0] || game;

      // Thumbnail (game icon)
      const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/games/icons`, {
        params: {
          universeIds: universeId,
          size: "512x512",
          format: "Png",
          isCircular: false
        }
      });
      const thumbnailUrl = thumbRes.data?.data?.[0]?.imageUrl || '';

      // Format creation year
      const createdDate = new Date(detailedGame.created);
      const yearPublished = isNaN(createdDate.getTime()) ? 'Unknown' : createdDate.getFullYear().toString();

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({
          name: `Game Info: ${detailedGame.name}`,
          iconURL: 'https://i.imgur.com/Y5egr1d.png', // Roblox transparent logo from Imgur
          url: `https://www.roblox.com/games/${detailedGame.rootPlaceId || universeId}`
        })
        .setDescription(detailedGame.description || '*No description provided.*')
        .addFields(
          { name: 'Published Year', value: yearPublished, inline: true },
          { name: 'Players Online', value: detailedGame.playing?.toLocaleString() || 'N/A', inline: true },
          { name: 'Visits', value: detailedGame.visits?.toLocaleString() || 'N/A', inline: true }
        )
        .setImage(thumbnailUrl)
        .setFooter({ text: 'Data provided by Roblox API' })
        .setTimestamp();

      gameCooldowns.set(universeId, nowSec);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error fetching detailed game info:', err);
      await interaction.editReply('❌ Error fetching game info. Try again later.');
    }
  }
};