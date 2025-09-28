const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const GROUP_ID = 35590726;
const MEMBER_FILE = path.join(__dirname, 'members.json');

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
        return {
          userId,
          username,
          role,
          joinedAt: Math.floor(Date.now() / 1000)
        };
      })
      .filter(Boolean);

    return members;

  } catch (err) {
    console.error('❌ Error fetching members:', err);
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
