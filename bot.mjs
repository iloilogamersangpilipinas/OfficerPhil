require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Simple cooldown map: userId => timestamp of last command
const cooldowns = new Map();
const COOLDOWN_SECONDS = 10;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Helper: delay in ms
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Roblox API request with retries on 429 rate limit
async function robloxApiGet(url, retries = 3, retryDelayMs = 3000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        if (i === retries) throw new Error('Roblox API rate limit exceeded. Please try again later.');
        console.warn(`Roblox API rate limited. Retrying after ${retryDelayMs}ms... Retries left: ${retries - i}`);
        await delay(retryDelayMs);
      } else {
        throw error;
      }
    }
  }
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'robloxinfo') {
    const userId = interaction.user.id;

    // Check cooldown
    const lastTime = cooldowns.get(userId);
    if (lastTime && (Date.now() - lastTime) < COOLDOWN_SECONDS * 1000) {
      await interaction.reply({ content: `Please wait ${COOLDOWN_SECONDS} seconds between commands.`, ephemeral: true });
      return;
    }
    cooldowns.set(userId, Date.now());

    const username = interaction.options.getString('username');
    if (!username) {
      await interaction.reply({ content: 'Please provide a Roblox username.', ephemeral: true });
      return;
    }

    try {
      await interaction.deferReply();

      // Search user
      const searchData = await robloxApiGet(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}`);

      if (!searchData.data || searchData.data.length === 0) {
        await interaction.editReply(`User "${username}" not found.`);
        return;
      }

      const user = searchData.data[0];
      const userInfo = await robloxApiGet(`https://users.roblox.com/v1/users/${user.id}`);

      const createdDate = new Date(userInfo.created);
      const now = new Date();
      const diffTime = Math.abs(now - createdDate);
      const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365)).toFixed(2);

      const thumbData = await robloxApiGet(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userInfo.id}&size=420x420&format=Png&isCircular=false`);
      let avatarUrl = '';
      if (thumbData.data && thumbData.data.length > 0) {
        avatarUrl = thumbData.data[0].imageUrl;
      } else {
        avatarUrl = 'https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png'; // fallback Roblox default
      }

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setTitle(`Roblox User Info: ${userInfo.name}`)
        .setThumbnail(avatarUrl)
        .addFields(
          { name: 'Username\u200B', value: userInfo.name, inline: false },
          { name: 'User ID\u200B', value: userInfo.id.toString(), inline: true },
          { name: 'Account Age\u200B', value: `${diffYears} years`, inline: false }
        )
        .setFooter({ text: 'Data provided by Roblox API' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching Roblox user info:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Error fetching Roblox user info. Please try again later.');
      } else {
        await interaction.reply('Error fetching Roblox user info. Please try again later.');
      }
    }
  }
});

client.login(DISCORD_BOT_TOKEN);
