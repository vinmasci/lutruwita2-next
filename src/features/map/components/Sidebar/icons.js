import { Route, Upload, Save, FolderOpen, Camera, MapPin, Eraser, RefreshCw, Code, Settings2, FileText } from 'lucide-react';
export const SidebarIcons = {
    actions: {
        gpx: Route,
        mapOverview: FileText,  // New icon for Map Overview
        upload: Upload,
        save: Save,
        load: FolderOpen,
        photos: Camera,
        poi: MapPin,
        clear: Eraser,
        embed: Code,
        line: Settings2
    }
};

export const RefreshIcon = RefreshCw;
