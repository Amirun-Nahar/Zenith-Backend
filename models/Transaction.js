const { Schema, model } = require('mongoose');

const transactionSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
		type: { type: String, enum: ['income','expense'], required: true },
		amount: { type: Number, required: true, min: 0 },
		category: { type: String, required: true },
		note: { type: String },
		date: { type: Date, default: Date.now },
	},
	{ timestamps: true }
);

const Transaction = model('Transaction', transactionSchema);

module.exports = { Transaction };
