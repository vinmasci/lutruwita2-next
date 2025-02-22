import { ProcessedRoute } from '../types/route.types';

interface LoadedState {
  name: string;
  type: string;
  isPublic: boolean;
  persistentId: string;
}

interface SavedRoute {
  id: string;
  name: string;
  type: string;
  isPublic: boolean;
  persistentId: string;
}

interface RouteContextType {
  routes: ProcessedRoute[];
  currentRoute: ProcessedRoute | null;
  savedRoutes: SavedRoute[];
  saveCurrentState: (name: string, type: string, isPublic: boolean) => Promise<void>;
  listRoutes: () => Promise<void>;
  loadRoute: (id: string) => Promise<void>;
  deleteSavedRoute: (id: string) => Promise<void>;
  currentLoadedState: LoadedState | null;
  currentLoadedPersistentId: string | null;
  hasUnsavedChanges: boolean;
}

declare module '../../context/RouteContext.js' {
  const useRouteContext: () => RouteContextType;
  export { useRouteContext };
}
