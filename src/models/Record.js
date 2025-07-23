const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
    domain: {
        type: String,
        required: [true, 'Domain is required'],
        trim: true,
        lowercase: true,
        index: true
    },
    type: {
        type: String,
        required: [true, 'Record type is required'],
        enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS'],
        uppercase: true
    },
    value: {
        type: String,
        required: [true, 'Record value is required']
    },
    ttl: {
        type: Number,
        default: 300, // 5 minutes
        min: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: null
    }
});

// Create a compound index for efficient lookups
RecordSchema.index({ domain: 1, type: 1 });

module.exports = mongoose.model('Record', RecordSchema);
