const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const deploymentRoutes = require('./routes/DeploymentRoute');
const { getQueueStats } = require('./workers/deployWorker');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const queueStats = await getQueueStats().catch(() => ({}));
    
    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: mongoose?.connection?.readyState === 1 ? 'connected' : 'disconnected',
            redis: 'check worker logs',
            queue: queueStats
        }
    });
});

// API Routes
app.use('/api', deploymentRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// MongoDB connection
let mongoose;
connectDB().then(conn => {
    mongoose = conn;
    
    // Start server
    app.listen(PORT, () => {
        console.log(`\n🚀 Server is running!`);
       
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    if (mongoose?.connection) {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
    }
    process.exit(0);
});

module.exports = app;