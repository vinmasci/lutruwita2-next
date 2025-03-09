"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoService = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
class PhotoService {
    constructor() {
        // Initialize AWS S3 client
        this.s3 = new aws_sdk_1.default.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });
        this.bucket = process.env.AWS_S3_BUCKET || '';
    }
    async uploadPhoto(file) {
        try {
            // Generate unique filename
            const fileId = (0, uuid_1.v4)();
            const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
            const filename = `${fileId}.${ext}`;
            const thumbnailFilename = `${fileId}-thumb.${ext}`;
            // Validate file type
            if (!file.mimetype.startsWith('image/')) {
                throw new Error(`Invalid file type: ${file.mimetype}. Only image files are allowed.`);
            }
            let compressedBuffer;
            let thumbnailBuffer;
            try {
                // Compress and resize main image
                compressedBuffer = await (0, sharp_1.default)(file.buffer)
                    .rotate() // Auto-rotate based on EXIF orientation
                    .resize(2048, 2048, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({ quality: 80 })
                    .toBuffer()
                    .catch((err) => {
                    console.error('Sharp processing error (main image):', {
                        error: err,
                        filename: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype
                    });
                    throw new Error('Failed to process image for upload');
                });
                // Create thumbnail
                thumbnailBuffer = await (0, sharp_1.default)(file.buffer)
                    .rotate() // Auto-rotate based on EXIF orientation
                    .resize(800, 800, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({ quality: 70 })
                    .toBuffer()
                    .catch((err) => {
                    console.error('Sharp processing error (thumbnail):', {
                        error: err,
                        filename: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype
                    });
                    throw new Error('Failed to create thumbnail');
                });
            }
            catch (err) {
                const error = err;
                throw new Error(`Image processing failed: ${error.message}`);
            }
            try {
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
            }
            catch (err) {
                const awsError = err;
                // Log detailed AWS error information
                console.error('S3 upload error:', {
                    error: awsError,
                    code: awsError.code,
                    message: awsError.message,
                    statusCode: awsError.statusCode,
                    requestId: awsError.requestId,
                    bucket: this.bucket,
                    filename: filename
                });
                // Check for specific AWS errors
                if (awsError.code === 'NoSuchBucket') {
                    throw new Error(`S3 bucket '${this.bucket}' does not exist`);
                }
                else if (awsError.code === 'AccessDenied') {
                    throw new Error('Access denied to S3 bucket. Check AWS credentials and permissions.');
                }
                else {
                    throw new Error(`Failed to upload to S3: ${awsError.message}`);
                }
            }
        }
        catch (error) {
            console.error('Photo upload failed:', {
                error: error,
                filename: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            });
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unknown error occurred during photo upload');
        }
    }
    async deletePhoto(url) {
        try {
            // Extract key from URL
            const key = url.split('.com/').pop();
            if (!key)
                throw new Error('Invalid S3 URL');
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
        }
        catch (error) {
            console.error('Failed to delete photo:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to delete photo from S3: ${error.message}`);
            }
            throw new Error('Failed to delete photo from S3: Unknown error');
        }
    }
}
exports.PhotoService = PhotoService;
