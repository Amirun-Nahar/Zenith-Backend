const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
	const envName = process.env.NODE_ENV || 'development';
	const baseDir = path.join(__dirname, 'env');
	const envFile = path.join(baseDir, `.env.${envName}`);
	const localOverride = path.join(baseDir, `.env.local`);

	if (fs.existsSync(envFile)) {
		dotenv.config({ path: envFile });
	}
	if (fs.existsSync(localOverride)) {
		dotenv.config({ path: localOverride });
	}
}

module.exports = { loadEnv };
