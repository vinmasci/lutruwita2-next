class PitchControl {
  constructor(options = {}) {
    this.container = document.createElement('div');
    this.map = undefined;
    this.pitchUpButton = undefined;
    this.pitchDownButton = undefined;
    this.isMobile = options.isMobile !== undefined ? options.isMobile : window.innerWidth <= 768;
    this.minPitch = options.minPitch || 0;
    this.maxPitch = options.maxPitch || 85;
    this.pitchStep = options.pitchStep || 10;
  }

  onAdd(map) {
    this.map = map;
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-pitch';
    
    // Create pitch up button
    this.pitchUpButton = document.createElement('button');
    this.pitchUpButton.className = 'pitch-button pitch-up';
    this.pitchUpButton.setAttribute('title', 'Increase pitch (tilt)');
    this.pitchUpButton.innerHTML = '<span>▲</span>';
    this.pitchUpButton.addEventListener('click', () => {
      const currentPitch = this.map.getPitch();
      const newPitch = Math.min(currentPitch + this.pitchStep, this.maxPitch);
      this.map.easeTo({ pitch: newPitch, duration: 300 });
      
      console.log(`[PitchControl] Increasing pitch from ${currentPitch} to ${newPitch}`);
    });
    
    // Create pitch down button
    this.pitchDownButton = document.createElement('button');
    this.pitchDownButton.className = 'pitch-button pitch-down';
    this.pitchDownButton.setAttribute('title', 'Decrease pitch (tilt)');
    this.pitchDownButton.innerHTML = '<span>▼</span>';
    this.pitchDownButton.addEventListener('click', () => {
      const currentPitch = this.map.getPitch();
      const newPitch = Math.max(currentPitch - this.pitchStep, this.minPitch);
      this.map.easeTo({ pitch: newPitch, duration: 300 });
      
      console.log(`[PitchControl] Decreasing pitch from ${currentPitch} to ${newPitch}`);
    });
    
    // Add buttons to container
    this.container.appendChild(this.pitchUpButton);
    this.container.appendChild(this.pitchDownButton);
    
    // Add custom styles
    const style = document.createElement('style');
    style.textContent = `
      .mapboxgl-ctrl-pitch {
        margin-top: 10px !important;
      }
      .pitch-button {
        width: 36px !important;
        height: 36px !important;
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        padding: 0;
      }
      .pitch-button span {
        display: block;
        line-height: 1;
      }
      .pitch-up {
        border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
    `;
    document.head.appendChild(style);
    
    return this.container;
  }

  onRemove() {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.map = undefined;
  }
}

export default PitchControl;
