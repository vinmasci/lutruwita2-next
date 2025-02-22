import { ProcessedRoute } from '../../map/types/route.types';

export interface DragEndEvent {
  active: { id: string };
  over: { id: string } | null;
}

export interface ReorderRoutesFunction {
  (oldIndex: number, newIndex: number): void;
}

export interface SortableRouteItemProps {
  route: ProcessedRoute;
  index: number;
}

export interface DraggableRouteProps extends SortableRouteItemProps {
  children: React.ReactNode;
}
