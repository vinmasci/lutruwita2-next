import mapboxgl from 'mapbox-gl';
import './SearchControl.css';
class SearchControl {
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
        Object.defineProperty(this, "isExpanded", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "searchInput", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "searchButton", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "searchResults", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "handleClick", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "handleInput", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "handleOutsideClick", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.container = document.createElement('div');
        this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group search-control';
        // Bind event handlers
        this.handleClick = this.toggleSearch.bind(this);
        this.handleInput = this.handleSearch.bind(this);
        this.handleOutsideClick = ((e) => {
            if (this.isExpanded && !this.container.contains(e.target)) {
                this.toggleSearch();
            }
        }).bind(this);
    }
    onAdd(map) {
        this.map = map;
        // Create search button
        this.searchButton = document.createElement('button');
        this.searchButton.type = 'button';
        this.searchButton.className = 'search-control-button';
        this.searchButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    `;
        // Create search input (initially hidden)
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'search-control-input hidden';
        this.searchInput.placeholder = 'Search location...';
        // Create search results container (initially hidden)
        this.searchResults = document.createElement('div');
        this.searchResults.className = 'search-control-results hidden';
        // Add event handlers
        this.searchButton.addEventListener('click', this.handleClick);
        this.searchInput.addEventListener('input', this.handleInput);
        document.addEventListener('click', this.handleOutsideClick);
        // Add elements to container
        this.container.appendChild(this.searchButton);
        this.container.appendChild(this.searchInput);
        this.container.appendChild(this.searchResults);
        return this.container;
    }
    onRemove() {
        if (this.searchButton) {
            this.searchButton.removeEventListener('click', this.handleClick);
        }
        if (this.searchInput) {
            this.searchInput.removeEventListener('input', this.handleInput);
        }
        document.removeEventListener('click', this.handleOutsideClick);
        this.container.parentNode?.removeChild(this.container);
        this.map = undefined;
    }
    toggleSearch() {
        this.isExpanded = !this.isExpanded;
        if (this.searchInput && this.searchResults) {
            if (this.isExpanded) {
                this.searchInput.classList.remove('hidden');
                this.searchInput.focus();
                this.container.classList.add('expanded');
            }
            else {
                this.searchInput.classList.add('hidden');
                this.searchResults.classList.add('hidden');
                this.container.classList.remove('expanded');
            }
        }
    }
    async handleSearch(e) {
        if (!this.searchInput || !this.searchResults || !this.map)
            return;
        const query = e.target.value;
        if (!query) {
            this.searchResults.classList.add('hidden');
            return;
        }
        try {
            const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=AU`);
            const data = await response.json();
            this.searchResults.innerHTML = '';
            this.searchResults.classList.remove('hidden');
            data.features.forEach((feature) => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = feature.place_name;
                item.addEventListener('click', () => {
                    if (!this.map)
                        return;
                    this.map.flyTo({
                        center: feature.center,
                        zoom: 14
                    });
                    this.searchInput?.classList.add('hidden');
                    this.searchResults?.classList.add('hidden');
                    this.container.classList.remove('expanded');
                    this.isExpanded = false;
                });
                this.searchResults?.appendChild(item);
            });
        }
        catch (error) {
            console.error('Search error:', error);
        }
    }
}
export default SearchControl;
