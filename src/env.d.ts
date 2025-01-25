/// <reference types="vite/client" />

declare namespace Express {
  interface User {
    id: string;
    role: string;
  }

  interface Request {
    user?: User;
  }
}

interface ImportMetaEnv {
  readonly VITE_PUBLIC_MAPBOX_TOKEN: string;
  // Add other environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
