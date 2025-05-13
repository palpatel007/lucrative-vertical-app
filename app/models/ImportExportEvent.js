import mongoose from 'mongoose';

const importExportEventSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  type: { type: String, enum: ['import', 'export'], required: true },
  count: { type: Number, default: 1 },
  date: { type: Date, default: Date.now },
  platform: { type: String }
});

export default mongoose.models.ImportExportEvent || mongoose.model('ImportExportEvent', importExportEventSchema); 