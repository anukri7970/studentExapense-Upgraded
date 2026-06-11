const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Stores in-app feedback so the submission's "user feedback summary" can be
 * generated from real data instead of a manually-assembled spreadsheet.
 * This complements (does not replace) an external Google Form if you'd
 * rather collect feedback that way — either path satisfies the Level 4
 * requirement, this one is just easier to aggregate automatically.
 */
const feedbackSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    onboardingEaseRating: { type: Number, min: 1, max: 5, required: true },
    uiRating: { type: Number, min: 1, max: 5, required: true },
    wouldUseAgain: { type: Boolean, required: true },
    favoriteFeature: { type: String, trim: true, maxlength: 300 },
    comments: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
