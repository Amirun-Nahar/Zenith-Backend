const config = {
	port: process.env.PORT || 5000,
	mongoUri: process.env.MONGO_URI || 'mongodb+srv://naharamina2:AdLFP54pUxUE00Tj@cluster0.d0wajvl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
	jwtSecret: process.env.JWT_SECRET || '523ac32523f069a4b22f71caefdd11c8b859c8ad4444eb4e22080b898103b587e3bb3ffd8d5f0164746447ee67e6dbcf45b9088a4c8fb5304780bd9d48772190',
	clientOrigin: process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://zenith-academic-hub.netlify.app' : 'http://localhost:5173'),
	cookieName: 'zenith_token',
	cookieOptions: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
		path: '/',
		domain: process.env.NODE_ENV === 'production' ? undefined : undefined,
	},
};

module.exports = { config };
