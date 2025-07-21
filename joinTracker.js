require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

app.use(express.json());

app.post('/roblox-join', async (req, res) => {
  const { username, timestamp } = req.body;

  if (!username || !timestamp) {
    return res.status(400).send('Missing username or timestamp');
  }

  try {
    const dateObj = new Date(timestamp);

    const dateStr = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const embed = new EmbedBuilder()
      .setColor('#014aad')
      .setTitle(`${username} has joined the game!`)
      .addFields(
        { name: 'Username', value: username, inline: true },
        { name: 'Date', value: dateStr, inline: true },
        { name: 'Time', value: timeStr, inline: true }
      )
      .setFooter({ text: 'The Republic of Supreme Rendezvous' })
      .setTimestamp(dateObj);

    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel) {
      console.error('Discord channel not found');
      return res.status(500).send('Discord channel not found');
    }

    await channel.send({ embeds: [embed] });

    res.status(200).send('Join message sent');
  } catch (error) {
    console.error('Error sending join embed:', error);
    res.status(500).send('Internal server error');
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  app.listen(PORT, () => {
    console.log(`Join tracker server running on port ${PORT}`);
  });
});

client.login(process.env.DISCORD_BOT_TOKEN);