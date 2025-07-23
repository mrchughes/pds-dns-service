// View controller for the web interface
const Domain = require('../models/Domain');
const Record = require('../models/Record');
const Verification = require('../models/Verification');
const Client = require('../models/Client');

const viewController = {
    // Dashboard/Home page
    dashboard: async (req, res) => {
        try {
            const domainsCount = await Domain.countDocuments({});
            const verifiedDomainsCount = await Domain.countDocuments({ verified: true });
            const recordsCount = await Record.countDocuments({});
            const clientsCount = await Client.countDocuments({});

            // Get recent domains
            const recentDomains = await Domain.find({})
                .sort({ createdAt: -1 })
                .limit(5);

            // Get recent verifications
            const recentVerifications = await Verification.find({})
                .populate('domain')
                .sort({ createdAt: -1 })
                .limit(5);

            res.render('dashboard', {
                title: 'DNS Service Dashboard',
                stats: {
                    domains: domainsCount,
                    verifiedDomains: verifiedDomainsCount,
                    records: recordsCount,
                    clients: clientsCount,
                },
                recentDomains,
                recentVerifications,
                activePage: 'dashboard'
            });
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load dashboard',
                error
            });
        }
    },

    // Domains management page
    domainsPage: async (req, res) => {
        try {
            const domains = await Domain.find({}).sort({ name: 1 });

            res.render('domains', {
                title: 'Manage Domains',
                domains,
                activePage: 'domains'
            });
        } catch (error) {
            console.error('Error rendering domains page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load domains',
                error
            });
        }
    },

    // Single domain page with records
    domainDetailsPage: async (req, res) => {
        try {
            const domainName = req.params.name.toLowerCase();
            const domain = await Domain.findOne({ name: domainName });

            if (!domain) {
                return res.status(404).render('error', {
                    title: 'Domain Not Found',
                    message: `Domain "${domainName}" was not found`,
                    error: { status: 404 }
                });
            }

            const records = await Record.find({ domain: domain._id }).sort({ name: 1, type: 1 });
            const verification = await Verification.findOne({ domain: domain._id });

            res.render('domain-details', {
                title: `Domain: ${domain.name}`,
                domain,
                records,
                verification,
                activePage: 'domains'
            });
        } catch (error) {
            console.error('Error rendering domain details page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load domain details',
                error
            });
        }
    },

    // Records management page
    recordsPage: async (req, res) => {
        try {
            const records = await Record.find({}).populate('domain').sort({ 'domain.name': 1, name: 1, type: 1 });
            const domains = await Domain.find({}).sort({ name: 1 });

            res.render('records', {
                title: 'Manage DNS Records',
                records,
                domains,
                activePage: 'records'
            });
        } catch (error) {
            console.error('Error rendering records page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load records',
                error
            });
        }
    },

    // Verifications management page
    verificationsPage: async (req, res) => {
        try {
            const verifications = await Verification.find({}).populate('domain').sort({ createdAt: -1 });
            const domains = await Domain.find({ verified: false }).sort({ name: 1 });

            res.render('verifications', {
                title: 'Domain Verifications',
                verifications,
                domains,
                activePage: 'verifications'
            });
        } catch (error) {
            console.error('Error rendering verifications page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load verifications',
                error
            });
        }
    },

    // Clients management page
    clientsPage: async (req, res) => {
        try {
            const clients = await Client.find({}).sort({ name: 1 });

            res.render('clients', {
                title: 'Manage Clients',
                clients,
                activePage: 'clients'
            });
        } catch (error) {
            console.error('Error rendering clients page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load clients',
                error
            });
        }
    },

    // Client details page
    clientDetailsPage: async (req, res) => {
        try {
            const clientId = req.params.id;
            const client = await Client.findById(clientId);

            if (!client) {
                return res.status(404).render('error', {
                    title: 'Client Not Found',
                    message: 'The requested client was not found',
                    error: { status: 404 }
                });
            }

            // Get domains associated with client's domains array
            const domains = await Domain.find({
                name: { $in: client.domains }
            }).sort({ name: 1 });

            res.render('client-details', {
                title: `Client: ${client.name}`,
                client,
                domains,
                activePage: 'clients'
            });
        } catch (error) {
            console.error('Error rendering client details page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load client details',
                error
            });
        }
    },

    // API documentation page
    apiDocsPage: async (req, res) => {
        try {
            res.render('api-docs', {
                title: 'API Documentation',
                activePage: 'api-docs'
            });
        } catch (error) {
            console.error('Error rendering API docs page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load API documentation',
                error
            });
        }
    },

    // Server status page
    statusPage: async (req, res) => {
        try {
            const stats = {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                domains: await Domain.countDocuments({}),
                records: await Record.countDocuments({}),
                verifications: await Verification.countDocuments({}),
                clients: await Client.countDocuments({})
            };

            res.render('status', {
                title: 'Server Status',
                stats,
                activePage: 'status'
            });
        } catch (error) {
            console.error('Error rendering status page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load server status',
                error
            });
        }
    }
};

module.exports = viewController;
