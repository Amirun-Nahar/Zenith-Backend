const jwt = require('jsonwebtoken');
const { config } = require('../config');

function requireAuth(req, res, next) {
	const token = req.cookies[config.cookieName];
	if (!token) return res.status(401).json({ error: 'Unauthorized' });
	try {
		const payload = jwt.verify(token, config.jwtSecret);
		req.user = payload;
		return next();
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

module.exports = { requireAuth };
