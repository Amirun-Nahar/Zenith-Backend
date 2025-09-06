const config = {
	port: process.env.PORT || 5000,
	mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zenith',
	jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
	clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
	cookieName: 'zenith_token',
	cookieOptions: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'none',
		path: '/',
	},
};

module.exports = { config };
