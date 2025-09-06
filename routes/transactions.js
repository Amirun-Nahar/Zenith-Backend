const { Router } = require('express');
const { Transaction } = require('../models/Transaction');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
	const items = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
	res.json(items);
});

router.post('/', async (req, res) => {
	const { type, amount, category, note, date } = req.body;
	if (!type || !amount || amount < 0 || !category) return res.status(400).json({ error: 'Invalid input' });
	const created = await Transaction.create({ userId: req.user.id, type, amount, category, note, date });
	res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
	if (req.body.amount != null && req.body.amount < 0) return res.status(400).json({ error: 'Invalid amount' });
	const updated = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

router.delete('/:id', async (req, res) => {
	await Transaction.deleteOne({ _id: req.params.id, userId: req.user.id });
	res.json({ ok: true });
});

router.get('/summary/month', async (req, res) => {
	const items = await Transaction.find({ userId: req.user.id });
	const income = items.filter(i => i.type === 'income').reduce((s,i)=>s+i.amount,0);
	const expense = items.filter(i => i.type === 'expense').reduce((s,i)=>s+i.amount,0);
	res.json({ income, expense, balance: income-expense });
});

module.exports = router;
