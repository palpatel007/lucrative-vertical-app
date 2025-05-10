import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  shopifyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: false
  },
  shopId: {
    type: String,
    required: false // Set to true if you want to require the Shopify shop ID
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  price: {
    type: Number
  },
  sku: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'draft', 'archived'],
    default: 'active'
  },
  variants: [{
    price: Number,
    sku: String,
    inventory: Number,
    title: String
  }],
  images: [{
    src: String,
    alt: String
  }],
  categories: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
productSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product; 