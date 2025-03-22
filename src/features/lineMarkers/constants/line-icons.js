// Line marker icon definitions
export const LINE_ICONS = [
  // Original Line Icons
  { name: 'ArrowUpRight', label: 'Arrow Up Right', style: { color: '#27ae60' }, category: 'original' },
  { name: 'Route', label: 'Route', style: { color: '#3498db' }, category: 'original' },
  { name: 'RailTrail', label: 'Rail Trail', style: { color: '#8e44ad' }, category: 'original' },
  { name: 'Mountain', label: 'Mountain', style: { color: '#e67e22' }, category: 'original' },
  { name: 'TreePine', label: 'Forest', style: { color: '#2ecc71' }, category: 'original' },
  { name: 'Binoculars', label: 'Viewpoint', style: { color: '#16a085' }, category: 'original' },
  { name: 'Swimming', label: 'Water', style: { color: '#3498db' }, category: 'original' },
  { name: 'Flag', label: 'Point of Interest', style: { color: '#e74c3c' }, category: 'original' },
  
  // Accommodation Icons
  { name: 'Tent', label: 'Campsite', style: { color: '#8e44ad' }, category: 'accommodation' },
  { name: 'Huts', label: 'Huts', style: { color: '#8e44ad' }, category: 'accommodation' },
  { name: 'Car', label: 'Caravan Park', style: { color: '#8e44ad' }, category: 'accommodation' },
  { name: 'BedDouble', label: 'Accommodation', style: { color: '#8e44ad' }, category: 'accommodation' },
  
  // Food & Drink Icons
  { name: 'Utensils', label: 'Restaurant', style: { color: '#ffa801' }, category: 'food-drink' },
  { name: 'Coffee', label: 'Cafe', style: { color: '#ffa801' }, category: 'food-drink' },
  { name: 'Pizza', label: 'Roadhouse', style: { color: '#ffa801' }, category: 'food-drink' },
  { name: 'ShoppingCart', label: 'Supermarket', style: { color: '#ffa801' }, category: 'food-drink' },
  { name: 'Store', label: 'General Store', style: { color: '#ffa801' }, category: 'food-drink' },
  { name: 'Beer', label: 'Bar/Pub', style: { color: '#ffa801' }, category: 'food-drink' },
  { name: 'Wine', label: 'Winery', style: { color: '#ffa801' }, category: 'food-drink' },
  { name: 'Droplet', label: 'Drinking Water', style: { color: '#3498db' }, category: 'food-drink' },
  
  // Town Services Icons
  { name: 'Hospital', label: 'Medical Facility', style: { color: '#0a3d62' }, category: 'town-services' },
  { name: 'Toilet', label: 'Restroom', style: { color: '#0a3d62' }, category: 'town-services' },
  { name: 'ShowerHead', label: 'Shower', style: { color: '#0a3d62' }, category: 'town-services' },
  { name: 'ParkingSquare', label: 'Parking', style: { color: '#0a3d62' }, category: 'town-services' },
  { name: 'Fuel', label: 'Service Station', style: { color: '#0a3d62' }, category: 'town-services' },
  { name: 'Mail', label: 'Post Office', style: { color: '#0a3d62' }, category: 'town-services' },
  { name: 'Bike', label: 'Bike Shop', style: { color: '#0a3d62' }, category: 'town-services' },
  
  // Transportation Icons
  { name: 'Bus', label: 'Bus Terminal', style: { color: '#20c997' }, category: 'transportation' },
  { name: 'TrainStation', label: 'Train Station', style: { color: '#20c997' }, category: 'transportation' },
  { name: 'Plane', label: 'Airport', style: { color: '#20c997' }, category: 'transportation' },
  { name: 'Ship', label: 'Ferry', style: { color: '#20c997' }, category: 'transportation' },
  
  // Event Information Icons
  { name: 'PlayCircle', label: 'Start', style: { color: '#ef5777' }, category: 'event-information' },
  { name: 'StopCircle', label: 'Finish', style: { color: '#ef5777' }, category: 'event-information' },
  { name: 'Stethoscope', label: 'Aid Station', style: { color: '#ef5777' }, category: 'event-information' },
  { name: 'BatteryCharging', label: 'Rest Stop', style: { color: '#ef5777' }, category: 'event-information' },
  { name: 'Wrench', label: 'Bike Hub', style: { color: '#ef5777' }, category: 'event-information' },
  { name: 'X', label: 'Closed', style: { color: '#ef5777' }, category: 'event-information' }
];

// Icon path mappings (using Font Awesome classes)
export const LINE_ICON_PATHS = {
  // Original Line Icons
  ArrowUpRight: 'fa-solid fa-arrow-up-right',
  Route: 'fa-solid fa-route',
  RailTrail: 'fa-solid fa-train',
  Mountain: 'fa-solid fa-mountain',
  TreePine: 'fa-solid fa-tree',
  Binoculars: 'fa-solid fa-binoculars',
  Swimming: 'fa-solid fa-water',
  Flag: 'fa-solid fa-flag',
  
  // Accommodation Icons
  Tent: 'fa-regular fa-campground',
  Huts: 'fa-solid fa-cabin',
  Car: 'fa-solid fa-caravan',
  BedDouble: 'fa-solid fa-bed',
  
  // Food & Drink Icons
  Utensils: 'fa-solid fa-utensils',
  Coffee: 'fa-solid fa-mug-hot',
  Pizza: 'fa-solid fa-burger',
  ShoppingCart: 'fa-solid fa-cart-shopping',
  Store: 'fa-solid fa-store',
  Beer: 'fa-solid fa-beer-mug-empty',
  Wine: 'fa-solid fa-wine-glass',
  Droplet: 'fa-solid fa-droplet',
  
  // Town Services Icons
  Hospital: 'fa-solid fa-hospital',
  Toilet: 'fa-sharp fa-solid fa-restroom',
  ShowerHead: 'fa-solid fa-shower',
  ParkingSquare: 'fa-solid fa-square-parking',
  Fuel: 'fa-solid fa-gas-pump',
  Mail: 'fa-solid fa-envelope',
  Bike: 'fa-solid fa-bicycle',
  
  // Transportation Icons
  Bus: 'fa-solid fa-bus',
  TrainStation: 'fa-solid fa-train',
  Plane: 'fa-solid fa-plane',
  Ship: 'fa-solid fa-ship',
  
  // Event Information Icons
  PlayCircle: 'fa-solid fa-circle-play',
  StopCircle: 'fa-solid fa-flag-checkered',
  Stethoscope: 'fa-solid fa-kit-medical',
  BatteryCharging: 'fa-solid fa-battery-half',
  Wrench: 'fa-solid fa-wrench',
  X: 'fa-solid fa-xmark'
};

// Get icons by category
export const getIconsByCategory = (category) => {
  return LINE_ICONS.filter(icon => icon.category === category);
};
