const mongoose = require('mongoose');
const Client = require('./Client');

// Controller for managing clients
const clientController = {
    // Get all clients
    getAllClients: async (req, res) => {
        try {
            const clients = await Client.find({});
            res.status(200).json(clients);
        } catch (error) {
            console.error('Error fetching clients:', error);
            res.status(500).json({ error: 'Failed to retrieve clients' });
        }
    },

    // Get a single client by ID
    getClientById: async (req, res) => {
        try {
            const client = await Client.findById(req.params.id);
            if (!client) {
                return res.status(404).json({ error: 'Client not found' });
            }
            res.status(200).json(client);
        } catch (error) {
            console.error('Error fetching client:', error);
            res.status(500).json({ error: 'Failed to retrieve client' });
        }
    },

    // Create a new client
    createClient: async (req, res) => {
        try {
            const { name, clientId, apiKey, type, domains } = req.body;

            // Check if client with the same clientId already exists
            const existingClient = await Client.findOne({ clientId });
            if (existingClient) {
                return res.status(400).json({ error: 'Client with this ID already exists' });
            }

            const newClient = new Client({
                name,
                clientId,
                apiKey,
                type,
                domains: domains || []
            });

            await newClient.save();
            res.status(201).json(newClient);
        } catch (error) {
            console.error('Error creating client:', error);
            res.status(500).json({ error: 'Failed to create client' });
        }
    },

    // Update an existing client
    updateClient: async (req, res) => {
        try {
            const { name, apiKey, type, domains, active } = req.body;

            const updateData = {
                ...(name && { name }),
                ...(apiKey && { apiKey }),
                ...(type && { type }),
                ...(domains && { domains }),
                ...(active !== undefined && { active }),
                updatedAt: Date.now()
            };

            const updatedClient = await Client.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedClient) {
                return res.status(404).json({ error: 'Client not found' });
            }

            res.status(200).json(updatedClient);
        } catch (error) {
            console.error('Error updating client:', error);
            res.status(500).json({ error: 'Failed to update client' });
        }
    },

    // Delete a client
    deleteClient: async (req, res) => {
        try {
            const deletedClient = await Client.findByIdAndDelete(req.params.id);

            if (!deletedClient) {
                return res.status(404).json({ error: 'Client not found' });
            }

            res.status(200).json({ message: 'Client deleted successfully' });
        } catch (error) {
            console.error('Error deleting client:', error);
            res.status(500).json({ error: 'Failed to delete client' });
        }
    },

    // Add a domain to a client
    addDomain: async (req, res) => {
        try {
            const { domain } = req.body;

            if (!domain) {
                return res.status(400).json({ error: 'Domain is required' });
            }

            const client = await Client.findById(req.params.id);

            if (!client) {
                return res.status(404).json({ error: 'Client not found' });
            }

            if (client.domains.includes(domain.toLowerCase())) {
                return res.status(400).json({ error: 'Domain already exists for this client' });
            }

            client.domains.push(domain.toLowerCase());
            client.updatedAt = Date.now();

            await client.save();
            res.status(200).json(client);
        } catch (error) {
            console.error('Error adding domain to client:', error);
            res.status(500).json({ error: 'Failed to add domain to client' });
        }
    },

    // Remove a domain from a client
    removeDomain: async (req, res) => {
        try {
            const { domain } = req.body;

            if (!domain) {
                return res.status(400).json({ error: 'Domain is required' });
            }

            const client = await Client.findById(req.params.id);

            if (!client) {
                return res.status(404).json({ error: 'Client not found' });
            }

            const domainIndex = client.domains.indexOf(domain.toLowerCase());

            if (domainIndex === -1) {
                return res.status(400).json({ error: 'Domain not found for this client' });
            }

            client.domains.splice(domainIndex, 1);
            client.updatedAt = Date.now();

            await client.save();
            res.status(200).json(client);
        } catch (error) {
            console.error('Error removing domain from client:', error);
            res.status(500).json({ error: 'Failed to remove domain from client' });
        }
    }
};

module.exports = clientController;
