const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const delay = ms => new Promise(r => setTimeout(r, ms));
const robloxCache = new Map();
const robloxCooldowns = new Map();
const COOLDOWN_TIME = 60000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxinfo')
    .setDescription('Get Roblox user info')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)
    ),
  async execute(interaction) {
    const username = interaction.options.getString('username');
    await interaction.deferReply();

    try {
      const user = await fetchRobloxUser(username);
      if (!user || !user.created) return interaction.editReply(`User "${username}" not found.`);

      const createdDate = new Date(user.created);
      if (isNaN(createdDate.getTime())) return interaction.editReply('Invalid account creation date.');

      const diffYears = ((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(2);
      const thumbResp = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png&isCircular=false`);
      const avatarUrl = thumbResp.data?.data?.[0]?.imageUrl || '';

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setTitle(`Roblox User Info: ${user.name}`)
        .setThumbnail(avatarUrl)
        .addFields(
          { name: 'Username', value: user.name, inline: false },
          { name: 'User ID', value: user.id.toString(), inline: true },
          { name: 'Account Age', value: `${diffYears} years`, inline: true }
        )
        .setFooter({ text: 'Data provided by Roblox API' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply('Error fetching Roblox info. Try again later.');
    }
  }
};

async function fetchRobloxUser(username) {
  const now = Date.now();
  if (robloxCooldowns.has(username)) {
    if (now - robloxCooldowns.get(username) < COOLDOWN_TIME) {
      return robloxCache.get(username) || null;
    }
  }

  robloxCooldowns.set(username, now);
  if (robloxCache.has(username)) {
    return robloxCache.get(username);
  }

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const searchRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${username}`);
      if (!searchRes.data.data.length) {
        robloxCache.set(username, null);
        return null;
      }
      const userBasic = searchRes.data.data[0];
      const userDetailsRes = await axios.get(`https://users.roblox.com/v1/users/${userBasic.id}`);
      robloxCache.set(username, userDetailsRes.data);
      return userDetailsRes.data;
    } catch (err) {
      if (err.response?.status === 429) await delay(1000 * (attempt + 1));
      else {
        console.error('Roblox fetch error:', err);
        break;
      }
    }
  }
  robloxCache.set(username, null);
  return null;
}
