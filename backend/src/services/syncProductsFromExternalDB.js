const { Product, Category } = require('../models');
const { extraerEspecificaciones } = require('../utils/specExtractor');
const logger = require('../config/logger');

/**
 * Placeholder / Mock function to fetch raw product data from the external system.
 * When access to the external database/API is granted, ONLY replace the logic inside this function.
 */
async function fetchExternalProducts() {
  logger.info('[SyncService] fetchExternalProducts called. Placeholder mode active (ready for external DB driver/endpoint).');

  // Example placeholder payload structure:
  // Return an empty array by default or mock items for manual testing
  return [];
}

/**
 * Core Synchronization Function:
 * 1. Calls fetchExternalProducts() (or accepts raw items array)
 * 2. Runs extraerEspecificaciones() on product text
 * 3. Performs upsert on products table matching external_id key
 * 4. Logs summary metrics (imported/updated, needs_review count, complete failures)
 */
async function syncProducts(rawProductsList = null) {
  const startTime = Date.now();
  logger.info('[SyncService] Starting external product synchronization job...');

  let importedCount = 0;
  let needsReviewCount = 0;
  let failedCount = 0;

  try {
    const productsToProcess = rawProductsList || (await fetchExternalProducts());

    if (!Array.isArray(productsToProcess) || productsToProcess.length === 0) {
      logger.info('[SyncService] No products received from external source to synchronize.');
      return {
        success: true,
        summary: {
          totalReceived: 0,
          importedCount: 0,
          needsReviewCount: 0,
          failedCount: 0,
          durationMs: Date.now() - startTime
        }
      };
    }

    for (const rawItem of productsToProcess) {
      try {
        if (!rawItem.external_id) {
          logger.warn('[SyncService] Skipping raw item missing external_id:', rawItem);
          failedCount++;
          continue;
        }

        const fullNameStr = rawItem.full_name || rawItem.name || '';
        const specs = extraerEspecificaciones(fullNameStr);

        // Generate slug if not provided
        const generatedSlug = rawItem.slug || (rawItem.name || fullNameStr)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `ext-${rawItem.external_id.toLowerCase()}`;

        // Find fallback category if category_id not provided
        let targetCategoryId = rawItem.category_id;
        if (!targetCategoryId) {
          const defaultCategory = await Category.findOne({ where: { parent_id: null } });
          if (defaultCategory) {
            targetCategoryId = defaultCategory.id;
          }
        }

        const productData = {
          external_id: rawItem.external_id,
          full_name: specs.full_name,
          name: rawItem.name || fullNameStr,
          slug: generatedSlug,
          sku: rawItem.sku || rawItem.external_id,
          price: rawItem.price !== undefined ? rawItem.price : 0.00,
          offer_price: rawItem.offer_price || null,
          stock: rawItem.stock !== undefined ? rawItem.stock : 0,
          description: rawItem.description || fullNameStr,
          processor_family: specs.processor_family,
          ram_gb: specs.ram_gb,
          storage_gb: specs.storage_gb,
          storage_type: specs.storage_type,
          screen_size: specs.screen_size,
          needs_review: specs.needs_review,
          is_active: rawItem.is_active !== undefined ? rawItem.is_active : true,
          category_id: targetCategoryId,
          brand_id: rawItem.brand_id || null
        };

        // Upsert matching on external_id
        const [product, created] = await Product.findOrCreate({
          where: { external_id: rawItem.external_id },
          defaults: productData
        });

        if (!created) {
          await product.update(productData);
        }

        importedCount++;
        if (specs.needs_review) {
          needsReviewCount++;
        }
      } catch (itemErr) {
        failedCount++;
        logger.error(`[SyncService] Error upserting product external_id "${rawItem.external_id}":`, itemErr);
      }
    }

    const durationMs = Date.now() - startTime;
    logger.info(`[SyncService] Sync finished in ${durationMs}ms | Total: ${productsToProcess.length} | Imported/Updated: ${importedCount} | Needs Review: ${needsReviewCount} | Failed: ${failedCount}`);

    return {
      success: true,
      summary: {
        totalReceived: productsToProcess.length,
        importedCount,
        needsReviewCount,
        failedCount,
        durationMs
      }
    };
  } catch (error) {
    logger.error('[SyncService] Critical error during product synchronization:', error);
    throw error;
  }
}

// Allow direct manual execution via CLI
if (require.main === module) {
  syncProducts()
    .then((result) => {
      console.log('[SyncResult]', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SyncError]', err);
      process.exit(1);
    });
}

module.exports = {
  fetchExternalProducts,
  syncProducts
};
