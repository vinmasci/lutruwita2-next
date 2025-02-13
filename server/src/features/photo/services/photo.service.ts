import AWS from 'aws-sdk';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export class PhotoService {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    // Initialize AWS S3 client
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });
    this.bucket = process.env.AWS_S3_BUCKET || '';
  }

  async uploadPhoto(file: Express.Multer.File) {
    try {
      // Generate unique filename
      const fileId = uuidv4();
      const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${fileId}.${ext}`;
      const thumbnailFilename = `${fileId}-thumb.${ext}`;

      // Compress and resize main image
      const compressedBuffer = await sharp(file.buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Create thumbnail
      const thumbnailBuffer = await sharp(file.buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      // Upload main image to S3
      const mainUpload = await this.s3.upload({
        Bucket: this.bucket,
        Key: `photos/${filename}`,
        Body: compressedBuffer,
        ContentType: 'image/jpeg'
      }).promise();

      // Upload thumbnail to S3
      const thumbnailUpload = await this.s3.upload({
        Bucket: this.bucket,
        Key: `photos/thumbnails/${thumbnailFilename}`,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg'
      }).promise();

      return {
        url: mainUpload.Location,
        thumbnailUrl: thumbnailUpload.Location,
        name: file.originalname
      };
    } catch (error) {
      console.error('Failed to upload photo:', error);
      throw new Error('Failed to upload photo to S3');
    }
  }

  async deletePhoto(url: string) {
    try {
      // Extract key from URL
      const key = url.split('.com/').pop();
      if (!key) throw new Error('Invalid S3 URL');

      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();

      // Also delete thumbnail
      const thumbnailKey = key.replace('photos/', 'photos/thumbnails/').replace('.', '-thumb.');
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: thumbnailKey
      }).promise();
    } catch (error) {
      console.error('Failed to delete photo:', error);
      throw new Error('Failed to delete photo from S3');
    }
  }
}
