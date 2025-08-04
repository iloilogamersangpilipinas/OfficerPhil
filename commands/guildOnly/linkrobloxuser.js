const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// In-memory storage (you can replace this with a database later)
const linkedAccounts = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linkroblox')
    .setDescription('Link your Roblox account to your Discord user')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your Roblox username')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const robloxUsername = interaction.options.getString('username');

    console.log(`[LINKROBLOX] Requested by ${interaction.user.tag} for Roblox username "${robloxUsername}"`);

    try {
      // Respond to Discord immediately to prevent timeout
      await interaction.deferReply({ ephemeral: true });
      console.log(`[LINKROBLOX] Interaction deferred.`);

      const user = await fetchRobloxUser(robloxUsername);
      if (!user) {
        console.warn(`[LINKROBLOX] User "${robloxUsername}" not found.`);
        return interaction.editReply(`❌ Roblox user "${robloxUsername}" not found. Please check the username and try again.`);
      }

      // Save in memory
      linkedAccounts.set(discordUserId, {
        robloxId: user.id,
        robloxUsername: user.name,
      });

      const profileUrl = `https://www.roblox.com/users/${user.id}/profile`;
      const avatarUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png&isCircular=false`;

      const embed = new EmbedBuilder()
        .setTitle('✅ Roblox Account Linked!')
        .setColor('#00FF00')
        .setDescription(`Your Discord account is now linked to:\n[**${user.name}**](${profileUrl}) (ID: \`${user.id}\`)`)
        .setThumbnail(avatarUrl)
        .setFooter({ text: 'Roblox account linking is temporary unless stored in a database.' })
        .setTimestamp();

      console.log(`[LINKROBLOX] Successfully linked ${user.name} (${user.id}) to ${interaction.user.tag}`);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[LINKROBLOX] Unexpected error:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ An unexpected error occurred while linking your Roblox account. Please try again later.',
          ephemeral: true,
        });
      } else {
        await interaction.editReply('❌ An unexpected error occurred. Please try again later.');
      }
    }
  },
};

async function fetchRobloxUser(username) {
  try {
    console.log(`[API] Searching for "${username}"...`);

    const searchRes = await axios.get(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}`,
      { timeout: 5000 }
    );

    const results = searchRes.data?.data;
    if (!results || results.length === 0) {
      console.warn(`[API] No results for "${username}".`);
      return null;
    }

    const userBasic = results[0];
    const userDetailsRes = await axios.get(
      `https://users.roblox.com/v1/users/${userBasic.id}`,
      { timeout: 5000 }
    );

    return userDetailsRes.data;
  } catch (err) {
    console.error(`[API] Roblox fetch error for "${username}":`, err.message || err);
    return null;
  }
}