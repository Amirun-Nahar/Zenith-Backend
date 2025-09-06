const jwt = require('jsonwebtoken');
const { config } = require('../config');

function requireAuth(req, res, next) {
	console.log('🔐 requireAuth - cookies:', req.cookies);
	console.log('🔐 requireAuth - looking for cookie:', config.cookieName);
	const token = req.cookies[config.cookieName];
	console.log('🔐 requireAuth - token found:', !!token);
	if (!token) return res.status(401).json({ error: 'Unauthorized' });
	try {
		const payload = jwt.verify(token, config.jwtSecret);
		req.user = payload;
		return next();
	} catch (err) {
		console.log('🔐 requireAuth - token verification failed:', err.message);
		return res.status(401).json({ error: 'Invalid token' });
	}
}

module.exports = { requireAuth };
