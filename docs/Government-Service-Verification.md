# DNS Verification Service for Government Services

This document describes how the DNS Verification Service supports government service registration and verification.

## Overview

The DNS Verification Service provides a secure way to verify domain ownership for government services registering with the OneLogin OIDC Provider. This is a critical security feature that ensures only legitimate government services can register and access enhanced features.

## Features

- **Domain Verification**: Verifies domain ownership using DNS TXT records
- **Government Service Support**: Special verification flow for government domains
- **API Integration**: RESTful API for integration with the OneLogin OIDC Provider
- **Secure Communication**: API key authentication for secure service-to-service communication
- **Verification Status Tracking**: Tracks verification status and history

## Verification Process

The verification process involves:

1. **Verification Request**: Received from the OneLogin OIDC Provider
2. **Challenge Generation**: Creates a unique verification token
3. **DNS Verification**: Checks for the presence of the token in a TXT record
4. **Status Reporting**: Reports verification status back to the requesting service
5. **Completion**: Marks the domain as verified upon successful verification

## API Endpoints

The following API endpoints are available for government service verification:

- `POST /api/gov-services/verify`: Initiate domain verification
- `GET /api/gov-services/verify/:verificationId`: Check verification status
- `POST /api/gov-services/verify/complete`: Complete verification process

## Configuration

Configure the DNS Verification Service in the `.env` file:

```
# API Authentication
API_KEY=your_api_key_here

# Verification Settings
CHALLENGE_TOKEN_EXPIRY=86400 # 24 hours in seconds
```

## Integration with OneLogin OIDC Provider

The DNS Verification Service integrates with the OneLogin OIDC Provider to:

1. Accept verification requests from the provider
2. Generate and provide verification challenges
3. Perform DNS lookups to verify domain ownership
4. Report verification status back to the provider
5. Complete verification and update service status

## Implementation Details

The service uses:

- **MongoDB**: For storing verification records and history
- **DNS Lookups**: For checking TXT records on domains
- **API Authentication**: For secure service-to-service communication
- **Expiration Logic**: For managing verification token lifetimes

## Security Considerations

- All API endpoints are protected with API key authentication
- Verification tokens expire after a configurable period
- Only authorized services can request and check verifications
- TXT record validation uses secure DNS lookup mechanisms
