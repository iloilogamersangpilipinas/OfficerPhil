// robloxGroupTracker.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

const GROUP_ID = 35590726; // Your Roblox group ID
const CHANNEL_ID = '1245874836308361266'; // Your Discord channel ID
const MEMBER_FILE = path.join(__dirname, 'members.json');

// Normalize role names
const normalize = str => (str || '').trim().toLowerCase();

// Fetch Roblox group members
async function getGroupMembers() {
  try {
    const res = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users?limit=100`);
    const data = res.data;
    if (!data.data) return [];

    return data.data.map(member => ({
      userId: member.user?.userId,
      username: member.user?.username,
      role: member.role?.name ?? 'Unknown'
    })).filter(m => m.userId); // filter out undefined IDs
  } catch (err) {
    console.error('Error fetching group members:', err);
    return [];
  }
}

// Fetch Roblox headshot URL
async function getAvatarUrl(userId) {
  try {
    const resp = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
    return resp.data?.data?.[0]?.imageUrl || 'https://i.imgur.com/Y5egr1d.png';
  } catch (err) {
    console.error(`Error fetching avatar for ${userId}:`, err);
    return 'https://i.imgur.com/Y5egr1d.png';
  }
}

// Main tracker
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
  if (!newMembers.length) return;

  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) return;

  // Initialize members.json if empty
  if (Object.keys(oldMembers).length === 0) {
    for (const member of newMembers) {
      oldMembers[member.userId] = { ...member, joinedAt: Math.floor(Date.now() / 1000) };
    }
    fs.writeFileSync(MEMBER_FILE, JSON.stringify(oldMembers, null, 2));
    console.log("✅ Initialized members.json with current Roblox group members.");
    return; // skip sending embeds for existing members
  }

  for (const member of newMembers) {
    const old = oldMembers[member.userId];

    // New member joined
    if (!old) {
      const joinTimestamp = Math.floor(Date.now() / 1000);
      const avatarUrl = await getAvatarUrl(member.userId);

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({ name: 'New Roblox Member Joined', iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setThumbnail(avatarUrl)
        .setDescription(`**Username:** ${member.username}\n\n**User ID:** ${member.userId}\n\n**Role:** ${member.role}\n\n**Joined:** <t:${joinTimestamp}:R>`)
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
      const avatarUrl = await getAvatarUrl(member.userId);

      const embed = new EmbedBuilder()
        .setColor('#014aad')
        .setAuthor({ name: 'Roblox Role Update', iconURL: 'https://i.imgur.com/Y5egr1d.png' })
        .setThumbnail(avatarUrl)
        .setDescription(`**Username:** ${member.username}\n\n**User ID:** ${member.userId}\n\n**Old Role:** ${old.role}\n\n**New Role:** ${member.role}`)
        .setFooter({ text: 'Roblox group tracking | Role update time relative' })
        .setTimestamp();

      try {
        await channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Error sending role update embed:', err);
      }
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

// Export a function to start the tracker
module.exports = (client) => {
  // Run immediately
  checkForGroupUpdates(client);

  // Schedule every 30 seconds (adjust as desired)
  setInterval(() => checkForGroupUpdates(client), 30 * 1000);
};