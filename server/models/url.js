const mongoose = require('mongoose');
const { maxLength } = require('zod');

const urlSchema = new mongoose.Schema(
    {
        shortId: {
            type: String,
            required: true,
            unique: true,
        },
        redirectUrl: {
            type: String,
            required: true,
            index: true,
            maxLength: 2048,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true,
        },
        visitHistory: [{
            timestamp: { type: Number },
            _id: false,
        }],
    }, 
    { timestamps: true }
);

urlSchema.index({ redirectUrl: 1, ownerId: 1 });

const URL = mongoose.model('URL', urlSchema);

module.exports = URL;