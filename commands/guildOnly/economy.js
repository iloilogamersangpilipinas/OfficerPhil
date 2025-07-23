const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../db'); // adjust path if needed

const currency = 'SR £';
const DAILY_AMOUNT = 1000;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in ms

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
      subcommand.setName('leaderboard').setDescription('Show top richest users'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('balance')
        .setDescription('Check your balance or another user\'s balance')
        .addUserOption(option =>
          option.setName('user').setDescription('User to check balance for').setRequired(false)))
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
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName('daily')
        .setDescription('Claim your daily 1000 SR £ reward')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'leaderboard') {
      let balances = db.getAllBalances();
      if (balances.length === 0) {
        return interaction.reply('No balances recorded yet.');
      }

      balances.sort((a, b) => b.balance - a.balance);
      balances = balances.slice(0, 10);

      let description = '';
      for (let i = 0; i < balances.length; i++) {
        const { userId, balance } = balances[i];
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

      try {
        const topUser = await interaction.client.users.fetch(balances[0].userId);
        embed.setThumbnail(topUser.displayAvatarURL({ extension: 'png', size: 512 }));
      } catch {
        // silently ignore
      }

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'balance') {
      const user = interaction.options.getUser('user') || interaction.user;
      const balance = db.getBalance(user.id);

      const footnote = getBalanceFootnote(balance);

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🏦 Account Balance')
        .setDescription(`**${user.tag}** has a balance of **${currency}${balance}**`)
        .setFooter({ text: footnote })
        .setTimestamp()
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 512 }));

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'add-money') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      if (amount <= 0) return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });

      db.addBalance(user.id, amount);

      const newBalance = db.getBalance(user.id);

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('💸 Money Added')
        .setDescription(`Added **${currency}${amount}** to **${user.tag}**.\nNew Balance: **${currency}${newBalance}**`)
        .setTimestamp()
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 512 }));

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'remove-money') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      if (amount <= 0) return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });

      const current = db.getBalance(user.id);
      const newAmount = Math.max(0, current - amount);
      db.setBalance(user.id, newAmount);

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🧾 Money Removed')
        .setDescription(`Removed **${currency}${amount}** from **${user.tag}**.\nNew Balance: **${currency}${newAmount}**`)
        .setTimestamp()
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 512 }));

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'giveall') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      const amount = interaction.options.getInteger('amount');
      if (amount <= 0) {
        return interaction.reply({ content: 'Amount must be greater than zero.', ephemeral: true });
      }

      const balances = db.getAllBalances();
      for (const { userId, balance } of balances) {
        db.setBalance(userId, balance + amount);
      }

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('💰 Economy Update')
        .setDescription(`Added **${currency}${amount}** to **all users** in the economy.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (subcommand === 'daily') {
      const userId = interaction.user.id;
      const now = Date.now();
      const lastClaim = db.getLastDaily(userId);

      if (now - lastClaim < DAILY_COOLDOWN) {
        const remaining = DAILY_COOLDOWN - (now - lastClaim);
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        return interaction.reply({
          content: `⏳ You already claimed your daily! Try again in ${hours}h ${minutes}m.`,
          ephemeral: true,
        });
      }

      db.addBalance(userId, DAILY_AMOUNT);
      db.setLastDaily(userId, now);

      const newBalance = db.getBalance(userId);

      const embed = new EmbedBuilder()
        .setColor('Purple')
        .setTitle('🎉 Daily Reward Claimed!')
        .setDescription(`You received **${currency}${DAILY_AMOUNT}** as your daily reward.\nNew Balance: **${currency}${newBalance}**`)
        .setTimestamp()
        .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 512 }));

      return interaction.reply({ embeds: [embed] });
    }
  }
};