const { Router } = require('express');
const { Task } = require('../models/Task');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
	const items = await Task.find({ userId: req.user.id }).sort({ completed: 1, deadline: 1 });
	res.json(items);
});

router.post('/', async (req, res) => {
	const { subject, topic, priority, deadline } = req.body;
	if (!subject || !topic) return res.status(400).json({ error: 'Missing fields' });
	const created = await Task.create({ userId: req.user.id, subject, topic, priority, deadline });
	res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
	const updated = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

router.delete('/:id', async (req, res) => {
	await Task.deleteOne({ _id: req.params.id, userId: req.user.id });
	res.json({ ok: true });
});

module.exports = router;
