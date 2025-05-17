import mongoose from 'mongoose';

const importProgressSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  format: {
    type: String,
    required: true
  },
  totalProducts: {
    type: Number,
    required: true
  },
  processedProducts: {
    type: Number,
    default: 0
  },
  successfulProducts: {
    type: Number,
    default: 0
  },
  failedProducts: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed'],
    default: 'in_progress'
  },
  error: {
    type: String
  },
  products: [{
    type: mongoose.Schema.Types.Mixed
  }],
  lastProcessedIndex: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add pre-save hook to update the updatedAt timestamp
importProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Check if model exists before creating a new one
const ImportProgress = mongoose.models.ImportProgress || mongoose.model('ImportProgress', importProgressSchema);

export { ImportProgress };