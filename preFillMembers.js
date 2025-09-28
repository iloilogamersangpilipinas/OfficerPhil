const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const userId = member.user.id;
const username = member.user.username;
const role = member.role.name;

const GROUP_ID = 35590726; // Your Roblox group ID
const MEMBER_FILE = path.join(__dirname, 'members.json');

async function getGroupMembers() {
  try {
    const res = await fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users?limit=100`);
    const data = await res.json();

    console.log('API Response:', data); // Log the entire response

    if (!data.data) {
      console.error('No member data found.');
      return [];
    }

    return data.data.map(member => ({
      userId: member.userId,
      username: member.username,
      role: member.role.name,
      joinedAt: Math.floor(Date.now() / 1000)
    }));
  } catch (error) {
    console.error('Error fetching group members:', error);
    return [];
  }
}

(async () => {
  const members = await getGroupMembers();

  if (members.length === 0) {
    console.log('No members to write to file.');
    return;
  }

  const memberData = {};
  members.forEach(member => {
    memberData[member.userId] = member;
  });

  fs.writeFileSync(MEMBER_FILE, JSON.stringify(memberData, null, 2));
  console.log(`✅ Successfully pre-filled ${MEMBER_FILE} with ${members.length} members.`);
})();