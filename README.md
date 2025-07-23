# DNS Service for PDS 2.2

A lightweight DNS service for managing TXT records to facilitate domain verification in the PDS 2.2 ecosystem. This service acts as a core component of the PDS 2.2 architecture, providing domain verification for service providers.

## Features

- TXT record management for domain verification
- RESTful API for DNS record operations
- Web interface for DNS record management
- Integration with OneLogin OIDC and Gov Wallet PDS
- Challenge generation and verification for domain ownership
- Government service domain verification
- Special handling for government domains
- Service-specific API key authentication

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env` and adjust values)
4. Start the service:
   ```
   npm start
   ```

## Integration with OneLogin OIDC Provider

The DNS Service is integrated with the OneLogin OIDC Provider to enable domain verification for clients. The integration uses API key authentication and provides the following:

- Verification of domain ownership via TXT records
- Detection of government domains (*.gov.uk and others)
- Secure API for domain verification checks
- Fallback mechanisms for direct DNS lookups

For more details, see the [PDS-DNS Integration](../docs/pds-dns-integration.md) documentation.

## Development

For development with hot reloading:
```
npm run dev
```

## API Endpoints

### Record Management
- `POST /api/records`: Create a new DNS record
- `GET /api/records/:id`: Get a specific DNS record
- `PUT /api/records/:id`: Update a DNS record
- `DELETE /api/records/:id`: Delete a DNS record
- `GET /api/records`: List all DNS records for a domain

### Domain Verification
- `POST /api/verify/challenge`: Generate a verification challenge
- `GET /api/verify/status/:id`: Check verification status
- `POST /api/verify/complete`: Complete verification process

### Government Service Verification
- `POST /api/gov-services/verify`: Initiate government service verification
- `GET /api/gov-services/verify/:verificationId`: Check government service verification status
- `POST /api/gov-services/verify/complete`: Complete government service verification

### DNS Query
- `GET /api/query/:domain/:type`: Query DNS records (e.g., TXT)

## Web Interface

The web interface is available at `http://localhost:3003` and provides:

- Dashboard for DNS record management
- Verification status monitoring
- Domain management

## Integration

### OneLogin OIDC Integration
The DNS service integrates with OneLogin for government service registration verification by:
1. Receiving verification requests from OneLogin
2. Generating challenge tokens
3. Verifying TXT records for the specified domain
4. Reporting verification status back to OneLogin

For detailed information about the government service verification process, see [Government Service Verification](./docs/Government-Service-Verification.md).

### Gov Wallet PDS Integration
Similar integration with Gov Wallet PDS for:
1. Domain verification during service registration
2. Challenge verification for credential operations
3. Service identity verification

## License

This project is part of the PDS 2.2 prototype and is not intended for production use.
