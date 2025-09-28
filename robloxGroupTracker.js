// robloxGroupTracker.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

const GROUP_ID = 35590726; // your Roblox group ID
const CHANNEL_ID = '1245874836308361266'; // join-logs channel ID
const MEMBER_FILE = path.join(__dirname, 'members.json');

// Fetch Roblox group members
async function getGroupMembers() {
  const res = await fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users`);
  const data = await res.json();
  return data.data.map(member => ({
    userId: member.userId,
    username: member.username,
    role: member.role.name
  }));
}

// Main function to check for joins and role changes
async function checkForGroupUpdates(client) {
  let oldMembers = {};
  if (fs.existsSync(MEMBER_FILE)) {
    oldMembers = JSON.parse(fs.readFileSync(MEMBER_FILE, 'utf8'));
  }

  const newMembers = await getGroupMembers();
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) return;

  for (const member of newMembers) {
    const old = oldMembers[member.userId];

    // New member joined
    if (!old) {
      const joinTimestamp = Math.floor(Date.now() / 1000);
      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({ name: `New Roblox Member Joined: ${member.username}`, iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${member.userId}&width=420&height=420&format=png`)
        .addFields(
          { name: 'Username', value: member.username, inline: true },
          { name: 'Role', value: member.role, inline: true },
          { name: 'Joined', value: `<t:${joinTimestamp}:R>`, inline: false }
        )
        .setFooter({ text: 'Roblox group tracking | Join time shown relative' })
        .setTimestamp();

      channel.send({ embeds: [embed] });
      oldMembers[member.userId] = { ...member, joinedAt: joinTimestamp };
      continue;
    }

    // Role changed
    if (old.role !== member.role) {
      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({ name: `Roblox Role Update: ${member.username}`, iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${member.userId}&width=420&height=420&format=png`)
        .addFields(
          { name: 'Username', value: member.username, inline: true },
          { name: 'Old Role', value: old.role, inline: true },
          { name: 'New Role', value: member.role, inline: true }
        )
        .setFooter({ text: 'Roblox group tracking | Role update time relative' })
        .setTimestamp();

      channel.send({ embeds: [embed] });
    }

    // Update state
    oldMembers[member.userId] = { ...member, joinedAt: old.joinedAt || Math.floor(Date.now() / 1000) };
  }

  // Remove members who left
  for (const userId in oldMembers) {
    if (!newMembers.some(m => m.userId == userId)) {
      delete oldMembers[userId];
    }
  }

  fs.writeFileSync(MEMBER_FILE, JSON.stringify(oldMembers, null, 2));
}

// Export a function to start the tracker
module.exports = (client) => {
  // Run immediately
  checkForGroupUpdates(client);

  // Schedule every 5 minutes
  setInterval(() => checkForGroupUpdates(client), 5 * 60 * 1000);
};