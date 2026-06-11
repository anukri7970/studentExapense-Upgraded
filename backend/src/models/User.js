const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * A single user account that can be a Parent, Student, or University.
 * Each user gets one Stellar keypair generated at signup. For this MVP the
 * secret key is encrypted at rest with a server-side key (see
 * services/encryption.js) rather than handled client-side, which keeps the
 * demo flow simple. A production version would move signing to the client
 * or a wallet provider (Freighter, Albedo) instead of custodying secrets.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['parent', 'student', 'university'],
      required: true,
    },

    // Stellar wallet
    stellarPublicKey: { type: String, required: true, unique: true },
    stellarSecretEncrypted: { type: String, required: true },
    walletFunded: { type: Boolean, default: false },

    // Relationships
    linkedStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }], // for parents
    linkedParents: [{ type: Schema.Types.ObjectId, ref: 'User' }], // for students
    monthlyBudget: { type: Number, default: 0 }, // students only

    // Feedback / onboarding proof (Phase 14/15 requirements)
    onboardedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    stellarPublicKey: this.stellarPublicKey,
    walletFunded: this.walletFunded,
    linkedStudents: this.linkedStudents,
    linkedParents: this.linkedParents,
    monthlyBudget: this.monthlyBudget,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
