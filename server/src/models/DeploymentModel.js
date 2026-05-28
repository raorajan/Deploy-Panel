const mongoose = require('mongoose');

const deploymentSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true,
        maxlength: [100, 'Client name cannot exceed 100 characters']
    },
    domain: {
        type: String,
        required: [true, 'Domain is required'],
        trim: true,
        lowercase: true,
        match: [/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid domain']
    },
    image: {
        type: String,
        required: true,
        default: 'nginx:latest',
        trim: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Failed'],
        default: 'Pending'
    },
    errorMessage: {
        type: String,
        default: ''
    },
    containerId: {
        type: String,
        default: ''
    },
    containerPort: {
        type: Number,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
deploymentSchema.index({ status: 1 });
deploymentSchema.index({ createdAt: -1 });
deploymentSchema.index({ clientName: 1 });

module.exports = mongoose.model('Deployment', deploymentSchema);