/**
 * Set a user's password directly, using the same hashing the auth service uses.
 *
 * Usage:
 *   npm run db:set-password -- --email admin@atg.com --password 'Password123!'
 *
 * Prints the generated hash so it can also be applied by hand (e.g. pasted into
 * the Supabase SQL editor) when the database is not reachable from where this runs.
 */
const argon2 = require("argon2");
const { validatePasswordStrength } = require("../utils/validators");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].startsWith("--") ? argv[i].slice(2) : null;
    if (key) {
      args[key] = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function main() {
  const { email, password, "hash-only": hashOnly } = parseArgs(process.argv.slice(2));

  if (!email || !password) {
    console.error("Usage: node scripts/set-admin-password.js --email <email> --password <password> [--hash-only true]");
    process.exit(1);
  }

  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.isValid) {
    console.error(pwdCheck.message);
    process.exit(1);
  }

  const hashed = await argon2.hash(password);

  // Sanity check the hash round-trips before it goes anywhere near the database.
  if (!(await argon2.verify(hashed, password))) {
    console.error("Generated hash failed to verify against the password. Aborting.");
    process.exit(1);
  }

  console.log(`Hash: ${hashed}`);

  if (hashOnly) {
    console.log(`\nApply manually with:\n  UPDATE "User" SET password = '${hashed}' WHERE email = '${email}';`);
    return;
  }

  const { prisma } = require("../config/db");

  const user = await prisma.user.findFirst({ where: { email, d_status: "active" } });
  if (!user) {
    console.error(`No active user found with email ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetPasswordToken: null, resetPasswordExpires: null },
  });

  console.log(`Password updated for ${email} (id=${user.id}, role=${user.role}).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
