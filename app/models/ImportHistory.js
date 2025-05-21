import mongoose from 'mongoose';

const ImportHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shop: String,
  source: String,
  fileName: String,
  date: { type: Date, default: Date.now },
  dataType: String,
  importedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'complete', 'failed'], default: 'pending' },
  issuesCount: { type: Number, default: 0 },
});

const ImportHistory = mongoose.models.ImportHistory || mongoose.model('ImportHistory', ImportHistorySchema);
export default ImportHistory; 