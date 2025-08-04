const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const linkedAccounts = new Map(); // In-memory storage: discordUserId => { robloxId, robloxUsername }

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

    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch Roblox user by username to verify
      const user = await fetchRobloxUser(robloxUsername);
      if (!user) {
        return interaction.editReply(`❌ Roblox user "${robloxUsername}" not found. Please check the username and try again.`);
      }

      // Save the link in memory
      linkedAccounts.set(discordUserId, { robloxId: user.id, robloxUsername: user.name });

      const profileUrl = `https://www.roblox.com/users/${user.id}/profile`;

      const embed = new EmbedBuilder()
        .setTitle('Roblox Account Linked!')
        .setColor('#00FF00')
        .setDescription(`Your Discord account is now linked to Roblox user [${user.name}](${profileUrl}) (ID: ${user.id})`)
        .setThumbnail(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png&isCircular=false`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error linking Roblox account:', error);
      await interaction.editReply('❌ There was an error linking your Roblox account. Please try again later.');
    }
  }
};

async function fetchRobloxUser(username) {
  try {
    const searchRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${username}`);
    if (!searchRes.data.data.length) return null;
    const userBasic = searchRes.data.data[0];
    const userDetailsRes = await axios.get(`https://users.roblox.com/v1/users/${userBasic.id}`);
    return userDetailsRes.data;
  } catch (err) {
    console.error('Roblox API fetch error:', err);
    return null;
  }
}