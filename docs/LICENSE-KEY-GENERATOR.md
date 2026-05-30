# License Key Generation — Zenthoz Internal Guide

> **CONFIDENTIAL — For Zenthoz Technologies use only**

---

## How License Keys Work

License keys are **domain-specific** — each key only works on one domain. This prevents clients from copying the system to unauthorized domains.

The key is generated using HMAC-SHA256:
```
KEY = first 16 hex chars of HMAC-SHA256(domain, SECRET_KEY)
Formatted as: ZPOS-XXXX-XXXX-XXXX-XXXX
```

The SECRET_KEY is embedded in the application source code (`src/lib/license.ts`). Never share or change this key after first deployment.

---

## Generating a License Key (via API)

### Method 1: Using the API endpoint

```bash
curl -X POST https://YOUR_DEPLOYED_DOMAIN/api/admin/generate-license \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "clientdomain.com",
    "masterPassword": "YOUR_ZENTHOZ_MASTER_PASSWORD"
  }'
```

Response:
```json
{
  "domain": "clientdomain.com",
  "licenseKey": "ZPOS-A1B2-C3D4-E5F6-G7H8"
}
```

### Method 2: Using the Node.js script (offline generation)

Create a file `generate-key.js` anywhere:
```javascript
const crypto = require('crypto');

const LICENSE_SECRET = "ZENTHOZ-POS-2024-0779067747-SECRET-KEY"; // Must match src/lib/license.ts

function generateLicenseKey(domain) {
  const normalized = domain.replace(/^www\./i, '').toLowerCase().trim();
  const hash = crypto.createHmac('sha256', LICENSE_SECRET)
    .update(normalized)
    .digest('hex');
  const h = hash.toUpperCase();
  return `ZPOS-${h.slice(0,4)}-${h.slice(4,8)}-${h.slice(8,12)}-${h.slice(12,16)}`;
}

const domain = process.argv[2];
if (!domain) {
  console.log('Usage: node generate-key.js clientdomain.com');
  process.exit(1);
}

console.log('Domain:', domain);
console.log('License Key:', generateLicenseKey(domain));
```

Run:
```bash
node generate-key.js clientdomain.com
```

---

## Client License Record Template

Keep a record of all issued licenses:

| Date | Client Name | Domain | License Key | Contact |
|------|-------------|--------|-------------|---------|
| 2024-01-01 | ABC Shop | abcshop.lk | ZPOS-XXXX-XXXX-XXXX-XXXX | 077... |

---

## Master Password

The ZENTHOZ_MASTER_PASSWORD environment variable must be set in each deployment. Default (change for production):

```
ZENTHOZ_MASTER_PASSWORD=zenthoz-admin-2024
```

Set a strong, unique password for each client deployment and record it securely.

---

## Important Notes

1. **Domain matching**: The key for `shop.com` is DIFFERENT from `www.shop.com` — the system normalizes by stripping `www.` before validation. So `ZPOS-...` generated for `shop.com` works for both `shop.com` and `www.shop.com`.

2. **Localhost**: A key generated for `localhost` only works on localhost (for development/testing).

3. **Re-activation**: If a client changes their domain, generate a new key for the new domain. The old key won't work on the new domain.

4. **Key confidentiality**: Keep the SECRET_KEY in the source code private. Do not post it publicly or share it outside Zenthoz.
