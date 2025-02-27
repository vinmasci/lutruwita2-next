import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.VITE_AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.VITE_AWS_SECRET_ACCESS_KEY
  }
});

// Bucket name from environment variable
const bucketName = process.env.S3_BUCKET_NAME || process.env.VITE_AWS_S3_BUCKET;

// Debug S3 configuration
console.log('S3 Configuration:', {
  region: process.env.AWS_REGION || process.env.VITE_AWS_REGION || 'ap-southeast-2',
  hasAccessKeyId: Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.VITE_AWS_ACCESS_KEY_ID),
  hasSecretAccessKey: Boolean(process.env.AWS_SECRET_ACCESS_KEY || process.env.VITE_AWS_SECRET_ACCESS_KEY),
  bucketName
});

// Generate a unique filename
export function generateUniqueFilename(originalFilename) {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = originalFilename.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}

// Upload a file to S3
export async function uploadFile(fileBuffer, filename, contentType) {
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not defined');
  }

  const key = `uploads/${filename}`;
  
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: 'public-read'  // Add ACL parameter to make objects publicly readable
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    return {
      key,
      url: `https://${bucketName}.s3.amazonaws.com/${key}`
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
}

// Get a file from S3
export async function getFile(key) {
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not defined');
  }

  const params = {
    Bucket: bucketName,
    Key: key
  };

  try {
    const response = await s3Client.send(new GetObjectCommand(params));
    
    // Convert the stream to a buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('S3 get file error:', error);
    throw error;
  }
}

// Delete a file from S3
export async function deleteFile(key) {
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not defined');
  }

  const params = {
    Bucket: bucketName,
    Key: key
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    return true;
  } catch (error) {
    console.error('S3 delete file error:', error);
    throw error;
  }
}

// Generate a presigned URL for direct uploads
export async function getPresignedUploadUrl(filename, contentType, expiresIn = 3600) {
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not defined');
  }

  const key = `uploads/${filename}`;
  
  const params = {
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read'  // Add ACL parameter to make objects publicly readable
  };

  try {
    const command = new PutObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    return {
      url,
      key,
      fields: {
        key,
        'Content-Type': contentType
      }
    };
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    throw error;
  }
}

// Generate a presigned URL for downloading
export async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not defined');
  }

  const params = {
    Bucket: bucketName,
    Key: key
  };

  try {
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    return url;
  } catch (error) {
    console.error('S3 presigned download URL error:', error);
    throw error;
  }
}
