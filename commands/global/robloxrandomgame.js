const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Cooldown in milliseconds
const COOLDOWN_TIME_MS = 60000; // 1 min per universeId
const USER_COOLDOWN_TIME_MS = 60000; // 1 min per user

// Store cooldown timestamps in Unix seconds
const gameCooldowns = new Map(); // universeId -> timestamp in seconds
const userCooldowns = new Map(); // discordUserId -> timestamp in seconds

// List of handpicked game universeIds (these are popular public games)
const universeIds = [
  292439477,   // Apocalypse Rising
  2788229376,  // Blox Fruits
  920587237,   // Adopt Me
  537413528,   // Arsenal
  10275074885, // Pet Simulator X
  155615604,   // Prison Life
  3260590327,  // Doors
  4483381587,  // Brookhaven
  6678870192,  // BedWars
  843468296    // Royale High
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxrandomgame')
    .setDescription('Show a random popular Roblox game.'),

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

    await interaction.deferReply();

    // Pick a random universe ID
    const universeId = universeIds[Math.floor(Math.random() * universeIds.length)];

    // Game cooldown check
    const gameLastUsed = gameCooldowns.get(universeId);
    if (gameLastUsed && nowMs - gameLastUsed * 1000 < COOLDOWN_TIME_MS) {
      const cooldownEnds = gameLastUsed + COOLDOWN_TIME_MS / 1000;
      const remaining = cooldownEnds - nowSec;
      return interaction.editReply(`⏳ This random game was shown recently. Try again in ${remaining}s. Cooldown ends <t:${cooldownEnds}:R>.`);
    }

    try {
      // Get game details
      const detailedRes = await axios.get(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
      const detailedGame = detailedRes.data?.data?.[0];

      if (!detailedGame) {
        return interaction.editReply('❌ Failed to fetch game details.');
      }

      // Get game thumbnail
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
          iconURL: 'https://i.imgur.com/Y5egr1d.png',
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
      console.error('Error fetching random game:', err);
      await interaction.editReply('❌ Error fetching game data. Try again later.');
    }
  }
};