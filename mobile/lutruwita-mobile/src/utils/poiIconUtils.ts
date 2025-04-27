/**
 * Utility functions for POI icons
 * 
 * This file contains utility functions for mapping POI icon names to custom FontAwesome PNG icons
 * and other POI icon related functionality.
 */

/**
 * Maps icon names to their file paths for use with MapboxGL.Images
 * 
 * @returns A mapping of icon names to their require statements
 */
export const getIconMapping = () => {
  return {
    // Transportation icons
    'custom-rail': require('../../assets/icons/fontawesome/train-solid.png'),
    'custom-car': require('../../assets/icons/fontawesome/cars-solid.png'),
    'custom-parking': require('../../assets/icons/fontawesome/square-parking-solid.png'),
    'custom-bus': require('../../assets/icons/fontawesome/bus-solid.png'),
    'custom-airfield': require('../../assets/icons/fontawesome/plane-solid.png'),
    'custom-ferry': require('../../assets/icons/fontawesome/ship-solid.png'),
    'custom-bicycle': require('../../assets/icons/fontawesome/bicycle-solid.png'),
    
    // Accommodation icons
    'custom-campsite': require('../../assets/icons/fontawesome/campground-solid.png'),
    'custom-lodging': require('../../assets/icons/fontawesome/bed-solid.png'),
    
    // Food & Drink icons
    'custom-beer': require('../../assets/icons/fontawesome/beer-mug-empty-solid.png'),
    'custom-alcohol-shop': require('../../assets/icons/fontawesome/wine-glass-empty-solid.png'),
    'custom-cafe': require('../../assets/icons/fontawesome/mug-hot-solid.png'),
    'custom-restaurant': require('../../assets/icons/fontawesome/utensils-solid.png'),
    'custom-grocery': require('../../assets/icons/fontawesome/cart-shopping-solid.png'),
    'custom-drinking-water': require('../../assets/icons/fontawesome/droplet-solid.png'),
    'custom-fast-food': require('../../assets/icons/fontawesome/burger-lettuce-solid.png'),
    
    // Natural Features icons
    'custom-mountain': require('../../assets/icons/fontawesome/mountain-solid.png'),
    'custom-park-alt1': require('../../assets/icons/fontawesome/tree-solid.png'),
    'custom-viewpoint': require('../../assets/icons/fontawesome/binoculars-solid.png'),
    'custom-swimming': require('../../assets/icons/fontawesome/person-swimming-solid.png'),
    
    // Town Services icons
    'custom-toilet': require('../../assets/icons/fontawesome/restroom-solid.png'),
    'custom-hospital': require('../../assets/icons/fontawesome/hospital-solid.png'),
    'custom-telephone': require('../../assets/icons/fontawesome/envelope-solid.png'),
    'custom-information': require('../../assets/icons/fontawesome/sign-post-solid.png'),
    'custom-fuel': require('../../assets/icons/fontawesome/gas-pump-solid.png'),
    'custom-post': require('../../assets/icons/fontawesome/envelope-solid.png'),
    
    // Road Information icons
    'custom-danger': require('../../assets/icons/fontawesome/road-circle-exclamation-solid.png'),
    'custom-caution': require('../../assets/icons/fontawesome/triangle-person-digging-solid.png'),
    'custom-communications-tower': require('../../assets/icons/fontawesome/signal-slash-solid.png'),
    'custom-lift-gate': require('../../assets/icons/fontawesome/road-lock-solid.png'),
    'custom-gate': require('../../assets/icons/fontawesome/road-barrier-solid.png'),
    'custom-construction': require('../../assets/icons/fontawesome/traffic-cone-solid.png'),
    'custom-roadblock': require('../../assets/icons/fontawesome/ban-solid.png'),
    'custom-barrier': require('../../assets/icons/fontawesome/road-barrier-solid.png'),
    
    // Other icons
    'custom-historic': require('../../assets/icons/fontawesome/flag-solid.png'),
    'custom-elevator': require('../../assets/icons/fontawesome/person-hiking-solid.png'),
    'custom-water': require('../../assets/icons/fontawesome/water-solid.png'),
    'custom-star': require('../../assets/icons/fontawesome/play-solid.png'),
    'custom-racetrack': require('../../assets/icons/fontawesome/play-solid.png'),
    'custom-embassy': require('../../assets/icons/fontawesome/flag-solid.png'),
    'custom-hardware': require('../../assets/icons/fontawesome/wrench-solid.png'),
    'custom-attraction': require('../../assets/icons/fontawesome/binoculars-solid.png'),
    'custom-commercial': require('../../assets/icons/fontawesome/shop-solid.png'),
    'custom-marker': require('../../assets/icons/fontawesome/flag-solid.png'),
  };
};

/**
 * Maps our POI icon names to custom PNG icon names
 * 
 * This function maps the icon names from the web app to the custom PNG icons
 * used in the mobile app. It ensures all POIs have a corresponding icon.
 * 
 * @param iconName The icon name from our POI data
 * @returns The corresponding custom PNG icon name
 */
export const mapPoiToCustomIcon = (iconName: string): string => {
  if (!iconName) return 'custom-marker';

  // First try exact match (case-sensitive)
  switch (iconName) {
    // Transportation
    case 'TrainStation':
      return 'custom-rail'; // Using 'custom-rail' from your list
    case 'Car':
      return 'custom-car';
    case 'Parking':
    case 'ParkingSquare':
      return 'custom-parking';
    case 'Bus':
      return 'custom-bus';
    case 'Plane':
      return 'custom-airfield'; // Using 'custom-airfield' from your list
    case 'Ship':
      return 'custom-ferry';
    case 'Bike':
      return 'custom-bicycle';
      
    // Accommodation
    case 'Tent':
      return 'custom-campsite';
    case 'Huts':
    case 'Cabin':
      return 'custom-campsite'; // Using 'custom-campsite' for huts as well
    case 'BedDouble':
    case 'BedSingle':
      return 'custom-lodging';
      
    // Food & Drink
    case 'Beer':
      return 'custom-beer';
    case 'Wine':
      return 'custom-alcohol-shop';
    case 'Coffee':
      return 'custom-cafe';
    case 'Utensils':
      return 'custom-restaurant';
    case 'Store':
      return 'custom-grocery';
    case 'ShoppingCart':
      return 'custom-grocery'; // Using 'custom-grocery' for supermarket
    case 'Droplet':
      return 'custom-drinking-water'; // Using 'custom-drinking-water' from your list
    case 'Pizza':
      return 'custom-fast-food'; // Using 'custom-fast-food' for roadhouse
      
    // Natural Features
    case 'Mountain':
      return 'custom-mountain';
    case 'TreePine':
    case 'Trees':
      return 'custom-park-alt1'; // Using 'custom-park-alt1' for national park
    case 'Binoculars':
      return 'custom-viewpoint';
    case 'Swimming':
      return 'custom-swimming';
    case 'MountainBikePark':
      return 'custom-bicycle';
      
    // Town Services
    case 'Toilet':
      return 'custom-toilet';
    case 'Hospital':
      return 'custom-hospital';
    case 'Phone':
      return 'custom-telephone';
    case 'Info':
      return 'custom-information';
    case 'ShowerHead':
      return 'custom-toilet';
    case 'Fuel':
      return 'custom-fuel';
    case 'Mail':
      return 'custom-post';
      
    // Road Information
    case 'TrafficCone':
    case 'RoadHazard':
    case 'Hazard':
    case 'Warning':
      return 'custom-danger'; // Using 'custom-danger' for rough surface
    case 'Octagon':
    case 'AlertOctagon':
      return 'custom-caution'; // Using 'custom-caution' for road closed
    case 'Reception':
    case 'Signal':
    case 'Network':
      return 'custom-communications-tower';
    case 'Lock':
      return 'custom-lift-gate'; // Using 'custom-lift-gate' for locked gate
    case 'Unlock':
      return 'custom-gate'; // Using 'custom-gate' for gate
    case 'Construction':
      return 'custom-construction';
    case 'ArrowUpRight':
      return 'custom-mountain';
    case 'HeavyTraffic':
      return 'custom-roadblock'; // Using 'custom-roadblock' as alternative
      
    // Trail Information
    case 'ChevronsRightLeft':
      return 'custom-danger'; // Using 'custom-danger' for rough surface
    case 'AudioWaveform':
      return 'custom-bicycle';
    case 'Route':
      return 'custom-historic'; // Using 'custom-historic' for trailhead
    case 'RailTrail':
      return 'custom-rail'; // Using 'custom-rail' for rail trail
    case 'HikeABike':
      return 'custom-elevator'; // Using 'custom-elevator' as alternative
    case 'WaterCrossing':
      return 'custom-water';
    case 'RemoteArea':
      return 'custom-star'; // Using 'custom-star' as fallback
      
    // Event Information
    case 'PlayCircle':
      return 'custom-racetrack'; // Using 'custom-racetrack' for start
    case 'StopCircle':
      return 'custom-racetrack'; // Using 'custom-racetrack' for finish
    case 'Stethoscope':
      return 'custom-hospital';
    case 'BatteryCharging':
      return 'custom-commercial'; // Using 'custom-commercial' as alternative
    case 'Wrench':
      return 'custom-hardware'; // Using 'custom-hardware' for bike hub
    case 'Flag':
      return 'custom-embassy'; // Using 'custom-embassy' for checkpoint
    case 'X':
      return 'custom-barrier';
    case 'CircleDot':
      return 'custom-star';
      
    // Other
    case 'Camera':
      return 'custom-attraction'; // Using 'custom-attraction' for viewpoint
    case 'Landmark':
      return 'custom-attraction';
    case 'Building':
      return 'custom-commercial';
    case 'Music':
      return 'custom-star'; // Using 'custom-star' as fallback
    case 'Ticket':
      return 'custom-commercial'; // Using 'custom-commercial' as alternative
    case 'ClimbCat1':
    case 'ClimbCat2':
    case 'ClimbCat3':
    case 'ClimbCat4':
    case 'ClimbHC':
      return 'custom-mountain';
  }
  
  // If no exact match, try lowercase
  switch (iconName.toLowerCase()) {
    case 'mappin':
    case 'pin':
      return 'custom-marker';
    case 'restaurant':
    case 'food':
    case 'utensils':
      return 'custom-restaurant';
    case 'coffee':
    case 'cafe':
      return 'custom-cafe';
    case 'hotel':
    case 'accommodation':
    case 'bed':
      return 'custom-lodging';
    case 'camping':
    case 'tent':
      return 'custom-campsite';
    case 'bike':
    case 'bicycle':
    case 'cycling':
      return 'custom-bicycle';
    case 'car':
      return 'custom-car';
    case 'parking':
      return 'custom-parking';
    case 'bus':
    case 'busstop':
      return 'custom-bus';
    case 'train':
    case 'railway':
    case 'trainstation':
      return 'custom-rail'; // Updated to 'custom-rail'
    case 'plane':
    case 'airport':
      return 'custom-airfield'; // Updated to 'custom-airfield'
    case 'ship':
    case 'ferry':
    case 'boat':
      return 'custom-ferry';
    case 'mountain':
    case 'peak':
    case 'summit':
      return 'custom-mountain';
    case 'tree':
    case 'forest':
    case 'park':
    case 'treepine':
      return 'custom-park-alt1'; // Updated to 'custom-park-alt1'
    case 'water':
    case 'river':
    case 'lake':
      return 'custom-water';
    case 'droplet':
      return 'custom-drinking-water'; // Updated to 'custom-drinking-water'
    case 'camera':
    case 'photo':
      return 'custom-attraction'; // Updated to 'custom-attraction'
    case 'viewpoint':
    case 'binoculars':
      return 'custom-viewpoint';
    case 'info':
    case 'information':
      return 'custom-information';
    case 'warning':
    case 'alert':
    case 'trafficcone':
    case 'roadhazard':
    case 'hazard':
      return 'custom-danger'; // Updated to 'custom-danger'
    case 'roadclosed':
    case 'octagon':
      return 'custom-caution'; // Updated to 'custom-caution'
    case 'reception':
    case 'signal':
    case 'network':
    case 'communications':
    case 'tower':
      return 'custom-communications-tower';
    case 'landmark':
    case 'monument':
    case 'attraction':
      return 'custom-attraction'; // Updated to 'custom-attraction'
    case 'building':
    case 'structure':
      return 'custom-commercial'; // Updated to 'custom-commercial'
    case 'shopping':
    case 'shop':
    case 'store':
    case 'supermarket':
      return 'custom-grocery'; // Updated to 'custom-grocery'
    case 'beer':
    case 'pub':
    case 'bar':
      return 'custom-beer';
    case 'wine':
      return 'custom-alcohol-shop';
    case 'music':
    case 'event':
    case 'concert':
      return 'custom-star'; // Updated to 'custom-star'
    case 'ticket':
    case 'entrance':
      return 'custom-commercial'; // Updated to 'custom-commercial'
    case 'toilet':
    case 'restroom':
    case 'wc':
      return 'custom-toilet';
    case 'firstaid':
    case 'medical':
    case 'hospital':
      return 'custom-hospital';
    case 'phone':
    case 'telephone':
    case 'emergency':
      return 'custom-telephone';
    case 'shower':
    case 'showerhead':
      return 'custom-toilet';
    case 'fuel':
    case 'gas':
    case 'petrol':
      return 'custom-fuel';
    case 'mail':
    case 'post':
    case 'postoffice':
      return 'custom-post';
    case 'swimming':
    case 'swim':
      return 'custom-swimming';
    case 'construction':
    case 'roadwork':
      return 'custom-construction';
    case 'lock':
    case 'lockedgate':
      return 'custom-lift-gate'; // Updated to 'custom-lift-gate'
    case 'gate':
    case 'unlock':
      return 'custom-gate'; // Updated to 'custom-gate'
    case 'trail':
    case 'trailhead':
      return 'custom-historic'; // Updated to 'custom-historic'
    case 'route':
    case 'path':
      return 'custom-historic'; // Updated to 'custom-historic'
    case 'railtrail':
      return 'custom-rail'; // Updated to 'custom-rail'
    case 'hiking':
    case 'hikeabike':
      return 'custom-elevator'; // Updated to 'custom-elevator'
    case 'flag':
    case 'checkpoint':
      return 'custom-embassy';
    case 'start':
    case 'playcircle':
      return 'custom-racetrack'; // Updated to 'custom-racetrack'
    case 'finish':
    case 'stopcircle':
      return 'custom-racetrack'; // Updated to 'custom-racetrack'
    case 'aid':
    case 'stethoscope':
      return 'custom-hospital';
    case 'rest':
    case 'batterycharging':
      return 'custom-commercial'; // Updated to 'custom-commercial'
    case 'repair':
    case 'wrench':
    case 'bikehub':
      return 'custom-hardware';
    case 'roadblock':
    case 'heavytraffic':
      return 'custom-roadblock'; // Updated to 'custom-roadblock'
    case 'remotearea':
      return 'custom-star'; // Updated to 'custom-star'
    default:
      return 'custom-marker';
  }
};

/**
 * Get the color for a POI category
 * 
 * @param category The POI category
 * @returns The color for the category
 */
export const getPoiCategoryColor = (category: string): string => {
  switch (category) {
    case 'transportation':
      return '#4A89F3'; // Blue
    case 'accommodation':
      return '#FF9800'; // Orange
    case 'food-drink':
      return '#4CAF50'; // Green
    case 'natural-features':
      return '#8BC34A'; // Light Green
    case 'town-services':
      return '#9C27B0'; // Purple
    case 'road-information':
      return '#F44336'; // Red
    case 'trail-information':
      return '#FF6348'; // Orange-Red
    case 'event-information':
      return '#EF5777'; // Pink
    default:
      return '#3478F6'; // Default Blue
  }
};
