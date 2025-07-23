# PDS 2.2: Local DNS Service Specification

## Overview

The Local DNS Service is a prototype implementation designed to facilitate domain verification for government service registration in the PDS 2.2 ecosystem. It allows government services to prove ownership of their domains by creating TXT records that can be verified during the registration process with the OneLogin OIDC provider and the Gov Wallet PDS.

## Key Features

### DNS Record Management
- TXT record creation and management
- Domain verification for government service registration
- Simple API for record manipulation
- Web interface for DNS record management

### Integration with Service Registration
- Verification endpoints for OIDC and PDS
- Challenge generation for domain verification
- Verification status tracking
- Automated verification polling

## Use Cases

### Government Service Registration Verification
1. Government service initiates registration with OneLogin or Gov Wallet
2. Registration process generates a unique verification code
3. Government service creates a TXT record with the verification code
4. OneLogin/Gov Wallet verifies the TXT record exists
5. Registration proceeds after successful verification

### Government Domain Ownership Proof
1. Government service claims ownership of a domain
2. System challenges service to prove ownership
3. Government service creates a TXT record with challenge response
4. System verifies the TXT record exists
5. Domain ownership is confirmed

## Technical Architecture

### Components
- **DNS Server**: Lightweight DNS server for local testing
- **Record Management Service**: Service for TXT record CRUD operations
- **Verification Service**: Service for verifying domain ownership
- **API Layer**: RESTful API for DNS record management
- **Web Interface**: Simple UI for managing DNS records

### Data Models
- **Domain**: Information about registered domains
- **Record**: DNS records associated with domains
- **Verification**: Domain verification challenges and statuses
- **Client**: Services registered with the DNS system

### API Endpoints

#### Record Management
- `POST /api/records`: Create a new DNS record
- `GET /api/records/{id}`: Get a specific DNS record
- `PUT /api/records/{id}`: Update a DNS record
- `DELETE /api/records/{id}`: Delete a DNS record
- `GET /api/records`: List all DNS records for a domain

#### Domain Verification
- `POST /api/verify/challenge`: Generate a verification challenge
- `GET /api/verify/status/{id}`: Check verification status
- `POST /api/verify/complete`: Complete verification process

#### DNS Query
- `GET /api/query/{domain}/{type}`: Query DNS records (e.g., TXT)

## Integration Points

### OneLogin OIDC Provider
- Domain verification during government client registration
- Challenge generation and verification
- Registration status updates

### Gov Wallet PDS
- Domain verification for government service registration
- Challenge verification for credential operations
- Service identity verification

### Government Services
- Domain verification during registration
- TXT record creation and management
- Verification status checking

## Implementation Requirements

### Technical Stack
- Node.js with Express
- Lightweight DNS server implementation
- MongoDB for data storage
- RESTful API with JSON responses
- Simple web interface

### Security Requirements
- Access control for DNS record management
- Verification token security
- Rate limiting for verification attempts
- Audit logging for all operations

### UI Requirements
- Simple, intuitive interface for record management
- Verification status monitoring
- Error handling and user feedback
- Clear instructions for verification process

## Development and Deployment

### Local Development
- Development environment configuration
- Testing tools and procedures
- API documentation and examples

### Production Considerations
- This is a prototype service for local testing only
- Not intended for production deployment
- Should be replaced with real DNS infrastructure in production

## Implementation Notes

1. This is a prototype service for demonstration purposes
2. In a production environment, real DNS infrastructure would be used
3. The service should demonstrate the principles of domain verification
4. The implementation should be simple but functional

## Appendix

### DNS TXT Record Format

For domain verification, TXT records should follow this format:
```
pds-verify=<verification-token>
```

Where `<verification-token>` is the challenge token provided during the registration process.
