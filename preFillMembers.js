const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const GROUP_ID = 35590726;
const DATA_FOLDER = path.join(__dirname, 'data');
const MEMBER_FILE = path.join(DATA_FOLDER, 'members.json');

// Ensure /data folder exists
if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER);
}

async function getAllGroupMembers() {
  try {
    const url = `https://groups.roblox.com/v1/groups/${GROUP_ID}/users?limit=100`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      console.log('⚠️ No members returned by the API.');
      return [];
    }

    // Map members correctly
    const members = data.data
      .map(member => {
        const userId = member.user?.userId;
        const username = member.user?.username;
        const role = member.role?.name ?? 'Unknown';

        if (!userId || !username) return null;
        return { userId, username, role };
      })
      .filter(Boolean);

    return members;

  } catch (err) {
    console.error('❌ Error fetching members:', err);
    return [];
  }
}

(async () => {
  // Load existing members if the file exists
  let existingMembers = {};
  if (fs.existsSync(MEMBER_FILE)) {
    try {
      existingMembers = JSON.parse(fs.readFileSync(MEMBER_FILE, 'utf8'));
    } catch {
      existingMembers = {};
    }
  }

  const members = await getAllGroupMembers();

  if (members.length === 0) {
    console.log('⚠️ No valid members to write to file.');
    return;
  }

  // Merge new members without overwriting existing joinedAt
  members.forEach(member => {
    if (!existingMembers[member.userId]) {
      // New member
      existingMembers[member.userId] = {
        ...member,
        joinedAt: Math.floor(Date.now() / 1000)
      };
    } else {
      // Existing member: keep their joinedAt
      existingMembers[member.userId] = {
        ...member,
        joinedAt: existingMembers[member.userId].joinedAt
      };
    }
  });

  fs.writeFileSync(MEMBER_FILE, JSON.stringify(existingMembers, null, 2));
  console.log(`✅ Successfully updated ${MEMBER_FILE} with ${members.length} members.`);
})();