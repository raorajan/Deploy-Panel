const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        // Remove deprecated options - they are no longer needed
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deploypanel');
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        // Don't exit immediately, let the app try to reconnect
        console.log('⚠️ Make sure MongoDB is running. Retrying in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

module.exports = connectDB;