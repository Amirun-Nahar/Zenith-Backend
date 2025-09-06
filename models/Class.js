const { Schema, model } = require('mongoose');

const classSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
		subject: { type: String, required: true, trim: true },
		instructor: { type: String, trim: true },
		day: { type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], required: true },
		startTime: { type: String, required: true },
		endTime: { type: String, required: true },
		color: { type: String, default: '#3b82f6' },
	},
	{ timestamps: true }
);

const ClassItem = model('ClassItem', classSchema);

module.exports = { ClassItem };
