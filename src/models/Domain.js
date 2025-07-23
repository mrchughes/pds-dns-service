const mongoose = require('mongoose');

const DomainSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Domain name is required'],
        trim: true,
        lowercase: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    owner: {
        type: String,
        trim: true
    },
    verified: {
        type: Boolean,
        default: false
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

module.exports = mongoose.model('Domain', DomainSchema);
