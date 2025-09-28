// robloxGroupTracker.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

const GROUP_ID = 35590726; // Your Roblox group ID
const CHANNEL_ID = '1245874836308361266'; // Your Discord channel ID
const MEMBER_FILE = path.join(__dirname, 'members.json');

// Helper: normalize role names to avoid false role change spam
const normalize = str => (str || '').trim().toLowerCase();

// Fetch Roblox group members safely
async function getGroupMembers() {
  const res = await fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users?limit=100`);
  const data = await res.json();

  if (!data.data || data.data.length === 0) return [];

  // Map properly using .user and .role
  return data.data
    .map(member => {
      const userId = member.user?.id;
      const username = member.user?.username;
      const role = member.role?.name ?? 'Unknown';

      if (!userId || !username) return null; // skip invalid entries
      return { userId, username, role };
    })
    .filter(Boolean);
}

// Main function to check for joins and role changes
async function checkForGroupUpdates(client) {
  let oldMembers = {};
  if (fs.existsSync(MEMBER_FILE)) {
    try {
      oldMembers = JSON.parse(fs.readFileSync(MEMBER_FILE, 'utf8'));
    } catch {
      oldMembers = {};
    }
  }

  const newMembers = await getGroupMembers();
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) return;

  // Initialize members.json if empty (skip sending embeds)
  if (Object.keys(oldMembers).length === 0) {
    newMembers.forEach(member => {
      oldMembers[member.userId] = { ...member, joinedAt: Math.floor(Date.now() / 1000) };
    });
    fs.writeFileSync(MEMBER_FILE, JSON.stringify(oldMembers, null, 2));
    console.log("✅ Initialized members.json with current Roblox group members.");
    return;
  }

  for (const member of newMembers) {
    const old = oldMembers[member.userId];

    // New member joined
    if (!old) {
      const joinTimestamp = Math.floor(Date.now() / 1000);
      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({ name: `New Roblox Member Joined`, iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${member.userId}&width=420&height=420&format=png`)
        .addFields({
          name: '\u200B',
          value: `**Username:** ${member.username}\n\n**User ID:** ${member.userId}\n\n**Role:** ${member.role}\n\n**Joined:** <t:${joinTimestamp}:R>`
        })
        .setFooter({ text: 'Roblox group tracking | Join time shown relative' })
        .setTimestamp();

      try {
        await channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Error sending join embed:', err);
      }

      oldMembers[member.userId] = { ...member, joinedAt: joinTimestamp };
      continue;
    }

    // Role changed
    if (old && normalize(old.role) !== normalize(member.role)) {
      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({ name: `Roblox Role Update`, iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${member.userId}&width=420&height=420&format=png`)
        .addFields({
          name: '\u200B',
          value: `**Username:** ${member.username}\n\n**User ID:** ${member.userId}\n\n**Old Role:** ${old.role}\n\n**New Role:** ${member.role}`
        })
        .setFooter({ text: 'Roblox group tracking | Role update time relative' })
        .setTimestamp();

      try {
        await channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Error sending role update embed:', err);
      }
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
  client.once('ready', () => {
    // Run immediately
    checkForGroupUpdates(client);

    // Schedule every 5 minutes
    setInterval(() => checkForGroupUpdates(client), 5 * 60 * 1000);
  });
};