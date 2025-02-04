import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import './SearchControl.css';

class SearchControl implements mapboxgl.IControl {
  private container: HTMLDivElement;
  private map?: mapboxgl.Map;
  private isExpanded: boolean = false;
  private searchInput?: HTMLInputElement;
  private searchButton?: HTMLButtonElement;
  private searchResults?: HTMLDivElement;
  private handleClick: () => void;
  private handleInput: (e: Event) => void;
  private handleOutsideClick: (e: MouseEvent) => void;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group search-control';
    
    // Bind event handlers
    this.handleClick = this.toggleSearch.bind(this);
    this.handleInput = this.handleSearch.bind(this);
    this.handleOutsideClick = ((e: MouseEvent) => {
      if (this.isExpanded && !this.container.contains(e.target as Node)) {
        this.toggleSearch();
      }
    }).bind(this);
  }

  onAdd(map: mapboxgl.Map) {
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

  private toggleSearch() {
    this.isExpanded = !this.isExpanded;
    if (this.searchInput && this.searchResults) {
      if (this.isExpanded) {
        this.searchInput.classList.remove('hidden');
        this.searchInput.focus();
        this.container.classList.add('expanded');
      } else {
        this.searchInput.classList.add('hidden');
        this.searchResults.classList.add('hidden');
        this.container.classList.remove('expanded');
      }
    }
  }

  private async handleSearch(e: Event) {
    if (!this.searchInput || !this.searchResults || !this.map) return;
    
    const query = (e.target as HTMLInputElement).value;
    if (!query) {
      this.searchResults.classList.add('hidden');
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=AU`
      );
      const data = await response.json();
      
      this.searchResults.innerHTML = '';
      this.searchResults.classList.remove('hidden');
      
      data.features.forEach((feature: any) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = feature.place_name;
        item.addEventListener('click', () => {
          if (!this.map) return;
          
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
    } catch (error) {
      console.error('Search error:', error);
    }
  }
}

export default SearchControl;
