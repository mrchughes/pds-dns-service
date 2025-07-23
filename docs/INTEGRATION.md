# DNS Verification Service Integration Guide

This document provides guidance on integrating the DNS Verification Service with OneLogin OIDC Provider and Gov Wallet PDS for government service domain verification.

## Overview

The DNS Verification Service enables government services to prove domain ownership during registration with OneLogin and the PDS. This document outlines the integration points and implementation details for using the DNS verification service.

## Integration with OneLogin OIDC Provider

### Registration Flow

1. **Client Registration Request**:
   - Government service initiates registration with OneLogin
   - Client provides domain name and other required information
   - OneLogin identifies the service type as "government"

2. **DNS Verification Initiation**:
   - OneLogin calls DNS Verification Service: `POST /api/government/verify`
   - Request includes domain, serviceId, and returnUrl
   - DNS service generates a verification token and TXT record value

3. **Challenge Response**:
   - OneLogin returns the TXT record value to the government service
   - Government service adds the TXT record to their DNS configuration
   - Record format: `pds-verify=<token>`

4. **Verification Check**:
   - OneLogin periodically checks verification status: `GET /api/government/verify/:verificationId`
   - DNS service verifies the TXT record exists and is valid
   - When verified, status is updated to "verified"

5. **Registration Completion**:
   - When status is "verified", OneLogin completes the registration
   - DNS service is notified of completion: `POST /api/government/verify/complete`
   - Government service is registered with OneLogin

### API Integration

#### Initiate Verification

```http
POST /api/government/verify
Headers:
  X-API-Key: <onelogin-api-key>
Body:
  {
    "domain": "example.gov.uk",
    "serviceId": "onelogin-client-id",
    "returnUrl": "https://onelogin.pds.gov.uk/register/callback"
  }
```

#### Check Verification Status

```http
GET /api/government/verify/<verificationId>
Headers:
  X-API-Key: <onelogin-api-key>
```

#### Complete Verification

```http
POST /api/government/verify/complete
Headers:
  X-API-Key: <onelogin-api-key>
Body:
  {
    "verificationId": "<verification-id>",
    "serviceId": "onelogin-client-id"
  }
```

## Integration with Gov Wallet PDS

### Verification Flow

1. **Service Registration**:
   - Government service attempts to register with PDS
   - PDS identifies the service as government type
   - PDS initiates domain verification

2. **DNS Verification**:
   - PDS calls DNS Verification Service: `POST /api/government/verify`
   - DNS service generates verification token and TXT record value
   - PDS provides the TXT record value to the government service

3. **Verification Status**:
   - PDS periodically checks verification status
   - When verified, PDS allows credential operations for government service
   - DNS service notifies PDS about status changes

### API Integration

The PDS uses the same API endpoints as OneLogin but with its own API key:

```http
POST /api/government/verify
Headers:
  X-API-Key: <pds-api-key>
Body:
  {
    "domain": "example.gov.uk",
    "serviceId": "pds-client-id",
    "returnUrl": "https://pds.gov.uk/register/callback"
  }
```

## Callback Notifications

The DNS service proactively notifies integrated services about verification status changes:

### OneLogin Callback

```http
POST https://onelogin.pds.gov.uk/api/dns-verification/callback
Body:
  {
    "verificationId": "<verification-id>",
    "domain": "example.gov.uk",
    "status": "verified",
    "serviceId": "onelogin-client-id",
    "completedAt": "2025-07-22T10:30:45Z"
  }
```

### PDS Callback

```http
POST https://pds.gov.uk/api/dns-verification/callback
Body:
  {
    "verificationId": "<verification-id>",
    "domain": "example.gov.uk",
    "status": "verified",
    "serviceId": "pds-client-id",
    "completedAt": "2025-07-22T10:30:45Z"
  }
```

## Error Handling

Common error scenarios and responses:

- **Invalid API Key**: 401 Unauthorized
- **Invalid Domain Format**: 400 Bad Request
- **Verification Not Found**: 404 Not Found
- **Verification Expired**: 400 Bad Request with status "expired"
- **Service ID Mismatch**: 403 Forbidden

## Testing the Integration

To test the integration:

1. Register a test client with API key in the DNS service
2. Use the API key to make verification requests
3. Add the TXT record to the test domain
4. Check verification status
5. Complete verification
6. Verify callbacks are received

## Security Considerations

- API keys should be rotated periodically
- HTTPS should be used for all API communication
- Verification tokens expire after a configurable period (default: 24 hours)
- Service IDs are validated to prevent unauthorized access to verifications
