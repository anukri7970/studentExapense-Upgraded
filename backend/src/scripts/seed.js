/**
 * Seeds demo accounts for the 10-real-user onboarding requirement.
 *
 * Creates 3 parents, 5 students, and 2 universities, each with a real
 * generated + friendbot-funded Stellar testnet wallet, and links each
 * parent to roughly half the students so there's something to demo
 * immediately after seeding.
 *
 * This does NOT replace having real humans use the product — judges want
 * actual wallet interactions from actual people. What this gives you is a
 * fast way to stand up accounts for friends/classmates to log into (give
 * them the email/password you set here) instead of each of them waiting
 * through individual friendbot funding one at a time.
 *
 * Usage: npm run seed
 */
require('dotenv').config();

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const User = require('../models/User');
const { connectDatabase } = require('../config/database');
const { generateKeypair, fundWithFriendbot } = require('../services/stellarService');
const { encryptSecret } = require('../services/encryption');

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Demo12345!';

const PARENTS = [
  { name: 'Arjun Sharma', email: 'parent1@demo.local' },
  { name: 'Meera Patel', email: 'parent2@demo.local' },
  { name: 'Sanjay Gupta', email: 'parent3@demo.local' },
];

const STUDENTS = [
  { name: 'Aarav Sharma', email: 'student1@demo.local' },
  { name: 'Diya Patel', email: 'student2@demo.local' },
  { name: 'Rahul Gupta', email: 'student3@demo.local' },
  { name: 'Kavya Singh', email: 'student4@demo.local' },
  { name: 'Ishaan Desai', email: 'student5@demo.local' },
];

const UNIVERSITIES = [
  { name: 'Indian Institute of Technology Bombay', email: 'university1@demo.local' },
  { name: 'Delhi University', email: 'university2@demo.local' },
];

async function createUser({ name, email, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[seed] skip (already exists): ${email}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, Number(process.env.BCRYPT_SALT_ROUNDS) || 12);
  const { publicKey, secretKey } = generateKeypair();
  const stellarSecretEncrypted = encryptSecret(secretKey);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    stellarPublicKey: publicKey,
    stellarSecretEncrypted,
    monthlyBudget: role === 'student' ? 1000 : 0,
  });

  try {
    await fundWithFriendbot(publicKey);
    user.walletFunded = true;
    await user.save();
    console.log(`[seed] created + funded: ${email} (${role}) -> ${publicKey}`);
  } catch (err) {
    console.warn(`[seed] created but NOT funded (friendbot error): ${email} -> ${err.message}`);
  }

  return user;
}

async function main() {
  await connectDatabase();
  console.log('[seed] connected to MongoDB');
  console.log(`[seed] all accounts use password: ${DEMO_PASSWORD}\n`);

  const parents = [];
  for (const p of PARENTS) {
    parents.push(await createUser({ ...p, role: 'parent' }));
  }

  const students = [];
  for (const s of STUDENTS) {
    students.push(await createUser({ ...s, role: 'student' }));
  }

  for (const u of UNIVERSITIES) {
    await createUser({ ...u, role: 'university' });
  }

  // Link each parent to ~2 students round-robin so dashboards aren't empty.
  for (let i = 0; i < parents.length; i += 1) {
    const parent = parents[i];
    const linkedStudents = students.filter((_, idx) => idx % parents.length === i);
    for (const student of linkedStudents) {
      if (!parent.linkedStudents.some((id) => id.equals(student._id))) {
        parent.linkedStudents.push(student._id);
      }
      if (!student.linkedParents.some((id) => id.equals(parent._id))) {
        student.linkedParents.push(parent._id);
        await student.save();
      }
    }
    await parent.save();
  }

  console.log('\n[seed] done. Wallet addresses for your README proof table:');
  const all = await User.find({ email: { $regex: /@demo\.local$/ } }).select(
    'name email role stellarPublicKey'
  );
  all.forEach((u) => {
    console.log(`  ${u.role.padEnd(10)} ${u.email.padEnd(22)} ${u.stellarPublicKey}`);
  });

  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
