require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const robloxCache = new Map();

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRobloxUser(username) {
  if (robloxCache.has(username)) {
    console.log(`Cache hit for ${username}`);
    return robloxCache.get(username);
  }

  console.log(`Fetching Roblox data for ${username}`);
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const searchResponse = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${username}`);
      const searchData = searchResponse.data;

      if (!searchData.data || searchData.data.length === 0) {
        return null;
      }

      const user = searchData.data[0];
      robloxCache.set(username, user);
      return user;

    } catch (err) {
      if (err.response?.status === 429) {
        console.log(`Rate limited! Retrying after ${1000 * (attempt + 1)}ms`);
        await delay(1000 * (attempt + 1));
      } else {
        console.error('Error fetching Roblox user:', err);
        break;
      }
    }
    attempt++;
  }
  return null;
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName !== 'robloxinfo') return;

  const username = interaction.options.getString('username');
  if (!username) {
    return interaction.reply('Please provide a Roblox username.');
  }

  await interaction.deferReply();

  try {
    const user = await fetchRobloxUser(username);
    if (!user) {
      return interaction.editReply(`User "${username}" not found or rate limited.`);
    }

    // Account Age Calculation
    const createdDate = new Date(user.created);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365)).toFixed(2);

    const thumbResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png&isCircular=false`);
    const avatarUrl = thumbResponse.data?.data?.[0]?.imageUrl || '';

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
    console.error('Unexpected error:', err);
    await interaction.editReply('There was an error fetching Roblox info. Please try again later.');
  }
});

process.on('unhandledRejection', err => {
  console.error('Unhandled promise rejection:', err);
});

client.login(DISCORD_BOT_TOKEN);
