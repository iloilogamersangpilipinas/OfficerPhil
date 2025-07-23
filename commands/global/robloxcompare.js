const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const robloxCache = new Map(); // Cache user data by username
const robloxCooldowns = new Map(); // Cooldown per username for API fetch (seconds)
const userCooldowns = new Map(); // Cooldown per Discord user (seconds)

const COOLDOWN_TIME = 60; // seconds

const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxcompare')
    .setDescription('Compare two Roblox users')
    .addStringOption(option =>
      option.setName('user1')
        .setDescription('First Roblox username')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('user2')
        .setDescription('Second Roblox username')
        .setRequired(true)),
  
  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const now = Math.floor(Date.now() / 1000);

    // User cooldown check
    const userLastUsed = userCooldowns.get(discordUserId);
    if (userLastUsed && now - userLastUsed < COOLDOWN_TIME) {
      const remaining = COOLDOWN_TIME - (now - userLastUsed);
      const cooldownEnds = userLastUsed + COOLDOWN_TIME;
      return interaction.reply({
        content: `⏳ Please wait ${remaining}s before using this command again. Cooldown ends <t:${cooldownEnds}:R>.`,
        ephemeral: true
      });
    }
    userCooldowns.set(discordUserId, now);

    const username1 = interaction.options.getString('user1');
    const username2 = interaction.options.getString('user2');

    await interaction.deferReply();

    try {
      // Fetch data for both users concurrently
      const [user1, user2] = await Promise.all([
        fetchRobloxUserWithCooldown(username1, now),
        fetchRobloxUserWithCooldown(username2, now)
      ]);

      if (!user1) return interaction.editReply(`User "${username1}" not found.`);
      if (!user2) return interaction.editReply(`User "${username2}" not found.`);

      // Fetch other data concurrently
      const [
        games1, games2,
        groups1, groups2,
        badges1, badges2,
        price1, price2
      ] = await Promise.all([
        getGamesCreated(user1.id),
        getGamesCreated(user2.id),
        getGroupsCount(user1.id),
        getGroupsCount(user2.id),
        getBadgesCount(user1.id),
        getBadgesCount(user2.id),
        getAvatarPrice(user1.id),
        getAvatarPrice(user2.id),
      ]);

      // Format helpers
      function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toDateString();
      }
      function formatRobux(price) {
        return price.toLocaleString() + ' R$';
      }

      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: `Roblox User Comparison: ${username1} vs ${username2}`, 
          iconURL: 'https://i.imgur.com/Y5egr1d.png' 
        })
        .setColor('#FF0000')
        .addFields(
          { name: '**Account Age**', value: `${username1}: ${formatDate(user1.created)}\n${username2}: ${formatDate(user2.created)}`, inline: false },
          { name: '**Games Created**', value: `${username1}: ${games1}\n${username2}: ${games2}`, inline: true },
          { name: '**Groups**', value: `${username1}: ${groups1}\n${username2}: ${groups2}`, inline: true },
          { name: '**Badges**', value: `${username1}: ${badges1}\n${username2}: ${badges2}`, inline: true },
          { name: '**Avatar Price**', value: `${username1}: ${formatRobux(price1)}\n${username2}: ${formatRobux(price2)}`, inline: true },
        )
        .setFooter({ text: `Cooldown: 60 seconds | Timestamp: ${now}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('Roblox Compare Error:', err);
      return interaction.editReply('❌ An error occurred while fetching Roblox user data. Please try again later.');
    }
  }
};

// Fetch user with cooldown & cache, with retry on 429
async function fetchRobloxUserWithCooldown(username, now) {
  const lastUsed = robloxCooldowns.get(username);
  if (lastUsed && now - lastUsed < COOLDOWN_TIME && robloxCache.has(username)) {
    return robloxCache.get(username); // Return cached data
  }

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const searchRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`);
      if (!searchRes.data.data.length) {
        robloxCooldowns.set(username, now);
        robloxCache.set(username, null);
        return null;
      }
      const userBasic = searchRes.data.data[0];
      const userDetailsRes = await axios.get(`https://users.roblox.com/v1/users/${userBasic.id}`);

      robloxCooldowns.set(username, now);
      robloxCache.set(username, userDetailsRes.data);
      return userDetailsRes.data;

    } catch (err) {
      if (err.response?.status === 429) {
        await delay(1000 * (attempt + 1)); // backoff
      } else {
        console.error(`Error fetching user "${username}":`, err.message);
        break;
      }
    }
  }

  robloxCooldowns.set(username, now);
  robloxCache.set(username, null);
  return null;
}

// Helpers for other data fetching (no retries for brevity)
async function getGamesCreated(userId) {
  try {
    const res = await axios.get(`https://apis.roblox.com/universes/v1/users/${userId}/universes`);
    return res.data.data?.length || 0;
  } catch {
    return 0;
  }
}

async function getGroupsCount(userId) {
  try {
    const res = await axios.get(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
    return res.data.data?.length || 0;
  } catch {
    return 0;
  }
}

async function getBadgesCount(userId) {
  try {
    const res = await axios.get(`https://badges.roblox.com/v1/users/${userId}/badges?limit=100`);
    return res.data.data?.length || 0;
  } catch {
    return 0;
  }
}

async function getAvatarPrice(userId) {
  try {
    const res = await axios.get(`https://avatar.roblox.com/v1/users/${userId}/currently-wearing`);
    const assetIds = res.data.assetIds || [];
    if (assetIds.length === 0) return 0;

    let totalPrice = 0;
    for (let i = 0; i < assetIds.length; i += 100) {
      const chunk = assetIds.slice(i, i + 100);
      const idsParam = chunk.join(',');

      const priceRes = await axios.get(`https://economy.roblox.com/v2/assets/${idsParam}/resale-data`);
      if (priceRes.data.data) {
        for (const asset of priceRes.data.data) {
          if (asset.price !== null) totalPrice += asset.price;
        }
      }
    }
    return totalPrice;
  } catch {
    return 0;
  }
}