const s3Provider = require('./storageProviders/s3Provider');

class StorageService {
  /**
   * Delegates file upload directly to S3 Provider (Supabase Storage via S3 protocol)
   * Returns public URL string
   */
  async uploadFile(fileBuffer, originalName, mimeType) {
    return await s3Provider.uploadFile(fileBuffer, originalName, mimeType);
  }

  /**
   * Delegates object deletion directly to S3 Provider
   */
  async deleteFile(fileUrlOrName) {
    return await s3Provider.deleteFile(fileUrlOrName);
  }

  /**
   * Resolves public URL via S3 Provider
   */
  getUrl(filePath) {
    return s3Provider.getUrl(filePath);
  }
}

module.exports = new StorageService();
