const admin = require('firebase-admin');

let initialized = false;
function initFirebaseAdmin() {
	if (initialized) return admin;
	const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
	if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
		throw new Error('Missing Firebase admin env vars');
	}
	admin.initializeApp({
		credential: admin.credential.cert({
			projectId: FIREBASE_PROJECT_ID,
			clientEmail: FIREBASE_CLIENT_EMAIL,
			privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
		}),
	});
	initialized = true;
	return admin;
}

module.exports = { initFirebaseAdmin };
