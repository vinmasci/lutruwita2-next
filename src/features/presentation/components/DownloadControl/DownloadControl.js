import { downloadRouteAsGpx } from '../../../../utils/gpx/export';
import { useRouteContext } from '../../../map/context/RouteContext';

class DownloadControl {
  constructor(currentRoute) {
    this.container = document.createElement('div');
    this.map = undefined;
    this.currentRoute = currentRoute;
  }

  onAdd(map) {
    this.map = map;
    
    // Create control container
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-download';
    
    // Add custom styles to header
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .mapboxgl-ctrl-download {
        margin-top: 10px !important;
        z-index: 2000 !important;
      }
      .download-button {
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
      .download-button:hover {
        opacity: 1;
        border-bottom-color: #4264fb;
      }
      .download-tooltip {
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
      .download-button:hover .download-tooltip {
        opacity: 1;
      }
    `;
    document.head.appendChild(styleSheet);
    
    // Create download button
    const button = document.createElement('button');
    button.className = 'download-button';
    button.setAttribute('aria-label', 'Download GPX');
    button.innerHTML = `
      <i class="fa-solid fa-download"></i>
      <span class="download-tooltip">Download GPX</span>
    `;
    
    // Add click event listener
    button.addEventListener('click', () => {
      if (this.currentRoute) {
        downloadRouteAsGpx(this.currentRoute);
      } else {
        console.error('No route available for download');
      }
    });
    
    this.container.appendChild(button);
    return this.container;
  }

  onRemove() {
    this.container.parentNode?.removeChild(this.container);
    this.map = undefined;
  }
  
  // Method to update the current route
  updateCurrentRoute(route) {
    this.currentRoute = route;
  }
}

// Higher-order component to connect the control to the route context
export const createDownloadControl = (currentRoute) => {
  return new DownloadControl(currentRoute);
};

export default createDownloadControl;
