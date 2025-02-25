// Simple script to test the API endpoint
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

for (const line of envLines) {
  // Skip comments and empty lines
  if (line.trim().startsWith('#') || !line.trim()) {
    continue;
  }
  
  // Parse key=value
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=');
  
  if (key && value) {
    process.env[key.trim()] = value.trim();
  }
}

console.log('Loaded environment variables from .env.local');

// Import the API handler
import routesHandler from './api/routes/index.js';

// Create a simple server
const server = http.createServer(async (req, httpRes) => {
  // Mock the request object
  req.url = '/api/routes';
  req.method = 'GET';
  req.headers = {
    'content-type': 'application/json',
    'authorization': 'Bearer mock-token' // Add a mock token to test our simplified JWT verification
  };
  req.query = {}; // Add empty query object
  
  // Mock the Express-style response object
  const res = {
    status: (code) => {
      httpRes.statusCode = code;
      return res;
    },
    json: (data) => {
      httpRes.setHeader('Content-Type', 'application/json');
      httpRes.end(JSON.stringify(data));
      return res;
    },
    send: (data) => {
      if (typeof data === 'object') {
        httpRes.setHeader('Content-Type', 'application/json');
        httpRes.end(JSON.stringify(data));
      } else {
        httpRes.setHeader('Content-Type', 'text/plain');
        httpRes.end(String(data));
      }
      return res;
    },
    setHeader: (name, value) => {
      httpRes.setHeader(name, value);
      return res;
    },
    end: (data) => {
      httpRes.end(data);
      return res;
    }
  };
  
  // Call the routes handler
  try {
    await routesHandler(req, res);
  } catch (error) {
    console.error('Error in route handler:', error);
    httpRes.statusCode = 500;
    httpRes.setHeader('Content-Type', 'application/json');
    httpRes.end(JSON.stringify({ error: error.message }));
  }
});

// Start the server
server.listen(3002, () => {
  console.log('Test server running at http://localhost:3002');
  console.log('Testing API endpoint...');
  
  // Make a request to the server
  http.get('http://localhost:3002', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      console.log('Response headers:', res.headers);
      try {
        const parsedData = JSON.parse(data);
        console.log('Response data:', JSON.stringify(parsedData, null, 2));
      } catch (e) {
        console.log('Raw response:', data);
      }
      
      // Close the server
      server.close(() => {
        console.log('Test server closed');
      });
    });
  }).on('error', (err) => {
    console.error('Error making request:', err);
    server.close();
  });
});
