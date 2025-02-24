export const parseGpx = (gpxText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
    const segments = [];
    const features = [];
    const trackPoints = Array.from(xmlDoc.getElementsByTagName('trkpt'));
    trackPoints.forEach((point, index) => {
        const lat = parseFloat(point.getAttribute('lat') || '0');
        const lon = parseFloat(point.getAttribute('lon') || '0');
        const ele = parseFloat(point.getElementsByTagName('ele')[0]?.textContent || '0');
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lon, lat, ele]
            },
            properties: {
                index,
                elevation: ele
            }
        });
        if (index > 0) {
            const prevPoint = trackPoints[index - 1];
            const prevLat = parseFloat(prevPoint.getAttribute('lat') || '0');
            const prevLon = parseFloat(prevPoint.getAttribute('lon') || '0');
            const prevEle = parseFloat(prevPoint.getElementsByTagName('ele')[0]?.textContent || '0');
            const distance = calculateDistance(prevLat, prevLon, lat, lon);
            const elevationGain = Math.max(0, ele - prevEle);
            const elevationLoss = Math.max(0, prevEle - ele);
            segments.push({
                surface: 'unknown',
                distance,
                elevationGain,
                elevationLoss
            });
        }
    });
    return {
        segments,
        geojson: {
            type: 'FeatureCollection',
            features
        }
    };
};
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
