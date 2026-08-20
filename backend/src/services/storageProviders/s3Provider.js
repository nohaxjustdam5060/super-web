const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const logger = require('../../config/logger');

// Local dev certificate bypass for environments with SSL proxy interception
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

class S3StorageProvider {
  constructor() {
    this.endpoint = process.env.STORAGE_ENDPOINT || 'https://kmybcivvuyusgtxdbwmh.storage.supabase.co/storage/v1/s3';
    this.region = process.env.STORAGE_REGION || 'ca-central-1';
    this.bucket = process.env.STORAGE_BUCKET || 'products-image';

    // Construct Supabase public URL base
    const supabaseUrl = process.env.SUPABASE_URL || 'https://kmybcivvuyusgtxdbwmh.supabase.co';
    this.publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${this.bucket}`;

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY
      },
      forcePathStyle: true
    });

    logger.info(`[S3StorageProvider] Initialized S3 client connected to endpoint: "${this.endpoint}" (Bucket: "${this.bucket}")`);
  }

  /**
   * Upload file buffer to Supabase Storage via S3 protocol
   * Returns public URL string
   */
  async uploadFile(fileBuffer, originalName, mimeType) {
    const ext = path.extname(originalName || '.jpg') || '.jpg';
    const baseName = path.basename(originalName || 'img', ext);
    const sanitizedBase = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `${Date.now()}-${sanitizedBase}${ext}`;

    logger.info(`[S3StorageProvider] Executing PutObjectCommand for file "${fileName}" in bucket "${this.bucket}"`);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType || 'image/jpeg'
    });

    try {
      await this.s3Client.send(command);
      const publicUrl = `${this.publicBaseUrl}/${fileName}`;
      logger.info(`[S3StorageProvider] File uploaded successfully via S3. Public URL: "${publicUrl}"`);
      return publicUrl;
    } catch (err) {
      logger.error(`[S3StorageProvider] Error uploading file "${fileName}" via S3:`, err);
      throw err;
    }
  }

  /**
   * Delete object from Supabase Storage via S3 protocol
   */
  async deleteFile(fileUrlOrName) {
    if (!fileUrlOrName) return true;

    let fileName = fileUrlOrName;
    if (fileUrlOrName.includes('/')) {
      fileName = fileUrlOrName.split('/').pop();
    }

    logger.info(`[S3StorageProvider] Executing DeleteObjectCommand for key "${fileName}" in bucket "${this.bucket}"`);

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileName
    });

    try {
      await this.s3Client.send(command);
      logger.info(`[S3StorageProvider] Object "${fileName}" deleted successfully via S3.`);
    } catch (err) {
      logger.error(`[S3StorageProvider] Error deleting object "${fileName}" via S3:`, err);
    }

    return true;
  }

  /**
   * Get public URL for key
   */
  getUrl(filePath) {
    if (!filePath) return '/placeholder-product.png';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    return `${this.publicBaseUrl}/${filePath}`;
  }
}

module.exports = new S3StorageProvider();
