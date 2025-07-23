# DNS Verification Service Implementation

This document describes the implementation of the DNS Verification Service for government service domain verification in PDS 2.2.

## Overview

The DNS Verification Service provides a mechanism for government services to prove domain ownership during registration with OneLogin and the PDS. It's implemented as a lightweight DNS server that handles TXT records for domain verification, along with a web interface and API for managing DNS records and verification processes.

## Key Components

### DNS Server
- Lightweight DNS server for handling queries for TXT records
- Implementation: `src/services/dnsServer.js`
- Responds to TXT record queries with records from the database
- Runs on a configurable port (default: 53235)

### Record Management
- API for managing DNS records
- Implementation: `src/services/recordService.js`, `src/controllers/recordController.js`
- Supports CRUD operations for DNS records
- Web interface for viewing and managing records

### Verification Service
- Core verification logic for domain ownership
- Implementation: `src/services/verificationService.js`, `src/controllers/verificationController.js`
- Generates verification challenges and tokens
- Verifies domain ownership via TXT records
- Maintains verification status and history

### Government Service Integration
- Specific routes and controllers for government service verification
- Implementation: `src/controllers/governmentServiceController.js`, `src/routes/governmentServiceRoutes.js`
- API endpoints for initiating, checking, and completing verification
- Integration with OneLogin and PDS for verification callbacks

### External Integrations
- Notification service for verification status updates
- Implementation: `src/services/externalIntegration.js`
- Notifies OneLogin and PDS about verification status changes
- Supports callback URLs for verification completion

## Authentication

The API is secured using API keys:
- Each client (OneLogin, PDS, government services) has a unique API key
- API key validation via `src/middleware/auth.js`
- Client registration and management API

## Verification Process

1. **Initiation**:
   - Government service requests verification via OneLogin or PDS
   - Service calls `/api/government/verify` with domain and serviceId
   - System generates a verification token
   - Token is formatted as a TXT record value: `pds-verify=<token>`

2. **Record Creation**:
   - Government service creates a TXT record with the provided value
   - Record is added to the domain's DNS configuration

3. **Verification**:
   - System checks for the TXT record periodically
   - When found, verification status is updated to "verified"
   - Integrated services are notified about the status change

4. **Completion**:
   - Government service completes registration with verified domain
   - Verification record is maintained for audit purposes

## API Endpoints

### Government Service Registration

- `POST /api/government/verify`: Initiate domain verification
- `GET /api/government/verify/:verificationId`: Check verification status
- `POST /api/government/verify/complete`: Complete verification process

### Record Management

- `POST /api/records`: Create a new DNS record
- `GET /api/records/{id}`: Get a specific DNS record
- `PUT /api/records/{id}`: Update a DNS record
- `DELETE /api/records/{id}`: Delete a DNS record
- `GET /api/records`: List all DNS records for a domain

### Verification Management

- `POST /api/verifications/initiate`: Generate a verification challenge
- `GET /api/verifications/status/{id}`: Check verification status
- `POST /api/verifications/complete`: Complete verification process

## Integration with PDS 2.2 System

The DNS Verification Service integrates with:

1. **OneLogin OIDC Provider**:
   - Verification callbacks for government client registration
   - Status updates for verification process
   - Domain verification for issuing government-specific tokens

2. **Gov Wallet PDS**:
   - Domain verification for government service registration
   - Verification status checking for credential operations
   - Security enforcement for government service operations

## Testing

The service includes comprehensive testing:
- Unit tests for verification logic
- Integration tests for DNS server functionality
- API tests for verification endpoints
- End-to-end tests for the complete verification flow

## Deployment

The service is containerized with Docker and can be deployed:
- As a standalone service
- As part of the PDS 2.2 ecosystem via Docker Compose
- With configurable environment variables for different environments
