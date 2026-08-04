const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

class StorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local';
    this.uploadDir = path.join(__dirname, '../../public/uploads');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Abstracted upload function
   */
  async uploadFile(fileBuffer, fileName, mimeType) {
    if (this.provider === 'supabase') {
      // Supabase Storage implementation placeholder using REST/fetch without locking logic
      logger.info(`[StorageService] Uploading ${fileName} to Supabase Storage bucket`);
      return `https://your-supabase-url.storage.supabase.co/object/public/products/${fileName}`;
    }

    // Local storage default implementation
    const targetPath = path.join(this.uploadDir, fileName);
    await fs.promises.writeFile(targetPath, fileBuffer);
    return `/uploads/${fileName}`;
  }

  /**
   * Abstracted delete function
   */
  async deleteFile(fileName) {
    if (this.provider === 'supabase') {
      logger.info(`[StorageService] Deleting ${fileName} from Supabase Storage`);
      return true;
    }

    const targetPath = path.join(this.uploadDir, fileName);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
    }
    return true;
  }

  /**
   * Resolves absolute or public URL for assets
   */
  getUrl(filePath) {
    if (!filePath) return '/placeholder-product.png';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    return filePath;
  }
}

module.exports = new StorageService();
