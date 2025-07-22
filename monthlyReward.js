const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'balances.json');
const monthlyAmount = 1000;
const currency = 'SR £';

function loadBalances() {
  if (!fs.existsSync(dataPath)) return {};
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function saveBalances(balances) {
  fs.writeFileSync(dataPath, JSON.stringify(balances, null, 2));
}

function applyMonthlyRewards() {
  const balances = loadBalances();

  for (const userId in balances) {
    balances[userId] += monthlyAmount;
    console.log(`Added ${currency}${monthlyAmount} to User ID: ${userId}. New balance: ${currency}${balances[userId]}`);
  }

  saveBalances(balances);
  console.log('✅ Monthly rewards distributed successfully!');
}

applyMonthlyRewards();
