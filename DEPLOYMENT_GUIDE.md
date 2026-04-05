# Deployment Guide (Railway + Vercel)

## Backend (Railway)

1. Push project to GitHub.
2. In Railway, create a new project from the repository.
3. Set root directory to server.
4. Add environment variables:
   - MONGODB_URI
   - JWT_SECRET
   - FRONTEND_ORIGIN
   - PORT (optional, Railway also provides one)
5. Deploy.
6. Verify:
   - GET https://<railway-domain>/api/health

## Frontend (Vercel)

1. In Vercel, import same repo.
2. Set root directory to client.
3. Add environment variable VITE_API_BASE_URL with Railway API URL.
4. Deploy.
5. Open app and login with:
   - admin / admin123

## Post Deploy Checklist

1. Login works.
2. Add customer works.
3. Create booking works.
4. Mark delivered works.
5. Invoice preview + print works.
6. Delivery register load + print works.
7. Monthly summary load + print works.
