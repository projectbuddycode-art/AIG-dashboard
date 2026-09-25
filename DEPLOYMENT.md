# Vercel Deployment - Environment Variables

When deploying to Vercel, ensure the following environment variables are set in your Vercel project settings:

## Required Environment Variables

```
DATABASE_URL=file:./prod.db
AUTH_SECRET=<generate-a-secure-32-character-random-string>
AUTH_URL=https://<your-domain>.vercel.app
CUSTOMER_JWT_SECRET=<generate-a-separate-32-character-random-string>
ADMIN_EMAIL=admin@aig.local
ADMIN_PASSWORD=<set-a-secure-password-minimum-8-characters>
ADMIN_NAME=AIG Administrator
```

## Generating Secrets

For `AUTH_SECRET` and `CUSTOMER_JWT_SECRET`, generate random 32-character hexadecimal strings:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Run this command twice to generate two different secrets.

## How to Set on Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the appropriate value
4. Redeploy the project

## Troubleshooting

If you see "There was a problem with the server configuration" error:

1. Verify all required environment variables are set on Vercel
2. Check that `ADMIN_PASSWORD` is at least 8 characters
3. Ensure `AUTH_SECRET` is exactly 32 hexadecimal characters
4. Check Vercel deployment logs for specific errors
