const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const User = require('./models/User');

const findUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tallyflow');
    const users = await User.find({}, 'name email');
    console.log('EXISTING_USERS:', JSON.stringify(users));
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

findUsers();
