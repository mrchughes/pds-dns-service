#!/usr/bin/env node

/**
 * DNS Service Verification CLI - A simplified command-line tool for domain verification
 */

require('dotenv').config();
const dns = require('dns').promises;
const { generateVerificationToken, formatTxtRecord } = require('../src/utils/helpers');
const Domain = require('../src/models/Domain');
const Verification = require('../src/models/Verification');
const Record = require('../src/models/Record');
const logger = require('../src/utils/logger');
const mongoose = require('mongoose');
const { program } = require('commander');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dns-service', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        logger.info('Connected to MongoDB');
    } catch (error) {
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
        process.exit(1);
    }
}

// Initialize the CLI program
program
    .version('1.0.0')
    .description('DNS Service Verification CLI - A simplified tool for domain verification');

// Generate a verification challenge
program
    .command('generate-challenge <domain>')
    .description('Generate a verification challenge for a domain')
    .option('-s, --service <service>', 'Service type (onelogin, pds, other)', 'other')
    .option('-i, --id <id>', 'Service ID', 'cli-verification')
    .action(async (domain, options) => {
        await connectDB();
        try {
            // Generate token
            const token = generateVerificationToken();
            const txtRecord = formatTxtRecord(token);

            // Find or create domain
            let domainDoc = await Domain.findOne({ name: domain.toLowerCase() });
            if (!domainDoc) {
                domainDoc = new Domain({
                    name: domain.toLowerCase(),
                    verified: false
                });
                await domainDoc.save();
                logger.info(`Domain ${domain} created`);
            }

            // Create verification record
            const verification = new Verification({
                domain: domain.toLowerCase(),
                token,
                status: 'pending',
                serviceType: options.service,
                serviceId: options.id,
                expiresAt: new Date(Date.now() + (parseInt(process.env.CHALLENGE_TOKEN_EXPIRY) || 86400) * 1000)
            });

            await verification.save();

            console.log(`\n===== Domain Verification Challenge =====`);
            console.log(`Domain: ${domain}`);
            console.log(`\nAdd the following TXT record to your domain's DNS settings:`);
            console.log(`Record Type: TXT`);
            console.log(`Name/Host: _pds-verify.${domain}`);
            console.log(`Value/Content: ${txtRecord}`);
            console.log(`TTL: 300 (or default)`);
            console.log(`\nAfter adding the TXT record, run this command to verify:`);
            console.log(`verify-domain ${domain}\n`);

            mongoose.disconnect();
        } catch (error) {
            logger.error(`Error generating challenge: ${error.message}`);
            mongoose.disconnect();
            process.exit(1);
        }
    });

// Verify a domain
program
    .command('verify-domain <domain>')
    .description('Verify a domain using its TXT record')
    .action(async (domain) => {
        await connectDB();
        try {
            const domainName = domain.toLowerCase();

            // Find domain and verification
            const domainDoc = await Domain.findOne({ name: domainName });
            if (!domainDoc) {
                console.log(`Domain ${domain} not found. Generate a challenge first.`);
                mongoose.disconnect();
                return;
            }

            if (domainDoc.verified) {
                console.log(`Domain ${domain} is already verified!`);
                mongoose.disconnect();
                return;
            }

            const verification = await Verification.findOne({
                domain: domainName,
                status: 'pending'
            });

            if (!verification) {
                console.log(`No pending verification found for ${domain}. Generate a challenge first.`);
                mongoose.disconnect();
                return;
            }

            // Check if verification has expired
            if (verification.expiresAt < new Date()) {
                verification.status = 'expired';
                await verification.save();
                console.log(`Verification for ${domain} has expired. Generate a new challenge.`);
                mongoose.disconnect();
                return;
            }

            console.log(`Checking TXT record for _pds-verify.${domainName}...`);

            try {
                // Try to resolve the TXT record
                const records = await dns.resolveTxt(`_pds-verify.${domainName}`);

                // Flatten and check for our verification token
                let found = false;
                for (const record of records) {
                    const txtValue = record.join('');
                    if (txtValue === formatTxtRecord(verification.token)) {
                        found = true;
                        break;
                    }
                }

                if (found) {
                    // Update verification status
                    verification.status = 'verified';
                    verification.completedAt = new Date();
                    await verification.save();

                    // Update domain status
                    domainDoc.verified = true;
                    domainDoc.updatedAt = new Date();
                    await domainDoc.save();

                    console.log(`\n✅ Domain ${domain} has been successfully verified!`);
                    console.log(`Verification completed at: ${verification.completedAt.toLocaleString()}`);
                } else {
                    console.log(`\n❌ Verification failed: Correct TXT record not found.`);
                    console.log(`Make sure you've added a TXT record for _pds-verify.${domainName}`);
                    console.log(`with the value: ${formatTxtRecord(verification.token)}`);
                    console.log(`\nNote: DNS changes can take up to 24-48 hours to propagate globally.`);
                }
            } catch (error) {
                if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
                    console.log(`\n❌ Verification failed: No TXT records found for _pds-verify.${domainName}`);
                    console.log(`Make sure you've added the TXT record correctly and DNS has propagated.`);
                } else {
                    console.log(`\n❌ Verification failed: ${error.message}`);
                }
            }

            mongoose.disconnect();
        } catch (error) {
            logger.error(`Error verifying domain: ${error.message}`);
            mongoose.disconnect();
            process.exit(1);
        }
    });

// List all domains and their verification status
program
    .command('list-domains')
    .description('List all domains and their verification status')
    .action(async () => {
        await connectDB();
        try {
            const domains = await Domain.find({}).sort({ name: 1 });

            console.log('\n===== Domains =====');
            if (domains.length === 0) {
                console.log('No domains found.');
            } else {
                console.log('Name'.padEnd(30) + 'Status'.padEnd(15) + 'Created');
                console.log('-'.repeat(60));

                for (const domain of domains) {
                    const status = domain.verified ? 'Verified' : 'Unverified';
                    const created = domain.createdAt.toLocaleDateString();
                    console.log(`${domain.name.padEnd(30)}${status.padEnd(15)}${created}`);
                }
            }

            mongoose.disconnect();
        } catch (error) {
            logger.error(`Error listing domains: ${error.message}`);
            mongoose.disconnect();
            process.exit(1);
        }
    });

// Reset verification for a domain
program
    .command('reset-verification <domain>')
    .description('Reset verification status for a domain')
    .action(async (domain) => {
        await connectDB();
        try {
            const domainName = domain.toLowerCase();

            // Find domain
            const domainDoc = await Domain.findOne({ name: domainName });
            if (!domainDoc) {
                console.log(`Domain ${domain} not found.`);
                mongoose.disconnect();
                return;
            }

            // Delete existing verifications
            await Verification.deleteMany({ domain: domainName });

            // Reset domain verification status
            if (domainDoc.verified) {
                domainDoc.verified = false;
                domainDoc.updatedAt = new Date();
                await domainDoc.save();
            }

            console.log(`\n✅ Verification status reset for domain ${domain}.`);
            console.log('You can now generate a new verification challenge.');

            mongoose.disconnect();
        } catch (error) {
            logger.error(`Error resetting verification: ${error.message}`);
            mongoose.disconnect();
            process.exit(1);
        }
    });

// Force verify a domain (for testing)
program
    .command('force-verify <domain>')
    .description('Force verify a domain (for testing purposes only)')
    .action(async (domain) => {
        await connectDB();
        try {
            const domainName = domain.toLowerCase();

            // Find or create domain
            let domainDoc = await Domain.findOne({ name: domainName });
            if (!domainDoc) {
                domainDoc = new Domain({
                    name: domainName,
                });
            }

            // Update domain status
            domainDoc.verified = true;
            domainDoc.updatedAt = new Date();
            await domainDoc.save();

            // Create verification record if none exists
            let verification = await Verification.findOne({ domain: domainName });
            if (!verification) {
                verification = new Verification({
                    domain: domainName,
                    token: generateVerificationToken(),
                    status: 'force_completed',
                    serviceType: 'other',
                    serviceId: 'cli-force-verify',
                    expiresAt: new Date(Date.now() + 86400000)
                });
            } else {
                verification.status = 'force_completed';
            }

            verification.completedAt = new Date();
            await verification.save();

            console.log(`\n⚠️ Domain ${domain} has been force verified for testing purposes.`);

            mongoose.disconnect();
        } catch (error) {
            logger.error(`Error force verifying domain: ${error.message}`);
            mongoose.disconnect();
            process.exit(1);
        }
    });

program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(0);
}
