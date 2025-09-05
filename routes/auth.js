const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { config } = require('../config');
const { requireAuth } = require('../middleware/auth');
const { initFirebaseAdmin } = require('../firebase');

const router = Router();

router.post('/google', async (req, res) => {
	try {
		const { idToken } = req.body || {};
		if (!idToken) return res.status(400).json({ error: 'Missing idToken' });
		const admin = initFirebaseAdmin();
		const decoded = await admin.auth().verifyIdToken(idToken);
		const email = String(decoded.email || '').toLowerCase();
		const name = decoded.name || 'User';
		let user = await User.findOne({ email });
		if (!user) {
			user = await User.create({ name, email, passwordHash: decoded.uid });
		}
		const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
		res.cookie(config.cookieName, token, config.cookieOptions);
		return res.json({ id: user._id, name: user.name, email: user.email });
	} catch (err) {
		console.error('Google auth error:', err);
		return res.status(401).json({ error: 'Invalid Google token' });
	}
});

router.post('/register', async (req, res) => {
	try {
		let { name, email, password } = req.body;
		if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
		email = String(email).trim().toLowerCase();
		const existing = await User.findOne({ email });
		if (existing) {
			if (!existing.passwordHash) {
				return res.status(409).json({ error: 'Email already in use' });
			}
			let ok = false;
			try {
				ok = await bcrypt.compare(password, existing.passwordHash);
			} catch (e) {
				ok = false;
			}
			if (!ok) return res.status(409).json({ error: 'Email already in use' });
			const token = jwt.sign({ id: existing._id, name: existing.name, email: existing.email }, config.jwtSecret, { expiresIn: '7d' });
			res.cookie(config.cookieName, token, config.cookieOptions);
			return res.json({ id: existing._id, name: existing.name, email: existing.email });
		}
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ name, email, passwordHash });
		const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
		res.cookie(config.cookieName, token, config.cookieOptions);
		return res.status(201).json({ id: user._id, name: user.name, email: user.email });
	} catch (err) {
		if (err && err.code === 11000) {
			return res.status(409).json({ error: 'Email already in use' });
		}
		console.error('Register error:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

router.post('/login', async (req, res) => {
	try {
		let { email, password } = req.body;
		if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
		email = String(email).trim().toLowerCase();
		const user = await User.findOne({ email });
		if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
		
		console.log('🔐 Setting cookie:', config.cookieName, 'with options:', config.cookieOptions);
		console.log('🔐 Request origin:', req.headers.origin);
		console.log('🔐 Request headers:', req.headers);
		
		res.cookie(config.cookieName, token, config.cookieOptions);
		return res.json({ id: user._id, name: user.name, email: user.email });
	} catch (err) {
		console.error('Login error:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

router.get('/me', requireAuth, async (req, res) => {
	console.log('🔐 /me endpoint - cookies received:', req.cookies);
	console.log('🔐 /me endpoint - user:', req.user);
	return res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
	res.clearCookie(config.cookieName, { ...config.cookieOptions, maxAge: 0 });
	return res.json({ ok: true });
});

module.exports = router;
