const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_API_KEY;

const workCooldowns = new Map();
const COOLDOWN_SECONDS = 300; // 5 minutes cooldown

const workPrompts = [
  'You participated in a community service.',
  'You worked in a library.',
  'You helped clean the park.',
  'You delivered food to neighbors.',
  'You organized books in the community center.',
  'You volunteered at a local shelter.',
  'You planted trees in the park.',
  'You taught kids how to read.',
  'You painted murals downtown.',
  'You helped at the animal rescue center.',
  'You ran errands for the elderly.',
  'You assisted in a charity fundraiser.',
  'You cleaned up the beach.',
  'You coached a youth sports team.',
  'You baked goods for a fundraiser.',
  'You supported a local food bank.',
  'You helped maintain community gardens.',
  'You provided tech support for seniors.',
  'You participated in a neighborhood watch.',
  'You organized a recycling drive.',
  'You helped set up a community event.',
  'You delivered care packages.',
  'You tutored students after school.',
  'You joined a local cleanup crew.',
  'You distributed flyers for a cause.'
];

const noMoneyPrompts = [
  'You showed up late and got no pay.',
  'You forgot your tools and earned nothing.',
  'You took a long break and got no reward.',
  'Your supervisor was unhappy; no payment this time.',
  'You missed your shift; no earnings today.',
  'You worked slowly and didn’t earn anything.',
  'You got distracted and made no progress.',
  'You attended the event but did not work.',
  'Your work was rejected; no money earned.'
];

function getRandomReward() {
  const jackpotChance = 1 / 1000;
  const bigPayoutChance = 1 / 8;

  const roll = Math.random();

  if (roll < jackpotChance) {
    return { amount: Math.floor(Math.random() * 5000) + 10000, label: '🎉 Jackpot!' };
  } else if (roll < bigPayoutChance + jackpotChance) {
    return { amount: 1000, label: '💰 Big payout!' };
  } else {
    const normalAmount = Math.floor(Math.random() * 151) + 50; // 50-200
    return { amount: normalAmount, label: '' };
  }
}

async function loadBalances() {
  try {
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY }
    });
    return res.data.record || {};
  } catch (err) {
    console.error('Failed to load balances:', err);
    return {};
  }
}

async function saveBalances(balances) {
  try {
    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, balances, {
      headers: { 'X-Master-Key': API_KEY, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Failed to save balances:', err);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn money (5 min cooldown)'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Math.floor(Date.now() / 1000);

    if (workCooldowns.has(userId)) {
      const expires = workCooldowns.get(userId);
      if (now < expires) {
        const remaining = expires - now;
        return interaction.reply({ content: `⏳ Please wait ${remaining}s before working again.`, ephemeral: true });
      }
    }

    // 70% chance to earn money
    const earnMoneyChance = 0.7;
    const earnedMoney = Math.random() < earnMoneyChance;

    let embed;

    if (earnedMoney) {
      const rewardData = getRandomReward();
      const prompt = workPrompts[Math.floor(Math.random() * workPrompts.length)];

      const balances = await loadBalances();
      if (!balances[userId]) balances[userId] = 0;
      balances[userId] += rewardData.amount;
      await saveBalances(balances);

      embed = new EmbedBuilder()
        .setColor('#014aad')
        .setTitle('💼 Work Completed')
        .setDescription(`${prompt}\nYou earned **SR £${rewardData.amount}** ${rewardData.label}`)
        .setTimestamp();

    } else {
      const prompt = noMoneyPrompts[Math.floor(Math.random() * noMoneyPrompts.length)];

      embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('💼 Work Result')
        .setDescription(`${prompt}\nYou earned **SR £0**.`)
        .setTimestamp();
    }

    workCooldowns.set(userId, now + COOLDOWN_SECONDS);

    await interaction.reply({ embeds: [embed] });
  }
};