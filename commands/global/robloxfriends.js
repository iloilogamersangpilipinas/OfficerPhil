const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const delay = ms => new Promise(r => setTimeout(r, ms));

const robloxCache = new Map();
const robloxCooldowns = new Map();
const COOLDOWN_TIME = 60; // seconds

const userCooldowns = new Map();
const USER_COOLDOWN_TIME = 60; // seconds

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxfriends')
    .setDescription('Get Roblox user friends list')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const now = Math.floor(Date.now() / 1000);

    // User cooldown
    const userLastUsed = userCooldowns.get(discordUserId);
    if (userLastUsed && now - userLastUsed < USER_COOLDOWN_TIME) {
      const remaining = USER_COOLDOWN_TIME - (now - userLastUsed);
      const cooldownEnds = userLastUsed + USER_COOLDOWN_TIME;
      return interaction.reply({
        content: `⏳ Please wait ${remaining}s before using this command again. Cooldown ends <t:${cooldownEnds}:R>.`,
        ephemeral: true
      });
    }
    userCooldowns.set(discordUserId, now);

    const username = interaction.options.getString('username');
    await interaction.deferReply();

    // Roblox username cooldown
    const lastRobloxUsed = robloxCooldowns.get(username);
    if (lastRobloxUsed && now - lastRobloxUsed < COOLDOWN_TIME) {
      const remaining = COOLDOWN_TIME - (now - lastRobloxUsed);
      const cooldownEnds = lastRobloxUsed + COOLDOWN_TIME;
      return interaction.editReply(`⏳ Info for "${username}" was recently fetched. Cooldown ends <t:${cooldownEnds}:R>. Please wait ${remaining}s.`);
    }

    try {
      // Get Roblox user id
      const user = await fetchRobloxUser(username, now);
      if (!user) return interaction.editReply(`User "${username}" not found.`);

      // Get friends list
      const friendsRes = await axios.get(`https://friends.roblox.com/v1/users/${user.id}/friends?limit=100`);
      const friends = friendsRes.data.data || [];
      robloxCooldowns.set(username, now);
      robloxCache.set(username, user);

      // Prepare friends list string (up to 10 friends)
      let friendsList = friends.slice(0, 10).map(f => `${f.name} (ID: ${f.id})`).join('\n');
      if (friends.length > 10) friendsList += `\n...and ${friends.length - 10} more`;

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({ name: `Roblox Friends List: ${user.name}`, iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setDescription(`**Total friends:** ${friends.length}`)
        .addFields(
          { name: 'Friends (up to 10)', value: friendsList || '*No friends found*' }
        )
        .setFooter({ text: 'Data provided by Roblox API' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error fetching Roblox friends:', err);
      await interaction.editReply('❌ Error fetching Roblox friends. Try again later.');
    }
  }
};

async function fetchRobloxUser(username, now) {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const searchRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${username}`);
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
      if (err.response?.status === 429) await delay(1000 * (attempt + 1));
      else {
        console.error('Roblox fetch error:', err);
        break;
      }
    }
  }

  robloxCooldowns.set(username, now);
  robloxCache.set(username, null);
  return null;
}