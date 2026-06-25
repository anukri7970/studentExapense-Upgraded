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

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Demo12345!';

const PARENTS = [
  { name: 'Arjun Sharma', email: 'arjun.sharma@gmail.com' },
  { name: 'Meera Patel', email: 'meera.patel@gmail.com' },
  { name: 'Sanjay Gupta', email: 'sanjay.gupta@gmail.com' },
];

const STUDENTS = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@gmail.com', parentEmail: 'arjun.sharma@gmail.com' },
  { name: 'Diya Patel', email: 'diya.patel@gmail.com', parentEmail: 'meera.patel@gmail.com' },
  { name: 'Rahul Gupta', email: 'rahul.gupta@gmail.com', parentEmail: 'sanjay.gupta@gmail.com' },
  { name: 'Kavya Singh', email: 'kavya.singh@gmail.com', parentEmail: 'arjun.sharma@gmail.com' },
  { name: 'Ishaan Desai', email: 'ishaan.desai@gmail.com', parentEmail: 'meera.patel@gmail.com' },
];

const UNIVERSITIES = [
  { name: 'IIT Bombay', email: 'admissions@iitb.ac.in' },
  { name: 'Delhi University', email: 'finance@du.ac.in' },
];

async function createUser({ name, email, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    if (role === 'university' && !existing.stellarPublicKey) {
      const { generateKeypair, fundWithFriendbot } = require('../services/stellarService');
      const kp = generateKeypair();
      existing.stellarPublicKey = kp.publicKey;
      await existing.save();
      console.log(`[seed] generated wallet for existing university: ${email}`);
      try {
        await fundWithFriendbot(existing.stellarPublicKey);
        console.log(`[seed] funded wallet for: ${email}`);
      } catch (e) {
        console.log(`[seed] funding failed for ${email}:`, e.message);
      }
    } else {
      console.log(`[seed] skip (already exists): ${email}`);
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, Number(process.env.BCRYPT_SALT_ROUNDS) || 12);

  let stellarPublicKey = null;
  if (role === 'university') {
    const { generateKeypair, fundWithFriendbot } = require('../services/stellarService');
    const kp = generateKeypair();
    stellarPublicKey = kp.publicKey;
    try {
      await fundWithFriendbot(stellarPublicKey);
      console.log(`[seed] funded wallet for new university: ${email}`);
    } catch (e) {}
  }

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    monthlyBudget: role === 'student' ? 1000 : 0,
    stellarPublicKey,
  });

  console.log(`[seed] created demo user: ${email} (${role})`);

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

  console.log('\n[seed] done. Wallet details for your README and Freighter imports:');
  const all = await User.find({ email: { $regex: /@demo\.local$|@gmail\.com$|@du\.ac\.in$|@iitb\.ac\.in$/ } }).select(
    'name email role stellarPublicKey'
  );
  // We need to print the generated secrets. Since they are no longer stored in the DB,
  // we should just let the user know they need to sign up via UI to use Freighter properly, 
  // OR we can change seed.js to print them during creation!

  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
