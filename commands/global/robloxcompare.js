const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const cooldowns = new Map();

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
    const nowUnix = Math.floor(Date.now() / 1000);
    const userId = interaction.user.id;

    // Cooldown check
    if (cooldowns.has(userId)) {
      const expiration = cooldowns.get(userId);
      if (nowUnix < expiration) {
        const timeLeft = expiration - nowUnix;
        return interaction.reply({ content: `⏳ Please wait ${timeLeft} seconds before using this command again.`, ephemeral: true });
      }
    }

    const username1 = interaction.options.getString('user1');
    const username2 = interaction.options.getString('user2');

    // Helper to get userId from username
    async function getUserId(username) {
  const res = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`);
  if (!res.ok) throw new Error(`Failed to search for user "${username}"`);
  const data = await res.json();
  if (!data.data || data.data.length === 0) throw new Error(`User "${username}" not found`);
  return data.data[0].id;
}

    // Helper to get user info: join date
    async function getUserInfo(userId) {
      const res = await fetch(`https://users.roblox.com/v1/users/${userId}`);
      const data = await res.json();
      return data; // includes created (ISO8601 date)
    }

    // Helper to get number of games created (universe count)
    async function getGamesCreated(userId) {
      // Roblox API: https://games.roblox.com/v1/games/multiget-place-details?placeIds=...
      // Instead, use https://apis.roblox.com/universes/v1/users/${userId}/universes
      const res = await fetch(`https://apis.roblox.com/universes/v1/users/${userId}/universes`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.data?.length || 0;
    }

    // Helper to get groups count
    async function getGroupsCount(userId) {
      const res = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.data?.length || 0;
    }

    // Helper to get badges count
    async function getBadgesCount(userId) {
      const res = await fetch(`https://badges.roblox.com/v1/users/${userId}/badges?limit=100`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.data?.length || 0;
    }

    // Helper to get avatar assets and sum their prices (estimate avatar price)
    async function getAvatarPrice(userId) {
      // Get currently worn assets:
      // https://avatar.roblox.com/v1/users/${userId}/currently-wearing
      const res = await fetch(`https://avatar.roblox.com/v1/users/${userId}/currently-wearing`);
      if (!res.ok) return 0;
      const data = await res.json();
      const assetIds = data.assetIds || [];

      if (assetIds.length === 0) return 0;

      // Get prices for assets, Roblox has a limit for batch size, so chunk in 100
      let totalPrice = 0;

      for (let i = 0; i < assetIds.length; i += 100) {
        const chunk = assetIds.slice(i, i + 100);
        const idsParam = chunk.join(',');

        const priceRes = await fetch(`https://economy.roblox.com/v2/assets/${idsParam}/resale-data`);
        if (!priceRes.ok) continue;

        const priceData = await priceRes.json();
        if (priceData.data) {
          for (const asset of priceData.data) {
            if (asset.price !== null) totalPrice += asset.price;
          }
        }
      }

      return totalPrice;
    }

    try {
      // Fetch user IDs in parallel
      const [id1, id2] = await Promise.all([getUserId(username1), getUserId(username2)]);

      // Fetch all user data in parallel
      const [
        info1, info2,
        games1, games2,
        groups1, groups2,
        badges1, badges2,
        price1, price2
      ] = await Promise.all([
        getUserInfo(id1), getUserInfo(id2),
        getGamesCreated(id1), getGamesCreated(id2),
        getGroupsCount(id1), getGroupsCount(id2),
        getBadgesCount(id1), getBadgesCount(id2),
        getAvatarPrice(id1), getAvatarPrice(id2),
      ]);

      // Format dates for account age
      function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toDateString();
      }

      // Format price as Robux with commas
      function formatRobux(price) {
        return price.toLocaleString() + ' R$';
      }

      // Build embed
      const embed = new EmbedBuilder()
  .setAuthor({ 
    name: `Roblox User Comparison: ${username1} vs ${username2}`, 
    iconURL: 'https://i.imgur.com/Y5egr1d.png' 
  })
  .setColor('#FF0000')
  .addFields(
    { name: '**Account Age**', value: `${username1}: ${formatDate(info1.created)}\n${username2}: ${formatDate(info2.created)}`, inline: false },
    { name: '**Games Created**', value: `${username1}: ${games1}\n${username2}: ${games2}`, inline: true },
    { name: '**Groups**', value: `${username1}: ${groups1}\n${username2}: ${groups2}`, inline: true },
    { name: '**Badges**', value: `${username1}: ${badges1}\n${username2}: ${badges2}`, inline: true },
    { name: '**Avatar Price**', value: `${username1}: ${formatRobux(price1)}\n${username2}: ${formatRobux(price2)}`, inline: true },
  )
  .setFooter({ text: `Cooldown: 60 seconds | Timestamp: ${nowUnix}` })
  .setTimestamp();

      // Set cooldown
      cooldowns.set(userId, nowUnix + 60);

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
    }
  }
};