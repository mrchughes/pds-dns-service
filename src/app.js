const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const fs = require('fs');
const { dnsServer } = require('./services/dnsServer');

// Load environment variables
require('dotenv').config();

// Import routes
const viewRoutes = require('./routes/viewRoutes');
const domainRoutes = require('./routes/domainRoutes');
const recordRoutes = require('./routes/recordRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const clientRoutes = require('./routes/clientRoutes');
const governmentServiceRoutes = require('./routes/governmentServiceRoutes');

// Import middleware
const apiKeyAuth = require('./middleware/apiKeyAuth');
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dns-service', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create access log stream
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.static(path.join(__dirname, '../public')));

// Apply API key authentication middleware
app.use(apiKeyAuth);

// Set up Handlebars view engine
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
        },
        json: function (obj) {
            return JSON.stringify(obj, null, 2);
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
app.use('/api/clients', clientRoutes);
app.use('/api/gov-services', governmentServiceRoutes);

// Error handler
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Apply error handler middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DNS Service Web server running on port ${PORT}`);

    // Start DNS server
    dnsServer.start();
});

module.exports = app;
