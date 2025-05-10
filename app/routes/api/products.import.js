// ... existing imports ...

// After successful import, update both Shop and StoreStats
if (session?.shop && products.length > 0) {
  try {
    // Get current store stats
    const currentStats = await StoreStats.findOne({ shopId: shopDoc._id });
    console.log('[Import] Current store stats:', {
      shop: session.shop,
      shopId: shopDoc._id,
      currentStats
    });

    // Update StoreStats with platform-specific tracking
    const updatedStats = await StoreStats.findOneAndUpdate(
      { shopId: shopDoc._id },
      { 
        $setOnInsert: { 
          shopId: shopDoc._id,
        }
      },
      { 
        upsert: true,
        new: true 
      }
    );

    // Use the new incrementImportCount method
    await updatedStats.incrementImportCount(format.toUpperCase(), products.length);

    console.log('[Import] Updated store stats:', {
      shop: session.shop,
      shopId: shopDoc._id,
      previousCount: currentStats?.importCount || 0,
      newCount: updatedStats.importCount,
      productsAdded: products.length,
      platformStats: updatedStats.getPlatformStats()
    });

    // Also update Subscription model
    const subscription = await Subscription.findOne({ shopId: shopDoc._id });
    if (subscription) {
      await subscription.incrementCount('import', products.length);
    }
  } catch (err) {
    console.error('[Import] Error updating import counts:', err);
  }
}

// ... rest of the code ... 