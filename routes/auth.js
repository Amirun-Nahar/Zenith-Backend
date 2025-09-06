const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { config } = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Input validation helper
function validateInput(data, requiredFields) {
	const errors = [];
	for (const field of requiredFields) {
		if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
			errors.push(`${field} is required`);
		}
	}
	return errors;
}

// Email validation helper
function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

// Password validation helper
function isValidPassword(password) {
	return password && password.length >= 6;
}

// Register endpoint
router.post('/register', async (req, res) => {
	try {
		const { name, email, password } = req.body;

		// Validate input
		const validationErrors = validateInput({ name, email, password }, ['name', 'email', 'password']);
		if (validationErrors.length > 0) {
			return res.status(400).json({ 
				error: 'Validation failed', 
				details: validationErrors 
			});
		}

		// Validate email format
		if (!isValidEmail(email)) {
			return res.status(400).json({ error: 'Invalid email format' });
		}

		// Validate password strength
		if (!isValidPassword(password)) {
			return res.status(400).json({ error: 'Password must be at least 6 characters long' });
		}

		// Normalize email
		const normalizedEmail = email.trim().toLowerCase();

		// Check if user already exists
		const existingUser = await User.findOne({ email: normalizedEmail });
		if (existingUser) {
			return res.status(409).json({ error: 'Email already registered' });
		}

		// Hash password
		const saltRounds = 12;
		const passwordHash = await bcrypt.hash(password, saltRounds);

		// Create user
		const user = await User.create({
			name: name.trim(),
			email: normalizedEmail,
			passwordHash
		});

		// Generate JWT token
		const token = jwt.sign(
			{ 
				id: user._id, 
				name: user.name, 
				email: user.email 
			}, 
			config.jwtSecret, 
			{ expiresIn: '7d' }
		);

		// Set cookie
		res.cookie(config.cookieName, token, config.cookieOptions);

		// Return user data (without password hash)
		return res.status(201).json({
			success: true,
			message: 'User registered successfully',
			user: {
				id: user._id,
				name: user.name,
				email: user.email
			}
		});

	} catch (error) {
		console.error('Registration error:', error);
		
		// Handle duplicate key error
		if (error.code === 11000) {
			return res.status(409).json({ error: 'Email already registered' });
		}
		
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// Login endpoint
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		// Validate input
		const validationErrors = validateInput({ email, password }, ['email', 'password']);
		if (validationErrors.length > 0) {
			return res.status(400).json({ 
				error: 'Validation failed', 
				details: validationErrors 
			});
		}

		// Validate email format
		if (!isValidEmail(email)) {
			return res.status(400).json({ error: 'Invalid email format' });
		}

		// Normalize email
		const normalizedEmail = email.trim().toLowerCase();

		// Find user
		const user = await User.findOne({ email: normalizedEmail });
		if (!user) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
		if (!isPasswordValid) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		// Generate JWT token
		const token = jwt.sign(
			{ 
				id: user._id, 
				name: user.name, 
				email: user.email 
			}, 
			config.jwtSecret, 
			{ expiresIn: '7d' }
		);

		// Set cookie
		console.log('Setting cookie with options:', config.cookieOptions);
		res.cookie(config.cookieName, token, config.cookieOptions);
		console.log('Cookie set successfully');

		// Return user data (without password hash)
		return res.json({
			success: true,
			message: 'Login successful',
			user: {
				id: user._id,
				name: user.name,
				email: user.email
			}
		});

	} catch (error) {
		console.error('Login error:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// Get current user endpoint
router.get('/me', requireAuth, async (req, res) => {
	try {
		return res.json({
			success: true,
			user: {
				id: req.user.id,
				name: req.user.name,
				email: req.user.email
			}
		});
	} catch (error) {
		console.error('Get user error:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// Logout endpoint
router.post('/logout', (req, res) => {
	try {
		res.clearCookie(config.cookieName, { 
			...config.cookieOptions, 
			maxAge: 0 
		});
		
		return res.json({
			success: true,
			message: 'Logout successful'
		});
	} catch (error) {
		console.error('Logout error:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// Health check endpoint
router.get('/health', (req, res) => {
	return res.json({
		success: true,
		message: 'Auth service is running',
		timestamp: new Date().toISOString()
	});
});

module.exports = router;