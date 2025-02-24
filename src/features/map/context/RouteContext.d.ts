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
  updateRoute: (routeId: string, updates: Partial<ProcessedRoute>) => void;
  addRoute: (route: ProcessedRoute) => void;
  deleteRoute: (routeId: string) => void;
  setCurrentRoute: (route: ProcessedRoute | null) => void;
  focusRoute: (routeId: string) => void;
  unfocusRoute: (routeId: string) => void;
  reorderRoutes: (oldIndex: number, newIndex: number) => void;
  clearCurrentWork: () => void;
}

declare module './RouteContext.js' {
  const useRouteContext: () => RouteContextType;
  export { useRouteContext };
}
