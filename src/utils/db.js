const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dns_service', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
