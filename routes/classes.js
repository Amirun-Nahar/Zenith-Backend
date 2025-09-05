const { Router } = require('express');
const { ClassItem } = require('../models/Class');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
	const items = await ClassItem.find({ userId: req.user.id }).sort({ day: 1, startTime: 1 });
	res.json(items);
});

router.post('/', async (req, res) => {
	const { subject, instructor, day, startTime, endTime, color } = req.body;
	if (!subject || !day || !startTime || !endTime) return res.status(400).json({ error: 'Missing fields' });
	const created = await ClassItem.create({ userId: req.user.id, subject, instructor, day, startTime, endTime, color });
	res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
	const updated = await ClassItem.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

router.delete('/:id', async (req, res) => {
	await ClassItem.deleteOne({ _id: req.params.id, userId: req.user.id });
	res.json({ ok: true });
});

module.exports = router;
