const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],  // For DMs if needed
});

// Phil message responses
const philResponses = [
  "What's up, {user}?",
  "Whatcha want, {user}?",
  "Hey there, {user}!",
  "Yo, {user}!",
  "Hello, {user}, how can I help?",
];

// Load commands from guildOnly and global subfolders
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

// Simple web server for uptime
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Economy system stuff
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

async function giveMonthlyRewards() {
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

  client.user.setPresence({
    activities: [{ name: 'Roblox', type: 0 }],
    status: 'online',
  });

  giveMonthlyRewards();

  setInterval(() => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 12 && now.getMinutes() === 0) {
      giveMonthlyRewards();
    }
  }, 60 * 1000);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
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
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'rps_select') {
      const userChoice = interaction.values[0]; // rock, paper, scissors
      const choices = ['rock', 'paper', 'scissors'];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];

      let result;
      if (userChoice === botChoice) {
        result = "It's a tie!";
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = "You win! 🎉";
      } else {
        result = "You lose! 😢";
      }

      await interaction.update({
        content: `You chose **${userChoice}**. I chose **${botChoice}**. ${result}`,
        components: [], // remove select menu after choice
      });
    }
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