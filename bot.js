require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'robloxinfo') {
    const username = interaction.options.getString('username');

    if (!username) {
      await interaction.reply('Please provide a Roblox username.');
      return;
    }

    try {
      const searchResponse = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${username}`);
      const searchData = searchResponse.data;

      if (!searchData.data || searchData.data.length === 0) {
        await interaction.reply(`User "${username}" not found.`);
        return;
      }

      const user = searchData.data[0];
      const userInfoResponse = await axios.get(`https://users.roblox.com/v1/users/${user.id}`);
      const userInfo = userInfoResponse.data;

      const createdDate = new Date(userInfo.created);
      const now = new Date();
      const diffTime = Math.abs(now - createdDate);
      const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365)).toFixed(2);

      const thumbResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userInfo.id}&size=420x420&format=Png&isCircular=false`);
      const thumbData = thumbResponse.data;

      let avatarUrl = '';
      if (thumbData.data && thumbData.data.length > 0) {
        avatarUrl = thumbData.data[0].imageUrl;
      }

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setTitle(`Roblox User Info: ${userInfo.name}`)
        .setThumbnail(avatarUrl || '')
        .addFields(
          { name: 'Username\u200B', value: userInfo.name, inline: false },
          { name: 'User ID\u200B', value: userInfo.id.toString(), inline: true },
          { name: 'Account Age\u200B', value: `${diffYears} years`, inline: false }
        )
        .setFooter({ text: 'Data provided by Roblox API' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching Roblox user info:', error);
      await interaction.reply('Error fetching Roblox user info.');
    }
  }
});

client.login(DISCORD_BOT_TOKEN);