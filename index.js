require('./loadEnv').loadEnv();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { connectToDatabase } = require('./db');
const { config } = require('./config');

const app = express();

app.use(cors({
	origin: [
		config.clientOrigin,
		'http://localhost:5173',
		'https://zenith-frontend.vercel.app',
		'https://zenith-personal-tracker.vercel.app',
		'https://zenith-academic-hub.netlify.app'
	],
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
	res.json({ 
		message: 'Zenith Backend API', 
		status: 'running',
		version: '1.0.0',
		endpoints: {
			health: '/health',
			auth: '/api/auth',
			classes: '/api/classes',
			tasks: '/api/tasks',
			transactions: '/api/transactions',
			qa: '/api/qa',
			ai: '/api/ai'
		}
	});
});

app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/qa', require('./routes/qa'));
app.use('/api/ai', require('./routes/ai'));

async function start() {
	try {
		await connectToDatabase();
		app.listen(config.port, () => {
			console.log(`Server listening on http://localhost:${config.port}`);
		});
	} catch (err) {
		console.error('Failed to start server:', err);
		process.exit(1);
	}
}

start();
