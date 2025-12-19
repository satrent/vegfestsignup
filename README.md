# Veg Fest Signup System

A comprehensive registration system for VegFest exhibitors and sponsors with dual authentication.

## Project Structure

```
vegfestsignup/
├── ui/              # Angular frontend
│   ├── src/
│   ├── package.json
│   └── angular.json
├── api/             # Node.js/Express backend
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Tech Stack

### Frontend (ui/)
- **Angular 18** - Modern web framework
- **TypeScript** - Type-safe JavaScript
- **RxJS** - Reactive programming

### Backend (api/)
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Passport.js** - Authentication middleware
- **JWT** - Token-based authentication

## Features

### Authentication
- **Participants**: Email-based passwordless login with verification codes
- **Admins**: Google OAuth integration
- Role-based access control (PARTICIPANT, ADMIN, WEB_ADMIN)

### Registration Management
- Create and manage exhibitor/sponsor registrations
- Admin approval workflow
- Website status tracking

### User Management
- Admin dashboard for user role management
- Email verification system
- Secure session management

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB running locally or connection string
- Google Cloud Project (for OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd vegfestsignup
   ```

2. **Install API dependencies**
   ```bash
   cd api
   npm install
   ```

3. **Install UI dependencies**
   ```bash
   cd ../ui
   npm install
   ```

4. **Configure environment variables**
   ```bash
   cd ../api
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Development

1. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

2. **Start the API server**
   ```bash
   cd api
   npm run dev
   ```
   Server runs on http://localhost:3000

3. **Start the Angular app** (in a new terminal)
   ```bash
   cd ui
   npm start
   ```
   App runs on http://localhost:4200

### Environment Configuration

Create `api/.env` with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/vegfest

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:4200

# Email (console for development, aws-ses for production)
EMAIL_SERVICE=console
```

## API Endpoints

### Authentication
- `POST /api/auth/request-code` - Request email verification code
- `POST /api/auth/verify-code` - Verify code and login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Registrations
- `GET /api/registrations` - Get all registrations (admin)
- `GET /api/registrations/my-registrations` - Get user's registrations
- `POST /api/registrations` - Create registration
- `PATCH /api/registrations/:id/status` - Update status (admin)
- `PATCH /api/registrations/:id/website-status` - Update website status (admin)

### Admin
- `GET /api/admin/users` - Get all users (admin)
- `PATCH /api/admin/users/:id/role` - Update user role (admin)
- `PATCH /api/admin/users/:id/deactivate` - Deactivate user (admin)

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `http://localhost:4200`
   - `http://localhost:3000`
6. Add authorized redirect URIs:
   - `http://localhost:4200/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

## Database Schema

### Users
- email (unique, indexed)
- firstName, lastName
- role (PARTICIPANT | ADMIN | WEB_ADMIN)
- emailVerified
- googleId (for OAuth users)
- timestamps

### Registrations
- userId (reference to User)
- organizationName
- contact info (firstName, lastName, email, phone)
- address info (address, city, state, zip)
- description, website, logoUrl
- type (Exhibitor | Sponsor | Both)
- status (Pending | Approved | Rejected)
- websiteStatus (Pending | Added)
- timestamps

### VerificationCodes
- email
- code (6-digit)
- expiresAt (TTL index)
- attempts
- verified

## Testing

```bash
# API tests
cd api
npm test

# UI tests
cd ui
npm test
```

## Deployment

### Backend
- Deploy to Railway, Render, or AWS
- Set environment variables
- Ensure MongoDB connection string is configured

### Frontend
- Build: `cd ui && npm run build`
- Deploy to Vercel, Netlify, or GitHub Pages

## License

MIT

## Support

For issues or questions, contact [your-email]
