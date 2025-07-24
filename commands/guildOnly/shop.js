const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../db');

const currency = 'SR £';

const shopItems = [
  { name: 'Cookie', price: 500, description: 'A sweet treat 🍪' },
  { name: 'Laptop', price: 5000, description: 'Access secret features 💻' },
];

const memeImages = [
  'https://i.imgur.com/fYk3h7I.png',
  'https://i.imgur.com/4M34hi2.gif',
  'https://i.imgur.com/W3WqCUp.png',
  'https://i.imgur.com/KT2eTQt.jpeg',
  'https://i.imgur.com/ee1x1WA.jpeg',
  'https://i.imgur.com/NLzBwh1.jpeg'
];

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
        .setDescription('Use an item')
        .addStringOption(opt => opt.setName('item').setDescription('Item to use').setRequired(true)))
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

    const findItem = (name) => shopItems.find(i => i.name.toLowerCase() === name.toLowerCase());

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setTitle('🛍️ Supreme Rendezvous Shop')
        .setColor('Blue')
        .setDescription(shopItems.map(i =>
          `**${i.name}** — ${currency}${i.price}\n*${i.description}*`).join('\n'));

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'buy') {
      const itemName = interaction.options.getString('item');
      const item = findItem(itemName);
      if (!item) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Item Not Found').setDescription(`Item **${itemName}** does not exist.`).setColor('Red')], ephemeral: true });

      const balance = db.getBalance(userId);
      if (balance < item.price) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('❌ Insufficient Funds').setDescription(`You need ${currency}${item.price}, but have ${currency}${balance}.`).setColor('Red')],
          ephemeral: true
        });
      }

      db.setBalance(userId, balance - item.price);
      db.addItem(userId, item.name);

      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('✅ Purchase Successful').setDescription(`You bought **${item.name}** for ${currency}${item.price}.`).setColor('Green')]
      });
    }

    if (sub === 'sell') {
      const itemName = interaction.options.getString('item');
      const item = findItem(itemName);
      if (!item || !db.hasItem(userId, item.name)) {
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Cannot Sell').setDescription('You don’t have this item.').setColor('Red')], ephemeral: true });
      }

      const value = Math.floor(item.price / 2);
      db.removeItem(userId, item.name);
      db.addBalance(userId, value);

      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🪙 Sold!').setDescription(`You sold **${item.name}** for ${currency}${value}.`).setColor('Orange')]
      });
    }

    if (sub === 'inventory') {
      const inv = db.getInventory(userId);
      const counts = inv.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
      const desc = Object.entries(counts).map(([item, qty]) => `• ${item} × ${qty}`).join('\n');

      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎒 Your Inventory').setDescription(desc || 'You have no items.').setColor('DarkGreen')] });
    }

    if (sub === 'iteminfo') {
      const itemName = interaction.options.getString('item');
      const item = findItem(itemName);
      if (!item) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Item Not Found').setDescription('That item does not exist.').setColor('Red')], ephemeral: true });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`📦 ${item.name}`)
            .setDescription(`**Price**: ${currency}${item.price}\n**Description**: ${item.description}`)
            .setColor('Aqua')
        ]
      });
    }

    if (sub === 'gift') {
      const itemName = interaction.options.getString('item');
      const recipient = interaction.options.getUser('user');
      const item = findItem(itemName);

      if (!item || !db.hasItem(userId, item.name)) {
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Cannot Gift').setDescription('You don’t own this item.').setColor('Red')], ephemeral: true });
      }

      db.removeItem(userId, item.name);
      db.addItem(recipient.id, item.name);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🎁 ${username} has a gift for you!`)
            .setDescription(`It's a... ||${item.name}|| 🥳🎉\n*They gifted you something from the shop!*`)
            .setColor('Fuchsia')
        ],
        content: `<@${recipient.id}>`,
      });
    }

    if (sub === 'use') {
      const itemName = interaction.options.getString('item');
      const has = db.hasItem(userId, itemName);
      if (!has) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Item Not Found').setDescription('You don’t own this item.').setColor('Red')], ephemeral: true });

      let title = `🧰 You used **${itemName}**`;
      let description = '';
      let color = 'Grey';
      const roll = Math.random();

      if (itemName.toLowerCase() === 'cookie') {
        if (roll < 0.7) description = '🍪 It’s just a cookie. Nothing happened.';
        else if (roll < 0.9) {
          db.addBalance(userId, 100);
          description = '💰 You sold the cookie and earned **SR £100**!';
          color = 'Green';
        } else {
          db.setBalance(userId, Math.max(0, db.getBalance(userId) - 250));
          description = '🏥 You got sick and paid **SR £250** in bills.';
          color = 'Red';
        }
        db.removeItem(userId, itemName);
      } else if (itemName.toLowerCase() === 'laptop') {
        if (roll < 0.6) {
          const msgs = ['🕹️ Played games', '📺 Watched SR Netflix', '😴 Slept on your desk'];
          description = msgs[Math.floor(Math.random() * msgs.length)];
        } else if (roll < 0.9) {
          const earn = Math.floor(200 + Math.random() * 300);
          db.addBalance(userId, earn);
          description = `👨‍💻 Freelanced online and earned **SR £${earn}**!`;
          color = 'Green';
        } else {
          db.removeItem(userId, itemName);
          description = '💥 Your laptop exploded. It’s gone.';
          color = 'DarkRed';
        }
      } else {
        description = `You used **${itemName}**, but nothing happened.`;
        db.removeItem(userId, itemName);
      }

      const meme = memeImages[Math.floor(Math.random() * memeImages.length)];

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setImage(meme)
        ]
      });
    }
  }
};