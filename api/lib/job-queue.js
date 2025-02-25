import { getRedisClient, getCache, setCache, deleteCache } from './redis';

// Job status constants
export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Job prefix for Redis keys
const JOB_PREFIX = 'job:';

// Default job expiry in seconds (24 hours)
const DEFAULT_JOB_EXPIRY = 60 * 60 * 24;

/**
 * Create a new job in Redis
 * @param {string} jobId - Unique job identifier
 * @param {Object} initialData - Initial job data
 * @param {number} expiryInSeconds - Time until job data expires
 * @returns {Promise<Object>} - Job data
 */
export async function createJob(jobId, initialData = {}, expiryInSeconds = DEFAULT_JOB_EXPIRY) {
  const jobData = {
    id: jobId,
    status: JOB_STATUS.PENDING,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...initialData
  };

  const key = `${JOB_PREFIX}${jobId}`;
  await setCache(key, jobData, expiryInSeconds);
  
  return jobData;
}

/**
 * Get job data from Redis
 * @param {string} jobId - Job identifier
 * @returns {Promise<Object|null>} - Job data or null if not found
 */
export async function getJob(jobId) {
  const key = `${JOB_PREFIX}${jobId}`;
  return getCache(key);
}

/**
 * Update job data in Redis
 * @param {string} jobId - Job identifier
 * @param {Object} updates - Data to update
 * @param {number} expiryInSeconds - Time until job data expires
 * @returns {Promise<Object|null>} - Updated job data or null if not found
 */
export async function updateJob(jobId, updates = {}, expiryInSeconds = DEFAULT_JOB_EXPIRY) {
  const key = `${JOB_PREFIX}${jobId}`;
  const jobData = await getCache(key);
  
  if (!jobData) {
    return null;
  }
  
  const updatedJob = {
    ...jobData,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await setCache(key, updatedJob, expiryInSeconds);
  return updatedJob;
}

/**
 * Update job progress
 * @param {string} jobId - Job identifier
 * @param {number} progress - Progress value (0-1)
 * @returns {Promise<Object|null>} - Updated job data or null if not found
 */
export async function updateJobProgress(jobId, progress) {
  return updateJob(jobId, {
    progress,
    status: progress >= 1 ? JOB_STATUS.COMPLETED : JOB_STATUS.PROCESSING
  });
}

/**
 * Mark job as completed with result
 * @param {string} jobId - Job identifier
 * @param {any} result - Job result data
 * @returns {Promise<Object|null>} - Updated job data or null if not found
 */
export async function completeJob(jobId, result) {
  return updateJob(jobId, {
    status: JOB_STATUS.COMPLETED,
    progress: 1,
    result,
    completedAt: new Date().toISOString()
  });
}

/**
 * Mark job as failed with error
 * @param {string} jobId - Job identifier
 * @param {string} error - Error message
 * @returns {Promise<Object|null>} - Updated job data or null if not found
 */
export async function failJob(jobId, error) {
  return updateJob(jobId, {
    status: JOB_STATUS.ERROR,
    error,
    failedAt: new Date().toISOString()
  });
}

/**
 * Delete a job from Redis
 * @param {string} jobId - Job identifier
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteJob(jobId) {
  const key = `${JOB_PREFIX}${jobId}`;
  return deleteCache(key);
}

/**
 * List all jobs with a specific prefix
 * @param {string} prefix - Job ID prefix to filter by
 * @returns {Promise<Array>} - Array of job data
 */
export async function listJobs(prefix = '') {
  const client = getRedisClient();
  const pattern = `${JOB_PREFIX}${prefix}*`;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) {
      return [];
    }
    
    const jobsData = await Promise.all(
      keys.map(async (key) => {
        const data = await getCache(key);
        return data;
      })
    );
    
    return jobsData.filter(Boolean);
  } catch (error) {
    console.error('[List Jobs Error]', error);
    return [];
  }
}
