require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    await mongoose.connection.collection('users').dropIndex('stellarPublicKey_1');
    console.log('Dropped unique index on stellarPublicKey.');
  } catch (err) {
    console.log('Index might not exist, skipping drop.');
  }
  await User.updateMany({}, { $set: { stellarPublicKey: null } });
  console.log('Cleared stellarPublicKey for all users.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
