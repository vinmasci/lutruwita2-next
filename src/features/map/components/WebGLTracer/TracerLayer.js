import mapboxgl from '../../../../lib/mapbox-gl-adaptive';
import logger from '../../../../utils/logger';

/**
 * TracerLayer - A custom WebGL layer for rendering the map tracer
 * This implementation uses Mapbox GL JS's CustomLayerInterface to render
 * a point directly with WebGL, which is much more efficient than updating
 * a GeoJSON source.
 */
class TracerLayer {
  /**
   * Create a new TracerLayer
   * @param {Array} coordinates - Initial coordinates [lng, lat] or null
   */
  constructor(coordinates) {
    this.id = 'tracer-layer';
    this.type = 'custom';
    this.renderingMode = '2d';
    this.coordinates = coordinates || null;
    this.visible = false;
    this.isReady = false; // Track if the layer is fully initialized and ready
    this.pendingCoordinates = null; // Store coordinates that were set before layer was ready
  }

  /**
   * Called when the layer is added to the map
   * @param {Object} map - The Mapbox GL JS map instance
   * @param {WebGLRenderingContext} gl - The WebGL rendering context
   */
  onAdd(map, gl) {
    this.map = map;
    this.gl = gl;
    this.isReady = false; // Reset ready state
    
    try {
      // Create WebGL buffers and compile shaders
      const vertexSource = `
        attribute vec2 a_position;
        uniform mat4 u_matrix;
        uniform float u_size;
        
        void main() {
          gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
          gl_PointSize = u_size;
        }
      `;
      
      const fragmentSource = `
        precision mediump float;
        uniform vec4 u_color;
        uniform vec4 u_outline;
        uniform float u_blur;
        
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          float t = smoothstep(0.5, 0.5 - u_blur, d);
          
          // Mix inner color with outline color
          vec4 color = mix(u_outline, u_color, smoothstep(0.45, 0.45 - u_blur, d));
          gl_FragColor = color * t;
        }
      `;
      
      // Create and compile the vertex shader
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, vertexSource);
      gl.compileShader(vertexShader);
      
      // Check for compilation errors
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(vertexShader);
        logger.error('TracerLayer', 'Vertex shader compilation failed:', info);
        throw new Error('Vertex shader compilation failed: ' + info);
      }
      
      // Create and compile the fragment shader
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, fragmentSource);
      gl.compileShader(fragmentShader);
      
      // Check for compilation errors
      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(fragmentShader);
        logger.error('TracerLayer', 'Fragment shader compilation failed:', info);
        throw new Error('Fragment shader compilation failed: ' + info);
      }
      
      // Create the shader program
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);
      
      // Check for linking errors
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(this.program);
        logger.error('TracerLayer', 'Shader program linking failed:', info);
        throw new Error('Shader program linking failed: ' + info);
      }
      
      // Get attribute and uniform locations
      this.aPosition = gl.getAttribLocation(this.program, 'a_position');
      this.uMatrix = gl.getUniformLocation(this.program, 'u_matrix');
      this.uSize = gl.getUniformLocation(this.program, 'u_size');
      this.uColor = gl.getUniformLocation(this.program, 'u_color');
      this.uOutline = gl.getUniformLocation(this.program, 'u_outline');
      this.uBlur = gl.getUniformLocation(this.program, 'u_blur');
      
      // Create a buffer for the point
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      
      // Initialize with empty data
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 0]),
        gl.STATIC_DRAW
      );
      
      logger.info('TracerLayer', 'WebGL tracer layer initialized successfully');
      
      // Mark as ready
      this.isReady = true;
      
      // Apply any pending coordinates
      if (this.pendingCoordinates) {
        this.updateCoordinates(this.pendingCoordinates);
        this.pendingCoordinates = null;
      }
    } catch (error) {
      logger.error('TracerLayer', 'Error initializing WebGL tracer layer:', error);
      // Set a flag to indicate that WebGL initialization failed
      this.initializationFailed = true;
      this.isReady = false;
    }
  }
  
  /**
   * Update the tracer coordinates
   * @param {Array|null} coordinates - New coordinates [lng, lat] or null to hide
   */
  updateCoordinates(coordinates) {
    // If initialization failed, don't try to update
    if (this.initializationFailed) return;
    
    // If not ready yet, store coordinates for later
    if (!this.isReady) {
      this.pendingCoordinates = coordinates;
      return;
    }
    
    if (!this.gl || !this.buffer) {
      logger.warn('TracerLayer', 'Cannot update coordinates: WebGL context or buffer not available');
      return;
    }
    
    try {
      this.coordinates = coordinates;
      
      if (coordinates) {
        // Convert coordinates to mercator projection
        const mercator = mapboxgl.MercatorCoordinate.fromLngLat(coordinates);
        
        // Update the buffer with the new coordinates
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.bufferData(
          this.gl.ARRAY_BUFFER,
          new Float32Array([mercator.x, mercator.y]),
          this.gl.STATIC_DRAW
        );
        
        this.visible = true;
      } else {
        this.visible = false;
      }
      
      // Request a map repaint to show the updated tracer
      if (this.map) {
        this.map.triggerRepaint();
      }
    } catch (error) {
      logger.error('TracerLayer', 'Error updating tracer coordinates:', error);
    }
  }
  
  /**
   * Render the tracer
   * @param {WebGLRenderingContext} gl - The WebGL rendering context
   * @param {Array} matrix - The projection matrix
   */
  render(gl, matrix) {
    // If initialization failed or tracer is not visible, don't render
    if (this.initializationFailed || !this.visible || !this.coordinates || !this.program) {
      return;
    }
    
    try {
      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.uMatrix, false, matrix);
      
      // Set point size - larger for better visibility
      gl.uniform1f(this.uSize, 20.0);
      
      // Set colors (bright red with white outline for high contrast)
      gl.uniform4fv(this.uColor, [1.0, 0.0, 0.0, 1.0]); // Bright red with full opacity
      gl.uniform4fv(this.uOutline, [1.0, 1.0, 1.0, 1.0]); // White outline
      gl.uniform1f(this.uBlur, 0.03); // Reduced blur for sharper edges
      
      // Bind the buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);
      
      // Draw the point
      gl.drawArrays(gl.POINTS, 0, 1);
    } catch (error) {
      logger.error('TracerLayer', 'Error rendering tracer:', error);
    }
  }
  
  /**
   * Called when the layer is removed from the map
   */
  onRemove() {
    // If initialization failed, there's nothing to clean up
    if (this.initializationFailed) return;
    
    if (!this.gl) return;
    
    // Mark as not ready
    this.isReady = false;
    
    try {
      // Clean up WebGL resources
      if (this.buffer) {
        this.gl.deleteBuffer(this.buffer);
        this.buffer = null;
      }
      
      if (this.program) {
        this.gl.deleteProgram(this.program);
        this.program = null;
      }
      
      logger.info('TracerLayer', 'WebGL tracer layer resources cleaned up');
    } catch (error) {
      logger.error('TracerLayer', 'Error cleaning up WebGL tracer layer:', error);
    }
  }
  
  /**
   * Check if the layer is visible
   * @returns {boolean} - Whether the layer is visible
   */
  isVisible() {
    return this.visible;
  }
  
  /**
   * Set the visibility of the layer
   * @param {boolean} visible - Whether the layer should be visible
   */
  setVisible(visible) {
    this.visible = visible;
    
    // If hiding, we can keep the coordinates but just not render
    // If showing and we have coordinates, trigger a repaint
    if (visible && this.coordinates && this.map) {
      this.map.triggerRepaint();
    }
  }
}

export default TracerLayer;
