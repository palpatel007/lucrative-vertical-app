import mongoose from 'mongoose';

const storeStatsSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    importCount: {
        type: Number,
        default: 0
    },
    exportCount: {
        type: Number,
        default: 0
    },
    platformUsage: {
        import: {
            type: Map,
            of: Number,
            default: new Map()
        },
        export: {
            type: Map,
            of: Number,
            default: new Map()
        }
    },
    lastImportDate: {
        type: Date
    },
    lastExportDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update the updatedAt timestamp before saving
storeStatsSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Method to increment import count for a specific platform
storeStatsSchema.methods.incrementImportCount = async function(platform, count = 1) {
    this.importCount += count;
    this.lastImportDate = new Date();
    
    // Update platform-specific import count
    const currentPlatformCount = this.platformUsage.import.get(platform) || 0;
    this.platformUsage.import.set(platform, currentPlatformCount + count);
    
    return this.save();
};

// Method to increment export count for a specific platform
storeStatsSchema.methods.incrementExportCount = async function(platform, count = 1) {
    this.exportCount += count;
    this.lastExportDate = new Date();
    
    // Update platform-specific export count
    const currentPlatformCount = this.platformUsage.export.get(platform) || 0;
    this.platformUsage.export.set(platform, currentPlatformCount + count);
    
    return this.save();
};

// Method to get platform usage statistics
storeStatsSchema.methods.getPlatformStats = function() {
    return {
        import: Object.fromEntries(this.platformUsage.import),
        export: Object.fromEntries(this.platformUsage.export)
    };
};

// Method to reset counts (useful for plan changes)
storeStatsSchema.methods.resetCounts = async function() {
    this.importCount = 0;
    this.exportCount = 0;
    this.platformUsage.import = new Map();
    this.platformUsage.export = new Map();
    return this.save();
};

const StoreStats = mongoose.models.StoreStats || mongoose.model('StoreStats', storeStatsSchema);

export default StoreStats; 