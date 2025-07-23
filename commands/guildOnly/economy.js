const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

const BIN_ID = process.env.JSONBIN_ID;
const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const currency = 'SR £';

async function loadBalances() {
  try {
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': MASTER_KEY }
    });
    return res.data.record || {};
  } catch (err) {
    console.error('Error loading balances from JSONBin:', err);
    return {};
  }
}

async function saveBalances(balances) {
  try {
    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, balances, {
      headers: { 'X-Master-Key': MASTER_KEY }
    });
  } catch (err) {
    console.error('Error saving balances to JSONBin:', err);
  }
}

function getBalanceFootnote(balance) {
  if (balance >= 100000) {
    const quotes = [
      "You're rich! Keep shining! 💎",
      "Living large in the Republic! 🤑",
      "High roller vibes! 🎉",
      "Your wallet thanks you! 💰",
      "You're top-tier wealthy! 🏆"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  } else if (balance >= 10000) {
    const quotes = [
      "You're doing well, keep going! 💪",
      "Mid-level mogul! 📈",
      "Nice stash you've got! 🙂",
      "Steady and strong! 🚀",
      "On your way up! 🌟"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  } else {
    const quotes = [
      "You're poor, but hopeful! 🤞",
      "Every empire starts small! 🐣",
      "Keep grinding! 💼",
      "Saving for a rainy day! ☔",
      "Rome wasn't built in a day! 🏛️"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Economy commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('Show top richest users'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('balance')
        .setDescription('Check your balance or another user\'s balance')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to check balance for')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-money')
        .setDescription('Add money to a user')
        .addUserOption(option => option.setName('user').setDescription('User to add money to').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Amount to add').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-money')
        .setDescription('Remove money from a user')
        .addUserOption(option => option.setName('user').setDescription('User to remove money from').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Amount to remove').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('giveall')
        .setDescription('Add money to all users (Admin only)')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount to add to every user')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const balances = await loadBalances();

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'leaderboard') {
      const sorted = Object.entries(balances)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      if (sorted.length === 0) {
        return interaction.reply('No balances recorded yet.');
      }

      let description = '';
      for (let i = 0; i < sorted.length; i++) {
        const [userId, balance] = sorted[i];
        let userTag;
        try {
          const user = await interaction.client.users.fetch(userId);
          userTag = user.tag;
        } catch {
          userTag = `User ID: ${userId}`;
        }
        description += `**${i + 1}.** ${userTag} — ${currency}${balance}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('💰 Rich People in the Republic of Supreme Rendezvous')
        .setDescription(description)
        .setColor('Gold')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'balance') {
      const user = interaction.options.getUser('user') || interaction.user;
      const balance = balances[user.id] || 0;

      const footnote = getBalanceFootnote(balance);

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🏦 Account Balance')
        .setDescription(`**${user.tag}** has a balance of **${currency}${balance}**`)
        .setFooter({ text: footnote })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'add-money') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (amount <= 0) return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });

      if (!balances[user.id]) balances[user.id] = 0;
      balances[user.id] += amount;
      await saveBalances(balances);

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('💸 Money Added')
        .setDescription(`Added **${currency}${amount}** to **${user.tag}**.\nNew Balance: **${currency}${balances[user.id]}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'remove-money') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (amount <= 0) return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });

      if (!balances[user.id]) balances[user.id] = 0;

      balances[user.id] -= amount;
      if (balances[user.id] < 0) balances[user.id] = 0;
      await saveBalances(balances);

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🧾 Money Removed')
        .setDescription(`Removed **${currency}${amount}** from **${user.tag}**.\nNew Balance: **${currency}${balances[user.id]}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'giveall') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const amount = interaction.options.getInteger('amount');
      if (amount <= 0) {
        return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });
      }

      // Add amount to every user in balances
      for (const userId in balances) {
        if (Object.hasOwnProperty.call(balances, userId)) {
          balances[userId] += amount;
        }
      }

      await saveBalances(balances);

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('💰 Economy Update')
        .setDescription(`Added **${currency}${amount}** to **all users** in the economy.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};