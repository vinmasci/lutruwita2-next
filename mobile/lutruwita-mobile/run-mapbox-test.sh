#!/bin/bash

# Script to run the Mapbox test app
echo "=== Running Mapbox Test App ==="

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
  echo "Error: Please run this script from the root of the Lutruwita Mobile project"
  exit 1
fi

# Temporarily modify App.tsx to use the test app
echo "Backing up original App.tsx..."
cp src/App.tsx src/App.tsx.backup

echo "Creating temporary App.tsx with test component..."
cat > src/App.tsx << 'EOF'
import React from 'react';
import TestApp from './components/map/TestApp';

export default function App() {
  return <TestApp />;
}
EOF

# Run the app
echo "Starting Expo development server..."
npx expo start --clear

# Restore the original App.tsx when done
echo "Restoring original App.tsx..."
mv src/App.tsx.backup src/App.tsx

echo "=== Test completed ==="
