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
- Digital Ocean account (for production deployment)

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lutruwita2.git
   cd lutruwita2
   ```

2. Set up environment variables:
   ```bash
   # Copy environment templates
   cp docs/ENV_VARIABLES.template.md docs/ENV_VARIABLES.md
   cp docs/DEPLOYMENT.template.md docs/DEPLOYMENT.md
   
   # Create local env files
   cp .env.production.template .env.local
   cd server && cp .env.local.template .env
   ```
   
   See [docs/SENSITIVE_DOCS.md](docs/SENSITIVE_DOCS.md) for details on handling sensitive configuration files.

3. Install dependencies:
   ```bash
   npm install
   cd server && npm install
   ```

4. Start development servers:
   ```bash
   # In one terminal
   npm run dev
   
   # In another terminal
   cd server && npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Production Deployment

For Digital Ocean deployment, see [docs/DEPLOYMENT.template.md](docs/DEPLOYMENT.template.md) for detailed instructions.

For Vercel deployment, see [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) and [docs/VERCEL_MIGRATION_MASTERPLAN.md](docs/VERCEL_MIGRATION_MASTERPLAN.md) for the serverless migration process.

## Project Structure

```
.
├── docs/               # Project documentation
├── public/            # Static assets
├── server/            # Backend server
│   ├── src/           # Server source code
│   └── package.json   # Server dependencies
├── src/               # Frontend source code
│   ├── components/    # React components
│   ├── features/      # Feature modules
│   ├── lib/           # Shared utilities
│   └── types/         # TypeScript types
└── package.json       # Frontend dependencies
```

## Contributing

1. Create a feature branch from `surface-detection`
2. Make your changes
3. Submit a pull request

## Security

- Never commit sensitive information or credentials
- Store all secrets in environment variables
- Use GitHub Secrets for CI/CD credentials
- See [docs/SENSITIVE_DOCS.md](docs/SENSITIVE_DOCS.md) for handling sensitive documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
