const { Schema, model } = require('mongoose');

const userSchema = new Schema(
	{
		name: { 
			type: String, 
			required: [true, 'Name is required'], 
			trim: true,
			minlength: [2, 'Name must be at least 2 characters long'],
			maxlength: [50, 'Name cannot exceed 50 characters']
		},
		email: { 
			type: String, 
			required: [true, 'Email is required'], 
			unique: true, 
			lowercase: true, 
			index: true,
			validate: {
				validator: function(email) {
					return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
				},
				message: 'Invalid email format'
			}
		},
		passwordHash: { 
			type: String, 
			required: [true, 'Password is required'],
			minlength: [6, 'Password must be at least 6 characters long']
		},
		isActive: {
			type: Boolean,
			default: true
		},
		lastLogin: {
			type: Date,
			default: null
		}
	},
	{ 
		timestamps: true,
		toJSON: {
			transform: function(doc, ret) {
				delete ret.passwordHash;
				delete ret.__v;
				return ret;
			}
		}
	}
);

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure email is lowercase
userSchema.pre('save', function(next) {
	if (this.email) {
		this.email = this.email.toLowerCase().trim();
	}
	next();
});

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
	this.lastLogin = new Date();
	return this.save();
};

const User = model('User', userSchema);

module.exports = { User };