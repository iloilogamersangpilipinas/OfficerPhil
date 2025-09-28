// robloxGroupTracker.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

const GROUP_ID = 35590726; // your Roblox group ID
const CHANNEL_ID = '1245874836308361266'; // join-logs channel ID
const MEMBER_FILE = path.join(__dirname, 'members.json');

// Fetch all Roblox group members with pagination
async function getGroupMembers() {
  let members = [];
  let cursor = null;

  do {
    const url = `https://groups.roblox.com/v1/groups/${GROUP_ID}/users?limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data) break; // No members

    members.push(...data.data.map(m => ({
      userId: m.userId,
      username: m.username,
      role: m.role.name
    })));

    cursor = data.nextPageCursor || null;
  } while (cursor);

  return members;
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
        .setAuthor({ name: `New Roblox Member Joined`, iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${member.userId}&width=420&height=420&format=png`)
        .addFields(
          { name: 'Username', value: `${member.username}`, inline: false },
          { name: 'Role', value: `${member.role}`, inline: false },
          { name: 'Joined', value: `<t:${joinTimestamp}:R>`, inline: false }
        )
        .setFooter({ text: 'Roblox group tracking | Join time shown relative' })
        .setTimestamp();

      try { await channel.send({ embeds: [embed] }); } catch(err) { console.error('Error sending join embed:', err); }

      oldMembers[member.userId] = { ...member, joinedAt: joinTimestamp };
      continue;
    }

    // Role changed
    if (old.role !== member.role) {
      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({ name: `Roblox Role Update`, iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${member.userId}&width=420&height=420&format=png`)
        .addFields(
          { name: 'Username', value: `${member.username}`, inline: false },
          { name: 'Old Role', value: `${old.role}`, inline: false },
          { name: 'New Role', value: `${member.role}`, inline: false }
        )
        .setFooter({ text: 'Roblox group tracking | Role update time relative' })
        .setTimestamp();

      try { await channel.send({ embeds: [embed] }); } catch(err) { console.error('Error sending role update embed:', err); }
    }

    // Update state
    oldMembers[member.userId] = { ...member, joinedAt: old?.joinedAt || Math.floor(Date.now() / 1000) };
  }

  // Remove members who left
  for (const userId in oldMembers) {
    if (!newMembers.some(m => m.userId == userId)) {
      delete oldMembers[userId];
    }
  }

  fs.writeFileSync(MEMBER_FILE, JSON.stringify(oldMembers, null, 2));
}

// Export function to start tracker
module.exports = (client) => {
  // Run immediately
  checkForGroupUpdates(client);

  // Schedule every 5 minutes
  setInterval(() => checkForGroupUpdates(client), 5 * 60 * 1000);
};