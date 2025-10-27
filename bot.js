const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
require('dotenv').config();

const startRobloxTracker = require('./robloxGroupTracker');
const db = require('./db'); // ✅ SQLite wrapper

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- DISCORD CLIENT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Fun Phil responses
const philResponses = [
  "What's up, {user}?",
  "Whatcha want, {user}?",
  "Hey there, {user}!",
  "Yo, {user}!",
  "Hello, {user}, how can I help?",
];

// ---------------- COMMAND LOADER ----------------
client.commands = new Collection();

const guildOnlyPath = path.join(__dirname, 'commands', 'guildOnly');
const globalPath = path.join(__dirname, 'commands', 'global');

function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(dir, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`Skipping invalid command file: ${file}`);
    }
  }
}

loadCommands(guildOnlyPath);
loadCommands(globalPath);
console.log('Loaded commands:', [...client.commands.keys()]);

// ---------------- EXPRESS SERVER ----------------
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ---------------- ECONOMY CONFIG ----------------
const monthlyAmount = 1000;
const currency = 'SR £';
const rewardInfoPath = path.join(__dirname, 'data', 'rewardInfo.json');

// Reward info loader
function loadRewardInfo() {
  if (!fs.existsSync(rewardInfoPath)) return { lastRewardYear: 0, lastRewardMonth: 0 };
  return JSON.parse(fs.readFileSync(rewardInfoPath, 'utf8'));
}

// Reward info saver
function saveRewardInfo(info) {
  fs.writeFileSync(rewardInfoPath, JSON.stringify(info, null, 2));
}

// Give monthly rewards
async function giveMonthlyRewards() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const rewardInfo = loadRewardInfo();

  if (rewardInfo.lastRewardYear === currentYear && rewardInfo.lastRewardMonth === currentMonth) {
    console.log('Monthly rewards already given this month.');
    return;
  }

  const balances = db.getAllBalances();

  if (balances.length === 0) {
    console.log('No balances found. Skipping monthly rewards.');
    return;
  }

  for (const { userId, balance } of balances) {
    db.setBalance(userId, balance + monthlyAmount);
    console.log(`Added ${currency}${monthlyAmount} to User ID: ${userId}`);
  }

  saveRewardInfo({ lastRewardYear: currentYear, lastRewardMonth: currentMonth });

  // Optional backup to JSON
  const updatedBalances = db.getAllBalances();
  fs.writeFileSync(path.join(__dirname, 'data', 'balances.json'), JSON.stringify(updatedBalances, null, 2));

  console.log('✅ Monthly rewards distributed and backup created!');
}

// ---------------- DISCORD EVENTS ----------------
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  client.user.setPresence({
    activities: [{ name: 'Roblox', type: 0 }],
    status: 'online',
  });

  // 🔹 Import balances from JSON on startup
  const importedCount = db.importBalancesFromFile();
  console.log(`Imported ${importedCount} balances from JSON`);

  // 🔹 Give monthly rewards
  giveMonthlyRewards();

  // Schedule monthly rewards (1st day at 12:00 PM)
  setInterval(() => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 12 && now.getMinutes() === 0) {
      giveMonthlyRewards();
    }
  }, 60 * 1000);

  // Start Roblox tracker
  startRobloxTracker(client);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ content: 'Error executing command.', ephemeral: true });
  }
});

// Fun Phil responses
client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (message.guild && /phil/i.test(message.content)) {
    const response = philResponses[Math.floor(Math.random() * philResponses.length)]
      .replace('{user}', `<@${message.author.id}>`);
    message.channel.send(response).catch(console.error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
