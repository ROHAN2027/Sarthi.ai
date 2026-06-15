import mongoose from 'mongoose';

/**
 * User Schema — supports both Email/Password and Google OAuth authentication.
 *
 * Design decisions:
 * - `password` is optional: Google OAuth users don't have one.
 * - `googleId` is optional: email/password users don't have one.
 * - `email` is unique + lowercase: prevents duplicate accounts and case-sensitivity bugs.
 * - No pre-save password hashing hook: we hash explicitly in the controller for
 *   transparency and testability. Hooks can silently double-hash if you call .save()
 *   after a find, which is a common bug.
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "Why make the password field optional instead of using two separate models?"
 * A:  A single User model with optional fields is simpler and allows account linking.
 *     If a user signs up with Google first, they can later set a password to also
 *     log in via email. Two models would make this merge painful and violate DRY.
 *
 * Q2: "Why store `googleId` separately instead of using email as the unique identifier?"
 * A:  A user might change their email on Google. The `googleId` (Google's `sub` claim)
 *     is immutable and guaranteed unique. We use it as the primary lookup for OAuth,
 *     falling back to email for account linking.
 *
 * Q3: "What is the `select: false` option on the password field?"
 * A:  It excludes the password hash from all queries by default (e.g., `User.find()`
 *     won't return it). You must explicitly opt in with `User.findById(id).select('+password')`.
 *     This is a defense-in-depth measure — even if a developer forgets to sanitize
 *     the response, the hash is never accidentally sent to the client.
 * ──────────────────────────────────────────────────────────────────────────
 */

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  },

  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Never return password hash in queries by default
  },

  googleId: {
    type: String,
    sparse: true, // Allows multiple null values while enforcing uniqueness for non-null
  },

  avatar: {
    type: String,
    default: function () {
      // Generate a deterministic avatar URL using UI Avatars service
      const encodedName = encodeURIComponent(this.name || 'User');
      return `https://ui-avatars.com/api/?name=${encodedName}&background=E8E0FF&color=6C63FF&bold=true&size=128`;
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster lookups
userSchema.index({ googleId: 1 });

const User = mongoose.model('User', userSchema);

export default User;
