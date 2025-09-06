const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { User } = require('../models/User');

// Enhanced authentication middleware
async function requireAuth(req, res, next) {
	try {
		// Get token from cookies
		const token = req.cookies[config.cookieName];
		
		if (!token) {
			return res.status(401).json({ 
				error: 'Access denied. No token provided.',
				code: 'NO_TOKEN'
			});
		}

		// Verify token
		let payload;
		try {
			payload = jwt.verify(token, config.jwtSecret);
		} catch (jwtError) {
			// Clear invalid token
			res.clearCookie(config.cookieName, { 
				...config.cookieOptions, 
				maxAge: 0 
			});
			
			return res.status(401).json({ 
				error: 'Invalid or expired token',
				code: 'INVALID_TOKEN'
			});
		}

		// Verify user still exists and is active
		const user = await User.findById(payload.id);
		if (!user || !user.isActive) {
			// Clear token for non-existent or inactive user
			res.clearCookie(config.cookieName, { 
				...config.cookieOptions, 
				maxAge: 0 
			});
			
			return res.status(401).json({ 
				error: 'User not found or inactive',
				code: 'USER_NOT_FOUND'
			});
		}

		// Add user info to request
		req.user = {
			id: user._id,
			name: user.name,
			email: user.email,
			isActive: user.isActive
		};

		next();
	} catch (error) {
		console.error('Auth middleware error:', error);
		return res.status(500).json({ 
			error: 'Authentication error',
			code: 'AUTH_ERROR'
		});
	}
}

// Optional auth middleware (doesn't fail if no token)
async function optionalAuth(req, res, next) {
	try {
		const token = req.cookies[config.cookieName];
		
		if (token) {
			try {
				const payload = jwt.verify(token, config.jwtSecret);
				const user = await User.findById(payload.id);
				
				if (user && user.isActive) {
					req.user = {
						id: user._id,
						name: user.name,
						email: user.email,
						isActive: user.isActive
					};
				}
			} catch (jwtError) {
				// Token is invalid, but we don't fail the request
				console.log('Optional auth: Invalid token');
			}
		}
		
		next();
	} catch (error) {
		console.error('Optional auth middleware error:', error);
		next(); // Continue even if there's an error
	}
}

module.exports = { requireAuth, optionalAuth };