import { createApiHandler } from '../lib/middleware.js';
import { connectToDatabase } from '../lib/db.js';
import { uploadToS3, getSignedUrl, deleteFromS3 } from '../lib/storage.js';
import { createJob, getJob, updateJob, deleteJob } from '../lib/job-queue.js';
import { getCachedSurface, setCachedSurface } from '../lib/surface-cache.js';
import { parseGPX } from '../lib/gpx-parser.js';

// Handler for uploading a GPX file
async function handleUploadGPX(req, res) {
  try {
    // Check if file is provided
    if (!req.files || !req.files.gpxFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = req.files.gpxFile;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      return res.status(400).json({ error: 'Invalid file type. Only GPX files are allowed.' });
    }
    
    // Generate a unique filename
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const key = `gpx/${req.user?.sub || 'anonymous'}/${filename}`;
    
    // Upload to S3
    const result = await uploadToS3(file.data, key, 'application/gpx+xml');
    
    // Create a processing job
    const jobId = `gpx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await createJob(jobId, {
      status: 'pending',
      fileUrl: result.Location,
      fileKey: result.Key,
      filename: file.name,
      userId: req.user?.sub || 'anonymous',
      createdAt: new Date().toISOString()
    }, 3600); // 1 hour TTL
    
    // Start processing in the background
    processGPXFile(jobId, result.Location, file.name, req.user?.sub || 'anonymous')
      .catch(err => console.error('GPX processing error:', err));
    
    // Return the job ID for status checking
    return res.status(202).json({
      jobId,
      message: 'GPX file uploaded and processing started',
      filename: file.name,
      originalFilename: file.name
    });
  } catch (error) {
    console.error('Upload GPX error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload GPX file',
      details: error.message
    });
  }
}

// Handler for getting a presigned URL for direct S3 upload
async function handleGetUploadUrl(req, res) {
  try {
    const { filename } = req.query;
    
    if (!filename) {
      return res.status(400).json({ error: 'Missing filename' });
    }
    
    // Validate file type
    if (!filename.toLowerCase().endsWith('.gpx')) {
      return res.status(400).json({ error: 'Invalid file type. Only GPX files are allowed.' });
    }
    
    // Generate a unique key for the file
    const key = `gpx/${req.user?.sub || 'anonymous'}/${Date.now()}-${filename}`;
    
    // Get a presigned URL for uploading
    const uploadUrl = await getSignedUrl(key, 'application/gpx+xml', 'putObject');
    
    // Construct the final URL where the file will be accessible
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    // Create a processing job
    const jobId = `gpx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await createJob(jobId, {
      status: 'awaiting_upload',
      fileUrl,
      fileKey: key,
      filename,
      userId: req.user?.sub || 'anonymous',
      createdAt: new Date().toISOString()
    }, 3600); // 1 hour TTL
    
    return res.status(200).json({
      uploadUrl,
      fileUrl,
      key,
      jobId
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate upload URL',
      details: error.message
    });
  }
}

// Handler for checking the status of a GPX processing job
async function handleCheckStatus(req, res) {
  try {
    const { jobId } = req.query;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Missing job ID' });
    }
    
    // Get job from Redis
    const job = await getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    return res.status(200).json(job);
  } catch (error) {
    console.error('Check status error:', error);
    return res.status(500).json({ 
      error: 'Failed to check job status',
      details: error.message
    });
  }
}

// Handler for starting GPX processing after client-side upload
async function handleStartProcessing(req, res) {
  try {
    const { jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Missing job ID' });
    }
    
    // Get job from Redis
    const job = await getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'awaiting_upload') {
      return res.status(400).json({ error: `Invalid job status: ${job.status}` });
    }
    
    // Update job status
    job.status = 'pending';
    await updateJob(jobId, job);
    
    // Start processing in the background
    processGPXFile(jobId, job.fileUrl, job.filename, job.userId)
      .catch(err => console.error('GPX processing error:', err));
    
    return res.status(202).json({
      jobId,
      message: 'GPX processing started',
      status: 'pending'
    });
  } catch (error) {
    console.error('Start processing error:', error);
    return res.status(500).json({ 
      error: 'Failed to start GPX processing',
      details: error.message
    });
  }
}

// Handler for canceling a GPX processing job
async function handleCancelProcessing(req, res) {
  try {
    const { jobId } = req.query;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Missing job ID' });
    }
    
    // Get job from Redis
    const job = await getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Delete the job
    await deleteJob(jobId);
    
    // Delete the file from S3 if it exists
    if (job.fileKey) {
      try {
        await deleteFromS3(job.fileKey);
      } catch (err) {
        console.error('Error deleting file from S3:', err);
      }
    }
    
    return res.status(200).json({
      message: 'GPX processing job canceled',
      jobId
    });
  } catch (error) {
    console.error('Cancel processing error:', error);
    return res.status(500).json({ 
      error: 'Failed to cancel GPX processing',
      details: error.message
    });
  }
}

// Handler for getting surface data for a route
async function handleGetSurfaceData(req, res) {
  try {
    const { routeId } = req.query;
    
    if (!routeId) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    // Check cache first
    const cachedSurface = await getCachedSurface(routeId);
    
    if (cachedSurface) {
      return res.status(200).json(cachedSurface);
    }
    
    // If not in cache, return 404
    return res.status(404).json({ error: 'Surface data not found' });
  } catch (error) {
    console.error('Get surface data error:', error);
    return res.status(500).json({ 
      error: 'Failed to get surface data',
      details: error.message
    });
  }
}

// Function to process a GPX file
async function processGPXFile(jobId, fileUrl, filename, userId) {
  try {
    // Update job status
    await updateJob(jobId, {
      status: 'processing',
      progress: 0,
      message: 'Starting GPX processing'
    });
    
    // Fetch the file from S3
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch GPX file: ${response.statusText}`);
    }
    
    const gpxContent = await response.text();
    
    // Update progress
    await updateJob(jobId, {
      status: 'processing',
      progress: 10,
      message: 'Parsing GPX file'
    });
    
    // Parse the GPX file
    const parsedData = await parseGPX(gpxContent);
    
    // Update progress
    await updateJob(jobId, {
      status: 'processing',
      progress: 50,
      message: 'Calculating route metrics'
    });
    
    // Calculate route metrics (distance, elevation, etc.)
    const routeMetrics = calculateRouteMetrics(parsedData);
    
    // Update progress
    await updateJob(jobId, {
      status: 'processing',
      progress: 70,
      message: 'Determining surface types'
    });
    
    // Determine surface types
    const surfaceData = await determineSurfaceTypes(parsedData);
    
    // Cache the surface data
    if (surfaceData && routeMetrics.id) {
      await setCachedSurface(routeMetrics.id, surfaceData, 86400); // 24 hour TTL
    }
    
    // Update progress
    await updateJob(jobId, {
      status: 'processing',
      progress: 90,
      message: 'Finalizing route data'
    });
    
    // Create the final route data
    const routeData = {
      ...parsedData,
      ...routeMetrics,
      surfaces: surfaceData,
      userId,
      filename,
      originalFilename: filename,
      createdAt: new Date().toISOString()
    };
    
    // Update job with the final data
    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      message: 'GPX processing completed',
      result: routeData
    });
    
    return routeData;
  } catch (error) {
    console.error('GPX processing error:', error);
    
    // Update job with the error
    await updateJob(jobId, {
      status: 'failed',
      error: error.message
    });
    
    throw error;
  }
}

// Function to calculate route metrics
function calculateRouteMetrics(parsedData) {
  // This is a simplified implementation
  // In a real app, you would calculate distance, elevation gain/loss, etc.
  
  return {
    id: `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    distance: 0, // Calculate actual distance
    elevation: {
      gain: 0,
      loss: 0,
      min: 0,
      max: 0
    },
    bounds: {
      north: 0,
      south: 0,
      east: 0,
      west: 0
    }
  };
}

// Function to determine surface types
async function determineSurfaceTypes(parsedData) {
  // This is a simplified implementation
  // In a real app, you would use external APIs or ML to determine surface types
  
  return [
    {
      type: 'unknown',
      percentage: 100,
      distance: 0 // Calculate actual distance
    }
  ];
}

// Route handler
const handler = async (req, res) => {
  // Ensure database connection
  await connectToDatabase();
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'POST':
      // Check if it's a direct upload request
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        return handleUploadGPX(req, res);
      }
      
      // Check if it's a presigned URL request
      if (req.query.presigned === 'true') {
        return handleGetUploadUrl(req, res);
      }
      
      // Check if it's a start processing request
      if (req.body.jobId && req.body.action === 'start') {
        return handleStartProcessing(req, res);
      }
      
      return res.status(400).json({ error: 'Invalid request' });
    
    case 'GET':
      // Check if it's a job status request
      if (req.query.jobId) {
        return handleCheckStatus(req, res);
      }
      
      // Check if it's a surface data request
      if (req.query.routeId && req.query.surface === 'true') {
        return handleGetSurfaceData(req, res);
      }
      
      return res.status(400).json({ error: 'Invalid request' });
    
    case 'DELETE':
      // Handle job cancellation
      return handleCancelProcessing(req, res);
    
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
};

// Export the handler with middleware
export default createApiHandler(handler, { requireDb: true });
