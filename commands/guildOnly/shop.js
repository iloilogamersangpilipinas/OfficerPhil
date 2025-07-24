const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../db');

const currency = 'SR £';

const shopItems = [
  { name: 'Cookie', price: 100, description: 'A sweet treat 🍪', maxUses: 1 },
  { name: 'Laptop', price: 5000, description: 'Access secret features 💻', maxUses: null },
  { name: "Sherlyn's taco", price: 150, description: 'Beware the aftermath 🌮', maxUses: 1 },
  { name: 'Pagins avec riz', price: 300, description: 'Prideful food from Supreme Rendezvous <:flag_sr:1397090597394710528>', maxUses: 1 },
  { name: 'Water', price: 50, description: 'Refresh yourself 💧', maxUses: 1 },
  { name: 'Fishing rod', price: 8000, description: 'Catch fish or maybe boots 🎣', maxUses: null }, // unlimited but can break
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

      // For items with limited uses, initialize usage count on purchase
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

      // Remove usage tracking if exists when sold
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

      // Count items
      const counts = inv.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});

      // Build inventory lines with uses left if applicable
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
        // Remove usage tracking if any
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
      const itemName = interaction.options.getString('item');
      if (!db.hasItem(userId, itemName)) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Item Not Found')
            .setDescription('You don’t own this item.')
            .setColor('Red')],
          ephemeral: true
        });
      }

      let title = `🧰 You used **${itemName}**`;
      let description = '';
      let color = 'Grey';
      const roll = Math.random();

      const usageLeft = db.getUsesLeft(userId, itemName);

      switch (itemName.toLowerCase()) {
        case 'cookie':
          if (roll < 0.7) description = '🍪 It’s just a cookie. Nothing happened.';
          else if (roll < 0.9) {
            db.addBalance(userId, 100);
            description = `💰 You sold the cookie and earned **${currency}100**!`;
            color = 'Green';
          } else {
            db.setBalance(userId, Math.max(0, db.getBalance(userId) - 250));
            description = `🏥 You got sick and paid **${currency}250** in bills.`;
            color = 'Red';
          }
          db.removeItem(userId, itemName);
          db.setUsesLeft(userId, itemName, 0);
          break;

        case "sherlyn's taco":
          if (roll < 0.7) description = "🌮 Nothing happened, just a taco.";
          else {
            db.setBalance(userId, Math.max(0, db.getBalance(userId) - 500));
            description = "💩 You had severe diarrhea and paid hospital bills!";
            color = 'Red';
          }
          db.removeItem(userId, itemName);
          db.setUsesLeft(userId, itemName, 0);
          break;

        case 'pagins avec riz':
          if (roll < 0.8) description = "You feel proud of the Republic of Supreme Rendezvous <:flag_sr:1397090597394710528>!";
          else {
            const earn = 200 + Math.floor(Math.random() * 300);
            db.addBalance(userId, earn);
            description = `🍲 You donated food to the poor and earned **${currency}${earn}**!`;
            color = 'Green';
          }
          db.removeItem(userId, itemName);
          db.setUsesLeft(userId, itemName, 0);
          break;

        case 'water':
          if (roll < 0.9) description = "💧 You drank water and feel refreshed, nothing happened.";
          else {
            db.setBalance(userId, Math.max(0, db.getBalance(userId) - 400));
            description = "🤢 You got salmonella and paid hospital bills!";
            color = 'Red';
          }
          db.removeItem(userId, itemName);
          db.setUsesLeft(userId, itemName, 0);
          break;

        case 'fishing rod': {
          // Chance to break each use like laptop
          const breakRoll = Math.random();
          if (usageLeft === null) {
            // Initialize usage to null (unlimited)
            // No decrement because unlimited
          } else {
            db.decrementUse(userId, itemName); // Decrement uses if tracked (not used here but for consistency)
          }

          if (breakRoll < 0.05) {
            db.removeItem(userId, itemName);
            db.setUsesLeft(userId, itemName, 0);
            description = `💥 Your fishing rod broke and is gone.`;
            color = 'DarkRed';
          } else if (roll < 0.5) {
            const junk = ['a boot 🥾', 'an old shoe 👞', 'a rusty can 🥫'];
            description = `🎣 You caught ${junk[Math.floor(Math.random() * junk.length)]}. No profit.`;
          } else if (roll < 0.85) {
            const earn = 10 + Math.floor(Math.random() * 91); // 10-100
            db.addBalance(userId, earn);
            description = `🎣 You caught some fish and earned **${currency}${earn}**!`;
            color = 'Green';
          } else if (roll < 0.95) {
            const earn = 100 + Math.floor(Math.random() * 401); // 100-500
            db.addBalance(userId, earn);
            description = `🎣 Lucky catch! You earned **${currency}${earn}**!`;
            color = 'Green';
          } else {
            const earn = 10000 + Math.floor(Math.random() * 90001); // 10k-100k
            db.addBalance(userId, earn);
            description = `🎣 LEGENDARY CATCH!!! You earned **${currency}${earn}**!!! 🎉🎉🎉`;
            color = 'Gold';
          }
          break;
        }

        case 'bible': {
          if (usageLeft === null) {
            db.setUsesLeft(userId, itemName, 9);
          } else {
            db.decrementUse(userId, itemName);
          }

          const updatedUses = db.getUsesLeft(userId, itemName);

          const bibleMessages = [
            "🙏 You feel glorified and peaceful.",
            "📖 You meditate on the good word.",
            "✨ You feel spiritually uplifted.",
            "🕊️ A moment of serenity washes over you.",
            "🌟 Faith fills your heart."
          ];

          description = bibleMessages[Math.floor(Math.random() * bibleMessages.length)];

          title += updatedUses !== null ? ` (${updatedUses} uses left)` : '';
          break;
        }

        case 'laptop':
          if (roll < 0.6) {
            const msgs = ['🕹️ Played games', '📺 Watched SR Netflix', '😴 Slept on your desk'];
            description = msgs[Math.floor(Math.random() * msgs.length)];
          } else if (roll < 0.9) {
            const earn = Math.floor(200 + Math.random() * 300);
            db.addBalance(userId, earn);
            description = `👨‍💻 Freelanced online and earned **${currency}${earn}**!`;
            color = 'Green';
          } else {
            db.removeItem(userId, itemName);
            db.setUsesLeft(userId, itemName, 0);
            description = '💥 Your laptop exploded. It’s gone.';
            color = 'DarkRed';
          }
          break;

        default:
          description = `You used **${itemName}**, but nothing happened.`;
          db.removeItem(userId, itemName);
          db.setUsesLeft(userId, itemName, 0);
          break;
      }

      const meme = memeImages[Math.floor(Math.random() * memeImages.length)];

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setImage(meme)
            .setFooter({ text: usageLeft !== null ? `Uses left: ${usageLeft}` : '' })
        ]
      });
    }
  }
};