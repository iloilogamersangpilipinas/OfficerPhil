const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const robloxCache = new Map();
const robloxCooldowns = new Map();
const userCooldowns = new Map();
const COOLDOWN_TIME = 60; // seconds

const delay = ms => new Promise(res => setTimeout(res, ms));

function isValidRobloxUsername(name) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(name);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxcompare')
    .setDescription('Compare two Roblox users (Groups, Badges, Avatar Price)')
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

    // Get and validate usernames
    let username1 = interaction.options.getString('user1').trim();
    let username2 = interaction.options.getString('user2').trim();

    if (!isValidRobloxUsername(username1) || !isValidRobloxUsername(username2)) {
      return interaction.reply({ content: '❌ One or both usernames are invalid Roblox usernames. Usernames must be 3-20 characters long and contain only letters, numbers, or underscores.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      // Fetch both users' basic info
      const [user1, user2] = await Promise.all([
        fetchRobloxUserWithCooldown(username1, now),
        fetchRobloxUserWithCooldown(username2, now)
      ]);

      if (!user1) return interaction.editReply(`❌ User "${username1}" not found.`);
      if (!user2) return interaction.editReply(`❌ User "${username2}" not found.`);

      // Fetch only groups, badges, avatar price concurrently
      const [
        groups1, groups2,
        badges1, badges2,
        price1, price2
      ] = await Promise.all([
        getGroupsCount(user1.id),
        getGroupsCount(user2.id),
        getBadgesCount(user1.id),
        getBadgesCount(user2.id),
        getAvatarPrice(user1.id),
        getAvatarPrice(user2.id),
      ]);

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

async function fetchRobloxUserWithCooldown(username, now) {
  const lastUsed = robloxCooldowns.get(username);
  if (lastUsed && now - lastUsed < COOLDOWN_TIME && robloxCache.has(username)) {
    return robloxCache.get(username);
  }

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const searchRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`);
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
        await delay(1000 * (attempt + 1));
      } else if (err.response?.status === 400) {
        console.warn(`Roblox API returned 400 Bad Request for username "${username}". Treating as not found.`);
        break;
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