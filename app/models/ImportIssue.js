import mongoose from 'mongoose';

const ImportIssueSchema = new mongoose.Schema({
  importId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportHistory' },
  productName: String,
  details: String,
  createdAt: { type: Date, default: Date.now },
});

const ImportIssue =  mongoose.model('ImportIssue', ImportIssueSchema);
export default ImportIssue; 