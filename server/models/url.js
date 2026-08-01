const mongoose = require('mongoose');

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
        clickCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    }, 
    { timestamps: true }
);

urlSchema.index({ redirectUrl: 1, ownerId: 1 });

const URL = mongoose.model('URL', urlSchema);

module.exports = URL;