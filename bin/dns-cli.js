#!/usr/bin/env node

/**
 * DNS Service CLI tool for managing domains, records, and verifications
 */

const mongoose = require('mongoose');
const { program } = require('commander');
const { dnsServer } = require('../src/services/dnsServer');
const { recordService } = require('../src/services/recordService');
const { verificationService } = require('../src/services/verificationService');
const Domain = require('../src/models/Domain');
const Record = require('../src/models/Record');
const Verification = require('../src/models/Verification');
const Client = require('../src/models/Client');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

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

program
    .version('1.0.0')
    .description('DNS Service CLI for managing domains, records, and verifications');

// Domain commands
program
    .command('list-domains')
    .description('List all domains')
    .option('-v, --verified', 'Show only verified domains')
    .option('-u, --unverified', 'Show only unverified domains')
    .action(async (options) => {
        try {
            let query = {};
            if (options.verified) query.verified = true;
            if (options.unverified) query.verified = false;

            const domains = await Domain.find(query).sort({ name: 1 });
            console.log('Domains:');
            domains.forEach(domain => {
                console.log(`- ${domain.name} (${domain.verified ? 'Verified' : 'Unverified'})`);
            });
            mongoose.disconnect();
        } catch (error) {
            console.error('Error listing domains:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('add-domain <name>')
    .description('Add a new domain')
    .action(async (name) => {
        try {
            const domainName = name.toLowerCase();
            const existingDomain = await Domain.findOne({ name: domainName });

            if (existingDomain) {
                console.log(`Domain '${domainName}' already exists`);
                mongoose.disconnect();
                return;
            }

            const domain = new Domain({
                name: domainName,
                verified: false
            });

            await domain.save();
            console.log(`Domain '${domainName}' added successfully`);
            mongoose.disconnect();
        } catch (error) {
            console.error('Error adding domain:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('remove-domain <name>')
    .description('Remove a domain')
    .action(async (name) => {
        try {
            const domainName = name.toLowerCase();
            const domain = await Domain.findOne({ name: domainName });

            if (!domain) {
                console.log(`Domain '${domainName}' not found`);
                mongoose.disconnect();
                return;
            }

            // Remove associated records
            await Record.deleteMany({ domain: domain._id });

            // Remove associated verifications
            await Verification.deleteMany({ domain: domain._id });

            // Remove domain
            await Domain.deleteOne({ _id: domain._id });
            console.log(`Domain '${domainName}' and all associated records removed`);
            mongoose.disconnect();
        } catch (error) {
            console.error('Error removing domain:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

// Record commands
program
    .command('list-records [domainName]')
    .description('List all DNS records, optionally filtered by domain')
    .action(async (domainName) => {
        try {
            let records;

            if (domainName) {
                const domain = await Domain.findOne({ name: domainName.toLowerCase() });

                if (!domain) {
                    console.log(`Domain '${domainName}' not found`);
                    mongoose.disconnect();
                    return;
                }

                records = await Record.find({ domain: domain._id }).populate('domain');
            } else {
                records = await Record.find({}).populate('domain');
            }

            console.log('DNS Records:');
            records.forEach(record => {
                console.log(`- ${record.domain.name} | ${record.name} | ${record.type} | ${record.value} | TTL: ${record.ttl}`);
            });
            mongoose.disconnect();
        } catch (error) {
            console.error('Error listing records:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('add-record <domainName> <name> <type> <value>')
    .description('Add a new DNS record')
    .option('-t, --ttl <ttl>', 'TTL value for the record (default: 3600)', '3600')
    .action(async (domainName, name, type, value, options) => {
        try {
            // Find or create the domain
            let domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                domain = new Domain({
                    name: domainName.toLowerCase(),
                    verified: false
                });
                await domain.save();
                console.log(`Domain '${domainName}' created`);
            }

            // Create the record
            const record = new Record({
                domain: domain._id,
                name: name === '@' ? '@' : name.toLowerCase(),
                type: type.toUpperCase(),
                value,
                ttl: parseInt(options.ttl)
            });

            await record.save();
            console.log(`Record '${name}' of type '${type}' added to domain '${domainName}'`);

            // Update DNS server records
            await recordService.refreshDnsRecords();
            mongoose.disconnect();
        } catch (error) {
            console.error('Error adding record:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('remove-record <domainName> <name> <type>')
    .description('Remove a DNS record')
    .action(async (domainName, name, type) => {
        try {
            const domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                console.log(`Domain '${domainName}' not found`);
                mongoose.disconnect();
                return;
            }

            const record = await Record.findOne({
                domain: domain._id,
                name: name === '@' ? '@' : name.toLowerCase(),
                type: type.toUpperCase()
            });

            if (!record) {
                console.log(`Record '${name}' of type '${type}' not found in domain '${domainName}'`);
                mongoose.disconnect();
                return;
            }

            await Record.deleteOne({ _id: record._id });
            console.log(`Record '${name}' of type '${type}' removed from domain '${domainName}'`);

            // Update DNS server records
            await recordService.refreshDnsRecords();
            mongoose.disconnect();
        } catch (error) {
            console.error('Error removing record:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

// Verification commands
program
    .command('initiate-verification <domainName>')
    .description('Initiate domain verification process')
    .action(async (domainName) => {
        try {
            // Find or create the domain
            let domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                domain = new Domain({
                    name: domainName.toLowerCase(),
                    verified: false
                });
                await domain.save();
                console.log(`Domain '${domainName}' created`);
            }

            // Check if domain is already verified
            if (domain.verified) {
                console.log(`Domain '${domainName}' is already verified`);
                mongoose.disconnect();
                return;
            }

            // Check if verification is already in progress
            let verification = await Verification.findOne({ domain: domain._id });

            if (verification && verification.status === 'pending') {
                console.log(`Verification already in progress for domain '${domainName}'`);
                console.log(`Add a TXT record to your domain with name '_pds-verify' and value '${verification.txtRecord}'`);
                mongoose.disconnect();
                return;
            }

            // Create a new verification challenge
            const { token, txtRecord } = verificationService.generateVerificationChallenge(domain.name);

            verification = new Verification({
                domain: domain._id,
                token,
                txtRecord,
                status: 'pending',
                attempts: 0
            });

            await verification.save();
            console.log(`Verification initiated for domain '${domainName}'`);
            console.log(`Add a TXT record to your domain with name '_pds-verify' and value '${txtRecord}'`);
            mongoose.disconnect();
        } catch (error) {
            console.error('Error initiating verification:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('check-verification <domainName>')
    .description('Check domain verification status')
    .action(async (domainName) => {
        try {
            const domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                console.log(`Domain '${domainName}' not found`);
                mongoose.disconnect();
                return;
            }

            // If domain is already verified
            if (domain.verified) {
                console.log(`Domain '${domainName}' is already verified`);
                mongoose.disconnect();
                return;
            }

            const verification = await Verification.findOne({ domain: domain._id });

            if (!verification) {
                console.log(`No verification in progress for domain '${domainName}'`);
                console.log(`Run 'initiate-verification ${domainName}' to start verification process`);
                mongoose.disconnect();
                return;
            }

            // Attempt verification
            verification.attempts += 1;

            const verificationResult = await verificationService.verifyDomain(domain.name, verification.txtRecord);

            if (verificationResult.verified) {
                // Update verification status
                verification.status = 'verified';
                verification.verifiedAt = Date.now();
                await verification.save();

                // Update domain status
                domain.verified = true;
                domain.verifiedAt = Date.now();
                await domain.save();

                console.log(`Domain '${domainName}' successfully verified`);
            } else {
                // Update verification status if max attempts reached
                if (verification.attempts >= 5) {
                    verification.status = 'failed';
                    await verification.save();
                    console.log(`Domain verification failed for '${domainName}' (max attempts reached)`);
                } else {
                    await verification.save();
                    console.log(`Domain verification failed for '${domainName}': ${verificationResult.error}`);
                    console.log(`Attempts remaining: ${5 - verification.attempts}`);
                    console.log(`Ensure TXT record '_pds-verify' has value '${verification.txtRecord}'`);
                }
            }

            mongoose.disconnect();
        } catch (error) {
            console.error('Error checking verification:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('reset-verification <domainName>')
    .description('Reset domain verification status')
    .action(async (domainName) => {
        try {
            const domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                console.log(`Domain '${domainName}' not found`);
                mongoose.disconnect();
                return;
            }

            // Delete existing verification
            await Verification.deleteMany({ domain: domain._id });

            // Reset domain verification status
            domain.verified = false;
            domain.verifiedAt = null;
            await domain.save();

            console.log(`Verification status reset for domain '${domainName}'`);
            console.log(`Run 'initiate-verification ${domainName}' to start a new verification process`);
            mongoose.disconnect();
        } catch (error) {
            console.error('Error resetting verification:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

// Client commands
program
    .command('list-clients')
    .description('List all clients')
    .action(async () => {
        try {
            const clients = await Client.find({}).sort({ name: 1 });
            console.log('Clients:');
            clients.forEach(client => {
                console.log(`- ${client.name} (ID: ${client.clientId}, Type: ${client.type}, Status: ${client.active ? 'Active' : 'Inactive'})`);
                console.log(`  Domains: ${client.domains.join(', ') || 'None'}`);
            });
            mongoose.disconnect();
        } catch (error) {
            console.error('Error listing clients:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('add-client <name> <clientId>')
    .description('Add a new client')
    .option('-t, --type <type>', 'Client type (onelogin, pds, other)', 'other')
    .option('-d, --domains <domains>', 'Comma-separated list of domains', '')
    .action(async (name, clientId, options) => {
        try {
            const existingClient = await Client.findOne({ clientId });

            if (existingClient) {
                console.log(`Client with ID '${clientId}' already exists`);
                mongoose.disconnect();
                return;
            }

            // Generate API key
            const apiKey = crypto.randomBytes(16).toString('hex');

            // Parse domains
            const domains = options.domains
                ? options.domains.split(',').map(d => d.trim().toLowerCase())
                : [];

            const client = new Client({
                name,
                clientId,
                apiKey,
                type: options.type,
                domains,
                active: true
            });

            await client.save();
            console.log(`Client '${name}' added with ID '${clientId}'`);
            console.log(`API Key: ${apiKey} (keep this secure)`);
            mongoose.disconnect();
        } catch (error) {
            console.error('Error adding client:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('remove-client <clientId>')
    .description('Remove a client')
    .action(async (clientId) => {
        try {
            const client = await Client.findOne({ clientId });

            if (!client) {
                console.log(`Client with ID '${clientId}' not found`);
                mongoose.disconnect();
                return;
            }

            await Client.deleteOne({ _id: client._id });
            console.log(`Client '${client.name}' removed`);
            mongoose.disconnect();
        } catch (error) {
            console.error('Error removing client:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('regenerate-api-key <clientId>')
    .description('Regenerate API key for a client')
    .action(async (clientId) => {
        try {
            const client = await Client.findOne({ clientId });

            if (!client) {
                console.log(`Client with ID '${clientId}' not found`);
                mongoose.disconnect();
                return;
            }

            // Generate new API key
            const apiKey = crypto.randomBytes(16).toString('hex');

            client.apiKey = apiKey;
            client.updatedAt = Date.now();
            await client.save();

            console.log(`API key regenerated for client '${client.name}'`);
            console.log(`New API Key: ${apiKey} (keep this secure)`);
            mongoose.disconnect();
        } catch (error) {
            console.error('Error regenerating API key:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

// Server commands
program
    .command('start-dns-server')
    .description('Start the DNS server')
    .action(async () => {
        try {
            // Load records
            await recordService.refreshDnsRecords();

            // Start DNS server
            dnsServer.start();
            console.log('DNS server started');

            // Keep process running
            process.stdin.resume();

            // Handle Ctrl+C
            process.on('SIGINT', () => {
                dnsServer.stop();
                console.log('DNS server stopped');
                mongoose.disconnect();
                process.exit();
            });
        } catch (error) {
            console.error('Error starting DNS server:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program
    .command('stop-dns-server')
    .description('Stop the DNS server')
    .action(async () => {
        try {
            dnsServer.stop();
            console.log('DNS server stopped');
            mongoose.disconnect();
        } catch (error) {
            console.error('Error stopping DNS server:', error);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
    mongoose.disconnect();
}
