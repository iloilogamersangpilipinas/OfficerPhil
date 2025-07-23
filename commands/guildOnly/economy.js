const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const axios = require('axios');

const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'X-Master-Key': API_KEY
};

async function loadBalances() {
  try {
    const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers });
    return res.data.record || {};
  } catch (err) {
    console.error('Failed to load balances:', err.response?.data || err.message);
    return {};
  }
}

async function saveBalances(balances) {
  try {
    await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, balances, { headers });
  } catch (err) {
    console.error('Failed to save balances:', err.response?.data || err.message);
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
        .setName('reset')
        .setDescription('Reset all economy balances (admin only)')),

  async execute(interaction) {
    const currency = 'SR £';

    if (interaction.options.getSubcommand() === 'reset') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      // Send confirmation buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_reset_yes')
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('confirm_reset_no')
            .setLabel('No')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.reply({ content: '⚠️ Are you sure you want to reset the entire economy? This action cannot be undone.', components: [row], ephemeral: true });

      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 15000 });

      collector.on('collect', async i => {
        if (i.customId === 'confirm_reset_yes') {
          collector.stop('confirmed');

          await saveBalances({});

          await i.update({ content: `✅ The Republic of Supreme Rendezvous' Economy has been reset by **${interaction.user.tag}**.`, components: [] });

          // DM audit log to you (user ID: 1002294482600984598)
          const auditUserId = '1002294482600984598';
          try {
            const auditUser = await interaction.client.users.fetch(auditUserId);
            if (auditUser) {
              await auditUser.send(`⚠️ Economy reset by **${interaction.user.tag}** (${interaction.user.id})`);
            }
          } catch (error) {
            console.error('Failed to send audit DM:', error);
          }

        } else if (i.customId === 'confirm_reset_no') {
          collector.stop('cancelled');
          await i.update({ content: '❌ Economy reset cancelled.', components: [] });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason !== 'confirmed' && reason !== 'cancelled') {
          interaction.editReply({ content: '⌛ Economy reset timed out.', components: [] });
        }
      });

      return; // stop further execution
    }

    // For all other commands, load balances
    const balances = await loadBalances();

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

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🏦 Account Balance')
        .setDescription(`**${user.tag}** has a balance of **${currency}${balance}**`)
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

      await saveBalances(balances);

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

      await saveBalances(balances);

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🧾 Money Removed')
        .setDescription(`Removed **${currency}${amount}** from **${user.tag}**.\nNew Balance: **${currency}${balances[user.id]}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};