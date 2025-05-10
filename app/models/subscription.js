import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    shopId: {
        type: String,
        required: true,
        index: true
    },
    shopifyChargeId: {
        type: String,
        required: false
    },
    shopifySubscriptionId: {
        type: String,
        required: false
    },
    accessToken: {
        type: String,
        required: true
    },
    plan: {
        type: String,
        enum: ['FREE', 'SHOP PLAN', 'WAREHOUSE PLAN', 'FACTORY PLAN', 'FRANCHISE PLAN', 'CITADEL PLAN'],
        default: 'FREE'
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'suspended', 'pending'],
        default: 'active'
    },
    installDate: {
        type: Date,
        default: Date.now
    },
    nextBillingDate: {
        type: Date
    },
    currentPeriodEnd: {
        type: Date
    },
    importCount: {
        type: Number,
        default: 0
    },
    exportCount: {
        type: Number,
        default: 0
    },
    allowedPlatforms: {
        type: [String],
        default: ['Shopify', 'WooCommerce'] // Default for FREE plan
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    renewalDate: {
        type: Date
    },
    test: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Update the updatedAt timestamp before saving
subscriptionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Method to get plan limits
subscriptionSchema.methods.getPlanLimits = function() {
    const limits = {
        'FREE': {
            importLimit: 20,
            exportLimit: 20,
            platforms: ['Shopify', 'WooCommerce']
        },
        'SHOP PLAN': {
            importLimit: 100,
            exportLimit: 100,
            platforms: ['Shopify', 'WooCommerce', 'Wix', 'BigCommerce', 'Squarespace']
        },
        'WAREHOUSE PLAN': {
            importLimit: 300,
            exportLimit: 300,
            platforms: ['Shopify', 'WooCommerce', 'Squarespace', 'Amazon', 'Alibaba', 'Custom Sheet']
        },
        'FACTORY PLAN': {
            importLimit: 1000,
            exportLimit: 1000,
            platforms: ['Shopify', 'WooCommerce', 'Wix', 'BigCommerce', 'Squarespace', 'Amazon', 'Alibaba', 'Custom Sheet', 'AliExpress', 'Etsy']
        },
        'FRANCHISE PLAN': {
            importLimit: 3000,
            exportLimit: 3000,
            platforms: ['Shopify', 'WooCommerce', 'Wix', 'BigCommerce', 'Squarespace', 'Amazon', 'Alibaba', 'Custom Sheet', 'AliExpress', 'Etsy', 'Ebay']
        },
        'CITADEL PLAN': {
            importLimit: 50000,
            exportLimit: 50000,
            platforms: ['Shopify', 'WooCommerce', 'Wix', 'BigCommerce', 'Squarespace', 'Amazon', 'Alibaba', 'Custom Sheet', 'AliExpress', 'Etsy', 'Ebay']
        }
    };
    return limits[this.plan] || limits['FREE'];
};

// Method to check if a platform is allowed
subscriptionSchema.methods.isPlatformAllowed = function(platform) {
    return this.allowedPlatforms.includes(platform);
};

// Method to check if import/export limits are exceeded
subscriptionSchema.methods.hasExceededLimits = function(type, count) {
    const limits = this.getPlanLimits();
    const currentCount = type === 'import' ? this.importCount : this.exportCount;
    const limit = type === 'import' ? limits.importLimit : limits.exportLimit;
    return currentCount + count > limit;
};

// Method to get remaining quota
subscriptionSchema.methods.getRemainingQuota = function(type) {
    const limits = this.getPlanLimits();
    const currentCount = type === 'import' ? this.importCount : this.exportCount;
    const limit = type === 'import' ? limits.importLimit : limits.exportLimit;
    return Math.max(0, limit - currentCount);
};

// Method to increment import/export counts
subscriptionSchema.methods.incrementCount = async function(type, count = 1) {
    if (type === 'import') {
        this.importCount += count;
    } else if (type === 'export') {
        this.exportCount += count;
    }
    return this.save();
};

// Method to update allowed platforms based on plan
subscriptionSchema.methods.updateAllowedPlatforms = function() {
    const limits = this.getPlanLimits();
    this.allowedPlatforms = limits.platforms;
    return this.save();
};

export const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema); 