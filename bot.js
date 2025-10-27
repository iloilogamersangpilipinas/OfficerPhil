const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
require('dotenv').config();

const startRobloxTracker = require('./robloxGroupTracker');
const db = require('./db'); // ✅ Use your SQLite system

const app = express();
const PORT = process.env.PORT || 3000;

// Discord client setup
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

// Command loader
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

// Express web server for uptime
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ===================================================
// 🎁 ECONOMY SYSTEM (SQLite + optional JSON backup)
// ===================================================

const monthlyAmount = 1000;
const currency = 'SR £';
const rewardInfoPath = path.join(__dirname, 'data', 'rewardInfo.json');
const backupPath = path.join(__dirname, 'balances.json'); // Manual backup file

function loadRewardInfo() {
  if (!fs.existsSync(rewardInfoPath)) {
    return { lastRewardYear: 0, lastRewardMonth: 0 };
  }
  return JSON.parse(fs.readFileSync(rewardInfoPath, 'utf8'));
}

function saveRewardInfo(info) {
  fs.writeFileSync(rewardInfoPath, JSON.stringify(info, null, 2));
}

// ✅ SQLite-based monthly rewards
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
    console.log(`Added ${currency}${monthlyAmount} to User ID: ${userId}.`);
  }

  saveRewardInfo({ lastRewardYear: currentYear, lastRewardMonth: currentMonth });

  // ✅ Optional: auto-backup balances to JSON
  const updatedBalances = db.getAllBalances();
  fs.writeFileSync(backupPath, JSON.stringify(updatedBalances, null, 2));

  console.log('✅ Monthly rewards distributed and backup created!');
}

// ===================================================
// 🤖 DISCORD BOT EVENTS
// ===================================================

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  client.user.setPresence({
    activities: [{ name: 'Roblox', type: 0 }],
    status: 'online',
  });

  // Give monthly rewards on startup
  giveMonthlyRewards();

  // Check every minute for the 1st day at 12:00 PM
  setInterval(() => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 12 && now.getMinutes() === 0) {
      giveMonthlyRewards();
    }
  }, 60 * 1000);

  // Start Roblox group tracker
  startRobloxTracker(client);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`Interaction received: ${interaction.commandName}`);

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.log(`No command matching ${interaction.commandName} found`);
    return;
  }

  try {
    await command.execute(interaction);
    console.log(`Executed command: ${interaction.commandName}`);
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ content: 'Error executing command.', ephemeral: true });
  }
});

client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (message.guild && /phil/i.test(message.content)) {
    const response = philResponses[Math.floor(Math.random() * philResponses.length)]
      .replace('{user}', `<@${message.author.id}>`);
    message.channel.send(response).catch(console.error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);