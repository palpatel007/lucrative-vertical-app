import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: false // Set to true if you want to require the Shopify shop ID
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    storeName: {
        type: String
    },
    collaboratorCode: { type: String },
    storePassword: { type: String },
    reason: { type: String },
    pageInfo: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const ContactMessage = mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema);

export default ContactMessage; 