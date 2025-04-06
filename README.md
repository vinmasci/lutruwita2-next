# Lutruwita 2

A web application for visualizing and sharing hiking routes in Tasmania.

## Features

- Interactive map interface with route visualization
- GPX file upload and processing
- Photo upload and management
- Points of Interest (POI) management
- Route descriptions and metadata
- Elevation profiles
- Weather information
- Presentation mode for sharing routes

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB
- Redis
- Auth0 account
- Mapbox account
- Vercel CLI (for local development and deployment)

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lutruwita2.git
   cd lutruwita2
   ```

2. Set up environment variables:
   ```bash
   # Create local env file for the frontend
   cp .env.vercel.template .env.local 
   # Note: Vercel CLI (`vercel dev`) might require additional environment setup 
   # depending on your Vercel project configuration (e.g., linked project env variables).
   # Populate .env.local with your local development keys (Mapbox, Auth0, MongoDB connection string, etc.)
   ```

3. Install dependencies:
   ```bash
   # Install root dependencies (frontend)
   npm install
   
   # Install API dependencies
   cd api && npm install
   cd .. 
   ```

4. Start development servers:
   ```bash
   # Run frontend and API functions locally using Vercel CLI
   vercel dev 
   # Or run frontend separately if needed: npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000 (or the port specified by `vercel dev`)
- Backend API: Served by `vercel dev` under the `/api` path (e.g., http://localhost:3000/api/routes)

### Production Deployment (Vercel)

Deployment is handled via Vercel. Connect your Git repository to a Vercel project. See [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for more details if available.

## Project Structure

```
.
├── api/               # Vercel Serverless Functions (Backend)
│   ├── gpx/
│   ├── health/
│   ├── lib/
│   ├── models/
│   ├── photos/
│   ├── poi/
│   ├── routes/
│   ├── user/
│   └── package.json   # API dependencies
├── docs/              # Project documentation
├── public/            # Static assets served by Vite
├── src/               # Frontend source code (React/Vite)
│   ├── components/    # Reusable UI components
│   ├── features/      # Feature modules (map, poi, photo, etc.)
│   ├── lib/           # Shared utilities/libraries
│   ├── types/         # TypeScript types
│   └── App.jsx        # Main application component
│   └── main.jsx       # Entry point
├── .env.local         # Local environment variables for frontend
├── package.json       # Frontend dependencies and scripts
├── vercel.json        # Vercel deployment configuration
└── vite.config.ts     # Vite configuration
```

## Contributing

1. Create a feature branch from `surface-detection`
2. Make your changes
3. Submit a pull request

## Security

- Never commit sensitive information or credentials
- Store all secrets in environment variables
- Use GitHub Secrets for CI/CD credentials

## License

(Specify License if applicable)
