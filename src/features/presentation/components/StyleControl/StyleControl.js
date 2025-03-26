export const MAP_STYLES = {
    satellite: {
        url: 'mapbox://styles/mapbox/satellite-streets-v12',
        icon: '<i class="fa-solid fa-earth-americas"></i>',
        label: 'Satellite'
    },
    outdoors: {
        url: 'mapbox://styles/mapbox/outdoors-v12',
        icon: '<i class="fa-duotone fa-solid fa-mountain"></i>',
        label: 'Outdoors'
    },
    light: {
        url: 'mapbox://styles/mapbox/light-v11',
        icon: '<i class="fa-solid fa-sun"></i>',
        label: 'Light'
    },
    night: {
        url: 'mapbox://styles/mapbox/navigation-night-v1',
        icon: '<i class="fa-solid fa-moon"></i>',
        label: 'Night'
    }
};
class StyleControl {
    constructor() {
        Object.defineProperty(this, "container", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "map", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "currentStyle", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'satellite'
        });
        this.container = document.createElement('div');
    }
    recreateCustomLayers() {
        if (!this.map)
            return;
        // Store existing GPX sources and layers before style change
        const style = this.map.getStyle();
        if (!style)
            return;
        const gpxSources = {};
        const gpxLayers = {};
        // Find all GPX-related sources and layers
        if (style.sources) {
            Object.entries(style.sources).forEach(([id, source]) => {
                if (id.includes('route-') || id.includes('unpaved-section-')) {
                    gpxSources[id] = source;
                }
            });
        }
        if (style.layers) {
            style.layers.forEach(layer => {
                if (layer.id.includes('route-') || layer.id.includes('unpaved-section-')) {
                    gpxLayers[layer.id] = layer;
                }
            });
        }
        // Wait for style to load
        this.map.once('style.load', () => {
            // Re-add terrain source
            if (!this.map?.getSource('mapbox-dem')) {
                this.map?.addSource('mapbox-dem', {
                    type: 'raster-dem',
                    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    tileSize: 512,
                    maxzoom: 14
                });
            }
            // Re-apply terrain settings with device-specific exaggeration
            const isMobile = window.innerWidth <= 768;
            console.log('[StyleControl] Re-applying terrain with device detection:', { 
                isMobile, 
                width: window.innerWidth,
                projection: this.map?.getProjection()?.name
            });
            
            this.map?.setTerrain({
                source: 'mapbox-dem',
                exaggeration: isMobile ? 1.0 : 1.5 // Less exaggeration on mobile for better performance
            });
            // Re-add custom roads layer
            if (!this.map?.getSource('australia-roads')) {
                const tileUrl = 'https://api.maptiler.com/tiles/5dd3666f-1ce4-4df6-9146-eda62a200bcb/{z}/{x}/{y}.pbf?key=DFSAZFJXzvprKbxHrHXv';
                this.map?.addSource('australia-roads', {
                    type: 'vector',
                    tiles: [tileUrl],
                    minzoom: 12,
                    maxzoom: 14
                });
            }
            // Re-add roads layer
            if (!this.map?.getLayer('custom-roads')) {
                this.map?.addLayer({
                    id: 'custom-roads',
                    type: 'line',
                    source: 'australia-roads',
                    'source-layer': 'lutruwita',
                    minzoom: 12,
                    maxzoom: 14,
                    paint: {
                        'line-opacity': 0, // Set opacity to 0 for all road types to hide them
                        'line-color': [
                            'match',
                            ['get', 'surface'],
                            ['paved', 'asphalt', 'concrete', 'compacted', 'sealed', 'bitumen', 'tar'],
                            '#888888', // Fallback color for asphalt roads (won't be visible due to opacity 0)
                            ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth'],
                            '#D35400', // Keep orange color for gravel roads
                            '#888888'
                        ],
                        'line-width': [
                            'match',
                            ['get', 'surface'],
                            ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth'],
                            4, // Wider line for gravel roads
                            2  // Default width for other roads
                        ]
                    }
                });
            }
            // Re-add GPX sources and layers
            Object.entries(gpxSources).forEach(([id, source]) => {
                if (!this.map?.getSource(id)) {
                    this.map?.addSource(id, source);
                }
            });
            Object.entries(gpxLayers).forEach(([id, layer]) => {
                if (!this.map?.getLayer(id)) {
                    this.map?.addLayer(layer);
                }
            });
        });
    }
    switchStyle(style) {
        if (!this.map)
            return;
        this.currentStyle = style;
        // Update all buttons to remove active state
        const buttons = this.container.querySelectorAll('.style-button');
        buttons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-style') === style) {
                button.classList.add('active');
            }
        });
        // Switch map style
        this.map.setStyle(MAP_STYLES[style].url);
        this.recreateCustomLayers();
    }
    onAdd(map) {
        this.map = map;
        // Create control container
        this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-styles';
        // Add custom styles to header
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
      .mapboxgl-ctrl-styles {
        margin-top: 10px !important;
        z-index: 2000 !important;
      }
      .style-button {
        width: 32px;
        height: 32px;
        padding: 5px;
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border-bottom: 2px solid transparent;
        opacity: 0.7;
        transition: all 0.2s ease;
        color: white;
      }
      .style-button:hover {
        opacity: 1;
      }
      .style-button.active {
        opacity: 1;
        border-bottom-color: #4264fb;
      }
      .mapboxgl-ctrl button.style-button+button.style-button {
        border-top: none;
      }
      .style-tooltip {
        position: absolute;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
        left: 100%;
        margin-left: 10px;
        top: 50%;
        transform: translateY(-50%);
      }
      .style-button:hover .style-tooltip {
        opacity: 1;
      }
    `;
        document.head.appendChild(styleSheet);
        // Create style buttons
        Object.entries(MAP_STYLES).forEach(([key, style]) => {
            const button = document.createElement('button');
            button.className = `style-button ${key === this.currentStyle ? 'active' : ''}`;
            button.setAttribute('data-style', key);
            button.innerHTML = `
        ${style.icon}
        <span class="style-tooltip">${style.label}</span>
      `;
            button.addEventListener('click', () => this.switchStyle(key));
            this.container.appendChild(button);
        });
        return this.container;
    }
    onRemove() {
        this.container.parentNode?.removeChild(this.container);
        this.map = undefined;
    }
}
export default StyleControl;
