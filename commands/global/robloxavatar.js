const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const delay = ms => new Promise(r => setTimeout(r, ms));

const robloxAvatarCache = new Map();
const robloxAvatarCooldowns = new Map();
const AVATAR_COOLDOWN_TIME = 60;

const userCooldowns = new Map();
const USER_COOLDOWN_TIME = 60;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloxavatar')
    .setDescription('Get the Roblox avatar of a user')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const now = Math.floor(Date.now() / 1000); // Unix timestamp

    // ⏳ User cooldown check
    const lastUsed = userCooldowns.get(discordUserId);
    if (lastUsed && now - lastUsed < USER_COOLDOWN_TIME) {
      const remaining = USER_COOLDOWN_TIME - (now - lastUsed);
      const ends = lastUsed + USER_COOLDOWN_TIME;
      return interaction.reply({
        content: `⏳ Please wait ${remaining}s before using this command again. Cooldown ends <t:${ends}:R>.`,
        ephemeral: true
      });
    }
    userCooldowns.set(discordUserId, now);

    const username = interaction.options.getString('username');
    await interaction.deferReply();

    // ⏳ Roblox username cooldown check
    const lastAvatarUsed = robloxAvatarCooldowns.get(username);
    if (lastAvatarUsed && now - lastAvatarUsed < AVATAR_COOLDOWN_TIME) {
      const remaining = AVATAR_COOLDOWN_TIME - (now - lastAvatarUsed);
      const ends = lastAvatarUsed + AVATAR_COOLDOWN_TIME;
      return interaction.editReply(`⏳ Avatar for **${username}** was recently fetched. Cooldown ends <t:${ends}:R>. Please wait ${remaining}s.`);
    }

    try {
      const user = await fetchRobloxUser(username, now);
      if (!user) {
        return interaction.editReply(`❌ Roblox user **${username}** not found.`);
      }

      // Fetch avatar image
      const avatarRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${user.id}&size=420x420&format=Png`);
      const avatarUrl = avatarRes.data?.data?.[0]?.imageUrl || null;

      if (!avatarUrl) {
        return interaction.editReply(`❌ Could not fetch avatar image for **${username}**.`);
      }

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({
          name: user.name,
          iconURL: 'https://i.imgur.com/Y5egr1d.png'
        })
        .setImage(avatarUrl)
        .setURL(`https://www.roblox.com/users/${user.id}/profile`)
        .setFooter({ text: 'Roblox Avatar Preview' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('Avatar fetch error:', err);
      return interaction.editReply('❌ An error occurred while fetching the avatar.');
    }
  }
};

async function fetchRobloxUser(username, now) {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const searchRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}`);
      if (!searchRes.data.data.length) {
        robloxAvatarCooldowns.set(username, now);
        robloxAvatarCache.set(username, null);
        return null;
      }

      const userBasic = searchRes.data.data[0];
      const userDetailsRes = await axios.get(`https://users.roblox.com/v1/users/${userBasic.id}`);

      const userDetails = userDetailsRes.data;
      robloxAvatarCooldowns.set(username, now);
      robloxAvatarCache.set(username, userDetails);
      return userDetails;

    } catch (err) {
      if (err.response?.status === 429) {
        await delay(1000 * (attempt + 1)); // wait longer if rate limited
      } else {
        console.error('Roblox user fetch error:', err);
        break;
      }
    }
  }

  robloxAvatarCooldowns.set(username, now);
  robloxAvatarCache.set(username, null);
  return null;
}