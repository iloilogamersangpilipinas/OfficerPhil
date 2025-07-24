const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../db');

const items = [
  {
    name: 'Sherlyn\'s taco',
    price: 100,
    description: '⚠️ Risky taco that may send you to the hospital 💩',
    maxUses: 1,
    image: 'https://example.com/taco.png'
  },
  {
    name: 'Pagins avec riz',
    price: 300,
    description: 'Prideful food from Supreme Rendezvous <:flag_sr:1397090597394710528>',
    maxUses: 1,
    image: 'https://example.com/rice.png'
  },
  {
    name: 'Water',
    price: 50,
    description: 'Just plain water. Could be dangerous.',
    maxUses: 1,
    image: 'https://example.com/water.png'
  },
  {
    name: 'Fishing rod',
    price: 200,
    description: 'Catch fish (or junk)! 10 uses.',
    maxUses: 10,
    image: 'https://example.com/fishingrod.png'
  },
  {
    name: 'Bible',
    price: 150,
    description: 'Feel glorified. 10 uses.',
    maxUses: 10,
    image: 'https://example.com/bible.png'
  },
  {
    name: 'Laptop',
    price: 800,
    description: 'Can be used infinitely unless broken.',
    maxUses: null,
    image: 'https://example.com/laptop.png'
  },
];

function getItem(name) {
  return items.find(i => i.name.toLowerCase() === name.toLowerCase());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Shop commands')
    .addSubcommand(sub => sub.setName('buy').setDescription('Buy an item').addStringOption(opt => opt.setName('item').setDescription('Item name').setRequired(true)))
    .addSubcommand(sub => sub.setName('use').setDescription('Use an item from your inventory')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'buy') {
      const itemName = interaction.options.getString('item');
      const item = getItem(itemName);
      if (!item) return interaction.reply({ content: 'Item not found.', ephemeral: true });

      const balance = db.getBalance(userId);
      if (balance < item.price) return interaction.reply({ content: 'Not enough money.', ephemeral: true });

      db.addItem(userId, item.name);
      db.addBalance(userId, -item.price);

      if (item.maxUses) {
        db.setUsesLeft(userId, item.name, item.maxUses);
      }

      return interaction.reply({ content: `You bought **${item.name}** for **£${item.price}**.` });

    } else if (sub === 'use') {
      const inventory = db.getInventory(userId);
      if (inventory.length === 0) return interaction.reply({ content: 'Your inventory is empty.', ephemeral: true });

      const select = new StringSelectMenuBuilder()
        .setCustomId('use_item_select')
        .setPlaceholder('Choose an item to use')
        .addOptions(inventory.map(itemName => {
          return {
            label: itemName,
            value: itemName.toLowerCase(),
          };
        }));

      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({ content: 'Select an item to use:', components: [row], ephemeral: true });
    }
  },

  async useItem(userId, itemKey, interaction) {
    const item = getItem(itemKey);
    if (!item) {
      return { embed: new EmbedBuilder().setTitle('Error').setDescription('Item not found.') };
    }

    const usesLeft = db.getUsesLeft(userId, item.name);
    let description = '';
    const roll = Math.random();

    switch (item.name.toLowerCase()) {
      case "sherlyn's taco":
        if (roll < 0.3) {
          db.addBalance(userId, -200);
          description = 'You got severe diarrhea and went to the hospital 💩 -£200';
        } else {
          description = 'You enjoyed the taco... kind of.';
        }
        break;

      case 'pagins avec riz':
        if (roll < 0.2) {
          const gain = 150;
          db.addBalance(userId, gain);
          description = `You donated food to the poor. +£${gain}`;
        } else {
          description = 'You feel proud of the Republic of Supreme Rendezvous! <:flag_sr:1397090597394710528>';
        }
        break;

      case 'water':
        if (roll < 0.1) {
          db.addBalance(userId, -100);
          description = 'You got salmonella from the water. -£100';
        } else {
          description = 'Refreshing and safe... this time.';
        }
        break;

      case 'fishing rod':
        if (roll < 0.05) {
          const pounds = Math.floor(Math.random() * 90001) + 10000;
          db.addBalance(userId, pounds);
          description = `🎣 LEGENDARY CATCH! You earned £${pounds}`;
        } else if (roll < 0.15) {
          const pounds = Math.floor(Math.random() * 401) + 100;
          db.addBalance(userId, pounds);
          description = `🎣 Lucky catch! +£${pounds}`;
        } else if (roll < 0.5) {
          const pounds = Math.floor(Math.random() * 91) + 10;
          db.addBalance(userId, pounds);
          description = `🎣 You caught some fish. +£${pounds}`;
        } else {
          description = '🎣 You caught a boot. Better luck next time.';
        }
        break;

      case 'bible':
        description = 'You feel glorified. 🙏';
        break;

      case 'laptop':
        if (roll < 0.1) {
          db.removeItem(userId, item.name);
          description = '💻 Your laptop broke from overuse.';
        } else {
          description = '💻 You browsed the internet and felt productive.';
        }
        break;

      default:
        description = 'Nothing happened...';
    }

    if (item.maxUses) {
      db.decrementUse(userId, item.name);
    }

    const remainingUses = item.maxUses ? db.getUsesLeft(userId, item.name) ?? 0 : '∞';

    const embed = new EmbedBuilder()
      .setTitle(`You used ${item.name}`)
      .setDescription(description)
      .setThumbnail(item.image)
      .setFooter({ text: `Uses left: ${remainingUses}` });

    return { embed };
  }
};