const { Schema, model } = require('mongoose');

const taskSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
		subject: { type: String, required: true },
		topic: { type: String, required: true },
		priority: { type: String, enum: ['low','medium','high'], default: 'medium' },
		deadline: { type: Date },
		completed: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

const Task = model('Task', taskSchema);

module.exports = { Task };
