const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const GROUP_ID = 35590726; // Your Roblox group ID
const MEMBER_FILE = path.join(__dirname, 'members.json');

async function getAllGroupMembers() {
  try {
    const res = await fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users?limit=100`);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      console.log('⚠️ No member data found.');
      return [];
    }

    // Map each member properly
    return data.data
      .map(member => {
        const userId = member.user?.id;
        const username = member.user?.username;
        const role = member.role?.name ?? 'Unknown';

        if (!userId || !username) return null; // skip invalid entries
        return { userId, username, role, joinedAt: Math.floor(Date.now() / 1000) };
      })
      .filter(Boolean);

  } catch (err) {
    console.error('❌ Error fetching group members:', err);
    return [];
  }
}

(async () => {
  const members = await getAllGroupMembers();

  if (members.length === 0) {
    console.log('⚠️ No valid members to write to file.');
    return;
  }

  const memberData = {};
  members.forEach(member => {
    memberData[member.userId] = member;
  });

  fs.writeFileSync(MEMBER_FILE, JSON.stringify(memberData, null, 2));
  console.log(`✅ Successfully pre-filled ${MEMBER_FILE} with ${members.length} members.`);
})();