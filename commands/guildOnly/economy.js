const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'balances.json');

function loadBalances() {
  if (!fs.existsSync(dataPath)) return {};
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function saveBalances(balances) {
  fs.writeFileSync(dataPath, JSON.stringify(balances, null, 2));
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
    const currency = 'SR £';
    const balances = loadBalances();

    if (interaction.options.getSubcommand() === 'leaderboard') {
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

    } else if (interaction.options.getSubcommand() === 'balance') {
      const user = interaction.options.getUser('user') || interaction.user;
      const balance = balances[user.id] || 0;

      // Quotes based on balance tiers
      const quotesRich = [
        "You're rolling in SR £!",
        "The Republic's elite!",
        "Wealth suits you well!",
        "You're rich!",
        "Keep shining like gold!"
      ];
      const quotesMid = [
        "You're mid, steady and strong.",
        "A balanced life, a balanced wallet.",
        "Keep grinding, you're getting there!",
        "Not poor, not rich, just you.",
        "Mid-tier and moving up!"
      ];
      const quotesPoor = [
        "Better days ahead!",
        "You're poor, but rich in spirit.",
        "Keep hustling, you'll get there!",
        "Low balance, high hopes.",
        "Money isn't everything!"
      ];

      let quoteSet;
      if (balance >= 10000) quoteSet = quotesRich;
      else if (balance >= 1000) quoteSet = quotesMid;
      else quoteSet = quotesPoor;

      const quote = quoteSet[Math.floor(Math.random() * quoteSet.length)];

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🏦 Account Balance')
        .setDescription(`**${user.tag}** has a balance of **${currency}${balance}**`)
        .setFooter({ text: quote })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (interaction.options.getSubcommand() === 'add-money') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (amount <= 0) return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });

      if (!balances[user.id]) balances[user.id] = 0;
      balances[user.id] += amount;
      saveBalances(balances);

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('💸 Money Added')
        .setDescription(`Added **${currency}${amount}** to **${user.tag}**.\nNew Balance: **${currency}${balances[user.id]}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (interaction.options.getSubcommand() === 'remove-money') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (amount <= 0) return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });

      if (!balances[user.id]) balances[user.id] = 0;

      balances[user.id] -= amount;
      if (balances[user.id] < 0) balances[user.id] = 0;
      saveBalances(balances);

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🧾 Money Removed')
        .setDescription(`Removed **${currency}${amount}** from **${user.tag}**.\nNew Balance: **${currency}${balances[user.id]}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (interaction.options.getSubcommand() === 'giveall') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const amount = interaction.options.getInteger('amount');
      if (amount <= 0) {
        return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });
      }

      for (const userId in balances) {
        if (Object.hasOwnProperty.call(balances, userId)) {
          balances[userId] += amount;
        }
      }

      saveBalances(balances);

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('💰 Economy Update')
        .setDescription(`Added **${currency}${amount}** to **all users** in the economy.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};