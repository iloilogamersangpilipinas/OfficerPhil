const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const delay = ms => new Promise(r => setTimeout(r, ms));

// Cooldown time in milliseconds
const COOLDOWN_TIME_MS = 60000; // 1 minute per universe ID
const USER_COOLDOWN_TIME_MS = 60000; // 1 minute per user

// Store cooldown timestamps in Unix seconds for Discord timestamps
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
        content: `Please wait ${remaining}s before using this command again. Cooldown ends <t:${cooldownEnds}:R>.`,
        ephemeral: true
      });
    }
    userCooldowns.set(discordUserId, nowSec);

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
    const gameLastUsed = gameCooldowns.get(universeId);
    if (gameLastUsed && nowMs - gameLastUsed * 1000 < COOLDOWN_TIME_MS) {
      const cooldownEnds = gameLastUsed + COOLDOWN_TIME_MS / 1000;
      const remaining = cooldownEnds - nowSec;
      return interaction.editReply(`Please wait ${remaining}s before requesting info for "${keyword}" again. Cooldown ends <t:${cooldownEnds}:R>.`);
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
        .setAuthor({
          name: `Game Info: ${game.name}`,
          iconURL: 'https://i.imgur.com/Y5egr1d.png'
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

      gameCooldowns.set(universeId, nowSec);

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