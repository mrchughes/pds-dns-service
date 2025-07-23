const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true
    },
    clientId: {
        type: String,
        required: [true, 'Client ID is required'],
        unique: true
    },
    apiKey: {
        type: String,
        required: [true, 'API key is required']
    },
    type: {
        type: String,
        enum: ['onelogin', 'pds', 'other'],
        default: 'other'
    },
    domains: [{
        type: String,
        trim: true,
        lowercase: true
    }],
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

module.exports = mongoose.model('Client', ClientSchema);
