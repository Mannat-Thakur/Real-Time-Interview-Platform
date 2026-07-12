const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    default: 'Untitled Interview Session',
  },
  code: {
    type: String,
    default: '// Start typing code here',
  },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);