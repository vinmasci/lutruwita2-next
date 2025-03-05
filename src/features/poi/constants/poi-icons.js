export const POI_ICONS = [
    // Road Information
    { name: 'TrafficCone', category: 'road-information', label: 'Road Hazard', description: 'Warning for road hazards or dangerous conditions' },
    { name: 'Octagon', category: 'road-information', label: 'Road Closed', description: 'Road is closed to all traffic' },
    { name: 'AlertOctagon', category: 'road-information', label: 'Private Road', description: 'Private road or restricted access' },
    { name: 'Lock', category: 'road-information', label: 'Locked Gate', description: 'Gate is locked, no access' },
    { name: 'Unlock', category: 'road-information', label: 'Gate', description: 'Gate present, may need to open/close' },
    { name: 'Construction', category: 'road-information', label: 'Road Construction', description: 'Road works or construction area' },
    { name: 'ArrowUpRight', category: 'road-information', label: 'Steep Gradient', description: 'Steep uphill or downhill section' },
    { name: 'HeavyTraffic', category: 'road-information', label: 'Heavy Traffic', description: 'High traffic area' },
    { name: 'ChevronsRightLeft', category: 'road-information', label: 'Rough Surface', description: 'Rough or uneven road surface', style: { color: '#ff6348' } },
    { name: 'AudioWaveform', category: 'road-information', label: 'Single Track', description: 'Narrow single track section', style: { color: '#ff6348' } },
    { name: 'Route', category: 'road-information', label: 'Trailhead', description: 'Start of a trail or track', style: { color: '#ff6348' } },
    { name: 'RailTrail', category: 'road-information', label: 'Rail Trail', description: 'Former railway line converted to trail', style: { color: '#ff6348' } },
    { name: 'HikeABike', category: 'road-information', label: 'Hike-a-bike', description: 'Section where bike must be carried', style: { color: '#ff6348' } },
    { name: 'WaterCrossing', category: 'road-information', label: 'Water Crossing', description: 'River, stream, or water crossing', style: { color: '#ff6348' } },
    { name: 'RemoteArea', category: 'road-information', label: 'Remote Area', description: 'Remote or isolated area', style: { color: '#ff6348' } },
    // Accommodation
    { name: 'Tent', category: 'accommodation', label: 'Campsite', description: 'Camping area or campsite' },
    { name: 'Huts', category: 'accommodation', label: 'Huts', description: 'Mountain huts or shelters' },
    { name: 'Car', category: 'accommodation', label: 'Caravan Park', description: 'Caravan and camping park' },
    { name: 'BedDouble', category: 'accommodation', label: 'Accommodation', description: 'General accommodation' },
    // Food/Drink
    { name: 'Utensils', category: 'food-drink', label: 'Restaurant', description: 'Restaurant or dining', style: { color: '#ffa801' } },
    { name: 'Coffee', category: 'food-drink', label: 'Cafe', description: 'Cafe or coffee shop', style: { color: '#ffa801' } },
    { name: 'Pizza', category: 'food-drink', label: 'Roadhouse', description: 'Roadhouse or truck stop', style: { color: '#ffa801' } },
    { name: 'ShoppingCart', category: 'food-drink', label: 'Supermarket', description: 'Supermarket or grocery store', style: { color: '#ffa801' } },
    { name: 'Store', category: 'food-drink', label: 'General Store', description: 'General store or convenience store', style: { color: '#ffa801' } },
    { name: 'Beer', category: 'food-drink', label: 'Bar/Pub', description: 'Bar or pub', style: { color: '#ffa801' } },
    { name: 'Wine', category: 'food-drink', label: 'Winery', description: 'Winery or cellar door', style: { color: '#ffa801' } },
    // Natural Features
    { name: 'Mountain', category: 'natural-features', label: 'Summit', description: 'Mountain summit or peak' },
    { name: 'TreePine', category: 'natural-features', label: 'National Park', description: 'National park or reserve' },
    { name: 'Binoculars', category: 'natural-features', label: 'Viewpoint', description: 'Scenic viewpoint or lookout' },
    { name: 'MountainBikePark', category: 'natural-features', label: 'Mountain Bike Park', description: 'Mountain bike trails or park' },
    { name: 'Droplet', category: 'natural-features', label: 'Drinking Water', description: 'Drinking water available', style: { color: '#3498db' } },
    { name: 'Swimming', category: 'natural-features', label: 'Swimming', description: 'Swimming spot or water access', style: { color: '#3498db' } },
    // Town Services
    { name: 'Hospital', category: 'town-services', label: 'Medical Facility', description: 'Hospital or medical center' },
    { name: 'Toilet', category: 'town-services', label: 'Restroom', description: 'Public toilets' },
    { name: 'ShowerHead', category: 'town-services', label: 'Shower', description: 'Public or available showers' },
    { name: 'ParkingSquare', category: 'town-services', label: 'Parking', description: 'Parking area' },
    { name: 'Fuel', category: 'town-services', label: 'Service Station', description: 'Fuel or service station' },
    { name: 'Mail', category: 'town-services', label: 'Post Office', description: 'Post office' },
    { name: 'Bike', category: 'town-services', label: 'Bike Shop', description: 'Bicycle shop or repairs' },
    // Transportation
    { name: 'Bus', category: 'transportation', label: 'Bus Terminal', description: 'Bus station or stop' },
    { name: 'TrainStation', category: 'transportation', label: 'Train Station', description: 'Train station' },
    { name: 'Plane', category: 'transportation', label: 'Airport', description: 'Airport or airfield' },
    { name: 'Ship', category: 'transportation', label: 'Ferry', description: 'Ferry terminal or water transport' },
    // Event Information
    { name: 'PlayCircle', category: 'event-information', label: 'Start', description: 'Event start point', style: { color: '#ef5777' } },
    { name: 'StopCircle', category: 'event-information', label: 'Finish', description: 'Event finish point', style: { color: '#ef5777' } },
    { name: 'Stethoscope', category: 'event-information', label: 'Aid Station', description: 'Medical or aid station', style: { color: '#ef5777' } },
    { name: 'BatteryCharging', category: 'event-information', label: 'Rest Stop', description: 'Rest or recovery point', style: { color: '#ef5777' } },
    { name: 'Wrench', category: 'event-information', label: 'Bike Hub', description: 'Bike maintenance or repair', style: { color: '#ef5777' } },
    { name: 'Flag', category: 'event-information', label: 'Checkpoint', description: 'Event checkpoint', style: { color: '#ef5777' } },
    // Climb Categories
    { name: 'ClimbHC', category: 'climb-category', label: 'HC Climb', description: 'Hors Catégorie climb', style: { color: '#8B0000' } },
    { name: 'ClimbCat1', category: 'climb-category', label: 'Category 1 Climb', description: 'Category 1 climb', style: { color: '#FF0000' } },
    { name: 'ClimbCat2', category: 'climb-category', label: 'Category 2 Climb', description: 'Category 2 climb', style: { color: '#fa8231' } },
    { name: 'ClimbCat3', category: 'climb-category', label: 'Category 3 Climb', description: 'Category 3 climb', style: { color: '#f7b731' } },
    { name: 'ClimbCat4', category: 'climb-category', label: 'Category 4 Climb', description: 'Category 4 climb', style: { color: '#228B22' } }
];
export const getIconsByCategory = (category) => {
    return POI_ICONS.filter(icon => icon.category === category);
};
export const getIconDefinition = (name) => {
    return POI_ICONS.find(icon => icon.name === name);
};
