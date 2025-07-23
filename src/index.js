require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const dnsServer = require('./services/dnsServer');

// Import routes
const recordRoutes = require('./routes/recordRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const domainRoutes = require('./routes/domainRoutes');
const viewRoutes = require('./routes/viewRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dns-service', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => logger.info('Connected to MongoDB'))
    .catch(err => {
        logger.error(`MongoDB connection error: ${err.message}`);
        process.exit(1);
    });

// Middleware
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Setup Handlebars as the view engine
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, '../views/layouts'),
    partialsDir: path.join(__dirname, '../views/partials'),
    helpers: {
        formatDate: function (date) {
            return date ? new Date(date).toLocaleString() : 'N/A';
        },
        eq: function (a, b) {
            return a === b;
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.use('/', viewRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/verifications', verificationRoutes);

// Error handling middleware
app.use(errorHandler);

// Start the server
const server = app.listen(PORT, () => {
    logger.info(`DNS Service web server running on port ${PORT}`);

    // Start DNS server
    dnsServer.start().then(() => {
        logger.info(`DNS Server running on port ${process.env.DNS_PORT || 53235}`);
    }).catch(err => {
        logger.error(`Failed to start DNS server: ${err.message}`);
    });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        dnsServer.stop().then(() => {
            logger.info('DNS server stopped');
            process.exit(0);
        });
    });
});

// Handle unexpected errors
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
