const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        googleId: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
        },
        avatar: {
            type: String,
        },
    },
    { timestamps: true }
);

const User = mongoose.model('user', userSchema);

module.exports = User;