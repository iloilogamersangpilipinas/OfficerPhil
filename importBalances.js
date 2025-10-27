const db = require('./db');
console.log(db.getBalance('739422697737682975')); // should print 89698
console.log(db.getAllBalances()); // should list all users
