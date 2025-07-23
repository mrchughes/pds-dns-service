const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema({
    domain: {
        type: String,
        required: [true, 'Domain is required'],
        trim: true,
        lowercase: true,
        index: true
    },
    token: {
        type: String,
        required: [true, 'Verification token is required']
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'failed', 'expired', 'force_completed'],
        default: 'pending'
    },
    serviceType: {
        type: String,
        enum: ['onelogin', 'pds', 'other', 'government'],
        required: [true, 'Service type is required']
    },
    serviceId: {
        type: String,
        required: [true, 'Service ID is required']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expiration date is required']
    }
});

module.exports = mongoose.model('Verification', VerificationSchema);
