import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { ImportProgress } from '../models/ImportProgress.js';

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    if (!session?.shop) {
      return json({ success: false, error: 'Please log in to continue' }, { status: 401 });
    }

    const url = new URL(request.url);
    const importId = url.searchParams.get('importId');

    if (!importId) {
      return json({ success: false, error: 'Import ID is required' }, { status: 400 });
    }

    const importProgress = await ImportProgress.findOne({ _id: importId });
    if (!importProgress) {
      return json({ success: false, error: 'Import not found' }, { status: 404 });
    }

    return json({
      success: true,
      progress: {
        processed: importProgress.processedProducts,
        total: importProgress.totalProducts,
        successful: importProgress.successfulProducts,
        failed: importProgress.failedProducts,
        status: importProgress.status,
        error: importProgress.error
      }
    });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 