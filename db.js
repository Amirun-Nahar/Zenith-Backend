const mongoose = require('mongoose');
const { config } = require('./config');

async function connectToDatabase() {
	mongoose.set('strictQuery', true);
	await mongoose.connect(config.mongoUri, {
		serverSelectionTimeoutMS: 10000,
	});
	return mongoose.connection;
}

module.exports = { connectToDatabase };
