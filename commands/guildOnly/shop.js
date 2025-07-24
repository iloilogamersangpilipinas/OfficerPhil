const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const db = require('../../db');

const items = [
  {
    name: "Sherlyn's taco",
    price: 100,
    description: '⚠️ Risky taco that may send you to the hospital 💩',
    maxUses: 1,
    image: 'https://cdn.pixabay.com/photo/2017/03/17/19/25/taco-2155811_1280.png',
  },
  {
    name: 'Pagins avec riz',
    price: 300,
    description: 'Prideful food from Supreme Rendezvous <:flag_sr:1397090597394710528>',
    maxUses: 1,
    image: 'https://cdn.pixabay.com/photo/2017/09/02/13/26/rice-2707241_1280.jpg',
  },
  {
    name: 'Water',
    price: 50,
    description: 'Just plain water. Could be dangerous.',
    maxUses: 1,
    image: 'https://cdn.pixabay.com/photo/2017/07/31/11/21/glass-2561440_1280.jpg',
  },
  {
    name: 'Fishing rod',
    price: 200,
    description: 'Catch fish (or junk)! Can break.',
    maxUses: null, // infinite uses but can break
    image: 'https://cdn.pixabay.com/photo/2017/06/21/19/20/fishing-rod-2420545_1280.jpg',
  },
  {
    name: 'Bible',
    price: 150,
    description: 'Feel glorified. 10 uses.',
    maxUses: 10,
    image: 'https://cdn.pixabay.com/photo/2016/10/22/19/00/bible-1761276_1280.jpg',
  },
  {
    name: 'Laptop',
    price: 800,
    description: 'Can be used infinitely unless broken.',
    maxUses: null,
    image: 'https://cdn.pixabay.com/photo/2014/05/02/21/50/home-office-336378_1280.jpg',
  },
  {
    name: 'Cookie',
    price: 150,
    description: 'Light and sweet. But who knows what’s inside?',
    maxUses: 1,
    image: 'https://cdn.pixabay.com/photo/2014/12/15/13/40/cookie-569102_1280.jpg',
  },
];

function getItem(name) {
  return items.find(i => i.name.toLowerCase() === name.toLowerCase());
}

const outcomes = {
  "sherlyn's taco": [
    'You enjoyed the taco… kind of.',
    'You got severe diarrhea and went to the hospital 💩 -£200',
    'It tasted funky, but nothing happened.',
    'You passed out from the spice. Wake up!',
    'You hallucinated a talking chihuahua.',
    'You threw up immediately. Ew.',
    'You became immune to all bacteria. Wow!',
    'You shared it with a stranger. They cried.',
    'You posted it on TikTok. It went viral!',
    'You traded it for a juice box. Worth it?',
  ],
  'pagins avec riz': [
    'You feel proud of the Republic of Supreme Rendezvous! <:flag_sr:1397090597394710528>',
    'You donated it to the poor. +£150',
    'Someone stole your plate. Sad.',
    'You ate it with spicy sauce. 🔥',
    'It gave you nostalgia.',
    'You got food poisoning. -£100',
    'You gave it to a dog. They smiled.',
    'You spilled it. No refund.',
    'You taught someone how to cook it.',
    'You used it in a peace offering.',
  ],
  water: [
    'Refreshing and safe… this time.',
    'You got salmonella from the water. -£100',
    'You spilled it on your laptop.',
    'You watered a dying plant. It bloomed.',
    'You froze it for ice cubes.',
    'It was lukewarm and disappointing.',
    'You used it to wash your hands.',
    'It was from a holy spring. You feel blessed.',
    'You gave it to a thirsty stranger.',
    'You drank too fast and choked a little.',
  ],
  'fishing rod': [
    '🎣 LEGENDARY CATCH! +£50000',
    '🎣 Lucky catch! +£250',
    '🎣 You caught some fish. +£75',
    '🎣 You caught a boot. Better luck next time.',
    '🎣 The line snapped. Nothing caught.',
    '🎣 You caught a bottle with a map inside.',
    '🎣 You reeled in an angry crab.',
    '🎣 You caught seaweed. Tasty?',
    '🎣 You found a message in a bottle!',
    '🎣 You accidentally hooked your shoe.',
    '🎣 Your rod snapped in half. It’s broken forever.',
  ],
  bible: [
    'You feel glorified. 🙏',
    'You read a powerful verse. Tears were shed.',
    'You led a small sermon. +Respect',
    'You glowed faintly for 3 seconds.',
    'You felt forgiven.',
    'You got into a debate. You won.',
    'You prayed for world peace.',
    'You found a pressed flower inside.',
    'You inspired someone.',
    'You felt a divine presence.',
  ],
  laptop: [
    '💻 You browsed the internet and felt productive.',
    '💻 Your laptop broke from overuse.',
    '💻 You learned to code!',
    '💻 You played games instead of working.',
    '💻 You ordered food online.',
    '💻 It updated and rebooted for 3 hours.',
    '💻 You used it to make money. +£300',
    '💻 It got a virus. Uh oh.',
    '💻 You spilled coffee on it. Careful!',
    '💻 You joined a Zoom call accidentally.',
  ],
  cookie: [
    '🍪 You ate the cookie. Delicious!',
    '🍪 It was a fortune cookie: "You will be rich!" +£200',
    '🍪 It had a weird aftertaste. -£50 for antacid.',
    '🍪 It boosted your happiness.',
    '🍪 You shared it with a friend. +Respect',
    '🍪 It was hard as a rock. You broke a tooth.',
    '🍪 It turned out to be raisin. Yuck!',
    '🍪 You gave it to a stranger. They gave you £100!',
    '🍪 You dipped it in milk. Perfect.',
    '🍪 It was cursed. You sneezed nonstop.',
  ],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Shop commands')
    .addSubcommand(sub =>
      sub
        .setName('buy')
        .setDescription('Buy an item')
        .addStringOption(opt =>
          opt.setName('item').setDescription('Item name').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('use').setDescription('Use an item from your inventory')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'buy') {
      const itemName = interaction.options.getString('item');
      const item = getItem(itemName);
      if (!item)
        return interaction.reply({ content: 'Item not found.', ephemeral: true });

      const balance = db.getBalance(userId);
      if (balance < item.price)
        return interaction.reply({ content: 'Not enough money.', ephemeral: true });

      db.addItem(userId, item.name);
      db.addBalance(userId, -item.price);

      if (item.maxUses !== null) {
        db.setUsesLeft(userId, item.name, item.maxUses);
      }

      return interaction.reply({
        content: `You bought **${item.name}** for **£${item.price}**.`,
      });
    }

    if (sub === 'use') {
      const inventory = db.getInventory(userId) || [];
      if (inventory.length === 0)
        return interaction.reply({
          content: 'Your inventory is empty.',
          ephemeral: true,
        });

      const select = new StringSelectMenuBuilder()
        .setCustomId('use_item_select')
        .setPlaceholder('Choose an item to use')
        .addOptions(
          inventory.map(itemName => ({
            label: itemName,
            value: itemName.toLowerCase(),
          }))
        );

      const row = new ActionRowBuilder().addComponents(select);

      return interaction.reply({
        content: 'Select an item to use:',
        components: [row],
        ephemeral: true,
      });
    }
  },

  async useItem(userId, itemKey, interaction) {
    const item = getItem(itemKey);
    if (!item) {
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Item not found.');
      return { embed };
    }

    const key = item.name.toLowerCase();
    const possible = outcomes[key];
    let description = 'Nothing happened...';

    if (possible && possible.length > 0) {
      description = possible[Math.floor(Math.random() * possible.length)];

      // Auto handle currency changes
      const gainMatch = description.match(/\+£(\d+)/);
      const lossMatch = description.match(/-£(\d+)/);
      if (gainMatch) db.addBalance(userId, parseInt(gainMatch[1]));
      if (lossMatch) db.addBalance(userId, -parseInt(lossMatch[1]));

      // Handle broken items removal
      if (/laptop broke|rod snapped|rod.*broken/i.test(description)) {
        db.removeItem(userId, item.name);
      }
    }

    if (item.maxUses !== null) {
      db.decrementUse(userId, item.name);
    }

    const remainingUses =
      item.maxUses !== null ? db.getUsesLeft(userId, item.name) ?? 0 : '∞';

    const embed = new EmbedBuilder()
      .setTitle(`You used ${item.name}`)
      .setDescription(description)
      .setThumbnail(item.image)
      .setFooter({ text: `Uses left: ${remainingUses}` });

    return { embed };
  },
};