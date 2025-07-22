const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,    // To receive messages in guilds
    GatewayIntentBits.MessageContent,    // To read message content
    GatewayIntentBits.DirectMessages      // To receive direct messages
  ],
  partials: ['CHANNEL'],                 // Needed to receive DMs properly
});

const philResponses = [
  "What's up, {user}?",
  "Whatcha want, {user}?",
  "Hey there, {user}!",
  "Yo, {user}!",
  "Hello, {user}, how can I help?",
];

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// Simple web server for uptime monitoring
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Economy reward system files & variables
const dataPath = path.join(__dirname, 'balances.json');
const rewardInfoPath = path.join(__dirname, 'rewardInfo.json');
const monthlyAmount = 1000;
const currency = 'SR £';

function loadBalances() {
  if (!fs.existsSync(dataPath)) return {};
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function saveBalances(balances) {
  fs.writeFileSync(dataPath, JSON.stringify(balances, null, 2));
}

function loadRewardInfo() {
  if (!fs.existsSync(rewardInfoPath)) return { lastRewardYear: 0, lastRewardMonth: 0 };
  return JSON.parse(fs.readFileSync(rewardInfoPath, 'utf8'));
}

function saveRewardInfo(info) {
  fs.writeFileSync(rewardInfoPath, JSON.stringify(info, null, 2));
}

async function giveMonthlyRewards(client) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const rewardInfo = loadRewardInfo();

  if (rewardInfo.lastRewardYear === currentYear && rewardInfo.lastRewardMonth === currentMonth) {
    console.log('Monthly rewards already given this month.');
    return;
  }

  const balances = loadBalances();

  for (const userId in balances) {
    balances[userId] += monthlyAmount;
    console.log(`Added ${currency}${monthlyAmount} to User ID: ${userId}. New balance: ${currency}${balances[userId]}`);
  }

  saveBalances(balances);
  saveRewardInfo({ lastRewardYear: currentYear, lastRewardMonth: currentMonth });

  console.log('✅ Monthly rewards distributed successfully!');
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Set the bot's status to "Online, Playing Roblox"
  client.user.setPresence({
    activities: [{ name: 'Roblox', type: 0 }],
    status: 'online',
  });

  giveMonthlyRewards(client);

  setInterval(() => {
    const now = new Date();
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (day === 1 && hour === 12 && minute === 0) {
      giveMonthlyRewards(client);
    }
  }, 60 * 1000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'Error executing command.', ephemeral: true });
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.guild) {
    // Guild message: respond to "phil"
    if (/phil/i.test(message.content)) {
      const response = philResponses[Math.floor(Math.random() * philResponses.length)]
        .replace('{user}', `<@${message.author.id}>`);
      message.channel.send(response).catch(console.error);
    }
  } else {
    // DM message: respond with cute embed safely, without blocking slash commands
    try {
      const responses = [
        "aww.... how sweet of you 💖",
        "You just made my day brighter!",
        "Thanks for the love! 😊",
        "You're awesome, you know that?",
        "Sending virtual hugs your way 🤗",
        "I’m blushing! 😳",
        "You’re too kind!",
        "Message received with a big smile!",
        "Keep being amazing!",
        "You rock! 🤘"
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const embed = new EmbedBuilder()
        .setTitle("✨ YOU SENT ME A MSG?? ✨")
        .setDescription(randomResponse)
        .setColor(0xff69b4)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error responding to DM:', error);
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
