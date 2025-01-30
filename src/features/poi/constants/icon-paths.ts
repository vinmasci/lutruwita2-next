// This file contains SVG path data for Lucide icons used in POI markers
export const ICON_PATHS: Record<string, string> = {
  // Road Information
  'triangle-alert': 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  'octagon-x': 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2zM15 9l-6 6M9 9l6 6',
  'octagon-alert': 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2zM12 8v4M12 16h.01',
  'lock-keyhole': 'M21 8v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2m18 0H3m9 4v4',
  'lock-keyhole-open': 'M21 8v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2m18 0H3m9 4v4',
  'waves': 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
  
  // Accommodation
  'tent': 'M19 20L10 4M5 20l9-16M3 20h18M12 12h-2',
  'caravan': 'M2 9v4c0 1.1.9 2 2 2h2m-4 0h20M4 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0zm16 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0zM8 17h8M2 5h4',
  'concierge-bell': 'M2 18h20M2 18a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2M9.5 6.5a2.5 2.5 0 0 1 5 0V8h-5V6.5Z',
  
  // Food/Drink
  'utensils': 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M19 2v20M14 2h10',
  'coffee': 'M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z',
  'droplet': 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
  
  // Natural Features
  'mountain-snow': 'M8 3l4 8 5-5 5 15H2L8 3z',
  'tree-pine': 'M17 14l-5-5-5 5',
  'binoculars': 'M17 5c0-1.7-1.3-3-3-3s-3 1.3-3 3m0 0v14M7 5c0-1.7 1.3-3 3-3s3 1.3 3 3m0 0v14M3 21h18',
  
  // Event Information
  'circle-play': 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M10 8l6 4-6 4V8z',
  'circle-stop': 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M9 9h6v6H9V9z',
  'briefcase-medical': 'M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm0 8h4v2h-4v-2z',
  
  // Town Services
  'hospital': 'M8 3v3a2 2 0 0 1-2 2H3m13-5v3a2 2 0 0 0 2 2h3M3 21h18M12 9v12M8 13h8',
  'toilet': 'M5 22h14M5 2h14M5 2v20M19 2v20M9 6h.01M15 6h.01',
  'shower-head': 'M4 4v16M4 4h16M4 12h16M4 20h16',
  
  // Transportation
  'bus-front': 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm2 14h12M9 18v2M15 18v2M4 10h16',
  'train-front': 'M8 3v3a2 2 0 0 1-2 2H3m13-5v3a2 2 0 0 0 2 2h3M3 21h18M12 9v12',
  'plane-takeoff': 'M2 22h20M14.5 2H18a2 2 0 0 1 2 2v8.5'
};
