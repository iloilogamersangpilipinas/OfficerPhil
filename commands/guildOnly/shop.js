const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../db');

const currency = 'SR £';

const shopItems = [
  { name: 'Cookie', price: 100, description: 'A sweet treat 🍪', maxUses: 1 },
  { name: 'Laptop', price: 5000, description: 'Access secret features 💻', maxUses: null },
  { name: "Sherlyn's taco", price: 150, description: 'Beware the aftermath 🌮', maxUses: 1 },
  { name: 'Pagins avec riz', price: 300, description: 'Prideful food from Supreme Rendezvous <:flag_sr:1397090597394710528>', maxUses: 1 },
  { name: 'Water', price: 50, description: 'Refresh yourself 💧', maxUses: 1 },
  { name: 'Fishing rod', price: 8000, description: 'Catch fish or maybe boots 🎣', maxUses: 10 },
  { name: 'Bible', price: 1500, description: 'Feel glorified 🙏', maxUses: 10 },
];

const memeImages = [
  'https://i.imgur.com/fYk3h7I.png',
  'https://i.imgur.com/4M34hi2.gif',
  'https://i.imgur.com/W3WqCUp.png',
  'https://i.imgur.com/KT2eTQt.jpeg',
  'https://i.imgur.com/ee1x1WA.jpeg',
  'https://i.imgur.com/NLzBwh1.jpeg'
];

// Helper: Find item by name (case-insensitive)
const findItem = (name) => shopItems.find(i => i.name.toLowerCase() === name.toLowerCase());

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Economy shop & inventory')
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View items in the shop'))
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Buy an item')
        .addStringOption(opt => opt.setName('item').setDescription('Item name').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('sell')
        .setDescription('Sell an item')
        .addStringOption(opt => opt.setName('item').setDescription('Item name').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('inventory').setDescription('View your inventory'))
    .addSubcommand(sub =>
      sub.setName('use')
        .setDescription('Use an item from your inventory'))
    .addSubcommand(sub =>
      sub.setName('gift')
        .setDescription('Gift an item to another user')
        .addStringOption(opt => opt.setName('item').setDescription('Item to gift').setRequired(true))
        .addUserOption(opt => opt.setName('user').setDescription('User to gift to').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('iteminfo')
        .setDescription('View item details')
        .addStringOption(opt => opt.setName('item').setDescription('Item name').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const username = interaction.user.username;

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setTitle('🛍️ Supreme Rendezvous Shop')
        .setColor('Blue')
        .setDescription(shopItems.map(i =>
          `**${i.name}** — ${currency}${i.price}\n*${i.description}*`).join('\n\n'));

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'buy') {
      const itemName = interaction.options.getString('item');
      const item = findItem(itemName);
      if (!item) return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('❌ Item Not Found').setDescription(`Item **${itemName}** does not exist.`).setColor('Red')],
        ephemeral: true
      });

      const balance = db.getBalance(userId);
      if (balance < item.price) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('❌ Insufficient Funds').setDescription(`You need ${currency}${item.price}, but have ${currency}${balance}.`).setColor('Red')],
          ephemeral: true
        });
      }

      db.setBalance(userId, balance - item.price);
      db.addItem(userId, item.name);

      if (item.maxUses && item.maxUses > 1) {
        db.setUsesLeft(userId, item.name, item.maxUses);
      }

      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('✅ Purchase Successful').setDescription(`You bought **${item.name}** for ${currency}${item.price}.`).setColor('Green')]
      });
    }

    if (sub === 'sell') {
      const itemName = interaction.options.getString('item');
      const item = findItem(itemName);
      if (!item || !db.hasItem(userId, item.name)) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('❌ Cannot Sell').setDescription('You don’t have this item.').setColor('Red')],
          ephemeral: true
        });
      }

      const value = Math.floor(item.price / 2);
      db.removeItem(userId, item.name);
      db.addBalance(userId, value);

      if (db.getUsesLeft(userId, item.name) !== null) {
        db.setUsesLeft(userId, item.name, 0);
      }

      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🪙 Sold!').setDescription(`You sold **${item.name}** for ${currency}${value}.`).setColor('Orange')]
      });
    }

    if (sub === 'inventory') {
      const inv = db.getInventory(userId);
      if (inv.length === 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('🎒 Your Inventory').setDescription('You have no items.').setColor('DarkGreen')]
        });
      }

      const counts = inv.reduce((acc, itemName) => {
        acc[itemName] = (acc[itemName] || 0) + 1;
        return acc;
      }, {});

      const desc = Object.entries(counts).map(([itemName, qty]) => {
        const usesLeft = db.getUsesLeft(userId, itemName);
        return `• ${itemName} × ${qty}` + (usesLeft !== null ? ` (Uses left: ${usesLeft})` : '');
      }).join('\n');

      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🎒 Your Inventory').setDescription(desc).setColor('DarkGreen')]
      });
    }

    if (sub === 'iteminfo') {
      const itemName = interaction.options.getString('item');
      const item = findItem(itemName);
      if (!item) return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('❌ Item Not Found').setDescription('That item does not exist.').setColor('Red')],
        ephemeral: true
      });

      let usageInfo = item.maxUses ? (item.maxUses === 1 ? 'Single-use item.' : `Can be used ${item.maxUses} times.`) : 'Unlimited uses.';

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`📦 ${item.name}`)
            .setDescription(`**Price**: ${currency}${item.price}\n**Description**: ${item.description}\n**Usage:** ${usageInfo}`)
            .setColor('Aqua')
        ]
      });
    }

    if (sub === 'gift') {
      const itemName = interaction.options.getString('item');
      const recipient = interaction.options.getUser('user');
      const item = findItem(itemName);

      if (!item || !db.hasItem(userId, item.name)) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('❌ Cannot Gift').setDescription('You don’t own this item.').setColor('Red')],
          ephemeral: true
        });
      }

      try {
        await recipient.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`🎁 ${username} has a gift for you!`)
              .setDescription(`It's a... ||${item.name}|| 🥳🎉\n*They gifted you something from the shop!*`)
              .setColor('Fuchsia')
          ]
        });

        db.removeItem(userId, item.name);

        if (db.getUsesLeft(userId, item.name) !== null) {
          db.setUsesLeft(userId, item.name, 0);
        }
      } catch {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('❌ Cannot DM User').setDescription(`Could not send gift to ${recipient.tag}. They may have DMs disabled.`).setColor('Red')],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎉 Gift Sent!')
            .setDescription(`You gifted **${item.name}** to ${recipient.tag}.`)
            .setColor('Green')
        ]
      });
    }

    if (sub === 'use') {
      const inv = db.getInventory(userId);
      if (inv.length === 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('🎒 Your Inventory').setDescription('You have no items to use.').setColor('DarkGreen')],
          ephemeral: true
        });
      }

      const uniqueItems = [...new Set(inv)];

      const options = uniqueItems.map(itemName => ({
        label: itemName,
        description: `Use your ${itemName}`,
        value: itemName.toLowerCase()
      }));

      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('use_item_select')
            .setPlaceholder('Select an item to use')
            .addOptions(options)
        );

      return interaction.reply({
        content: 'Select an item to use from your inventory:',
        components: [row],
        ephemeral: true
      });
    }
  },

  async useItem(userId, itemName, interaction) {
    // Your existing useItem logic here (unchanged)
    // Make sure it calls db.removeItem(userId, itemName) when an item is used up
  }
};
