const mongoose = require('mongoose');
const Customer = require('./models/Customer');
const dotenv = require('dotenv');
dotenv.config({path: '../.env'});

mongoose.connect('mongodb://localhost:27017/tallyflow').then(async () => {
  try {
    const c = await Customer.create({
      name: 'Test Customer',
      company: new mongoose.Types.ObjectId()
    });
    console.log('Success:', c);
  } catch(e) {
    console.error('Error:', e.message);
    if(e.errors) console.error(e.errors);
  }
  process.exit(0);
});
