/**
 * Generate the first 20 referral codes and save to data/referrals.json (same path server uses when run from project root).
 * Run from project root: node server/scripts/generate-referral-codes.js
 * Or call POST /api/referral/admin/generate-initial-codes with admin wallet (body: { count: 20 }).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REFERRAL_FILE = path.join(__dirname, "..", "..", "data", "referrals.json");
const REFERRAL_INITIAL_CODE_USES = 1;

function generateReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function main() {
  const dataDir = path.dirname(REFERRAL_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  let data = { initialCodes: [], users: {}, referrerClaimable: {} };
  if (fs.existsSync(REFERRAL_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(REFERRAL_FILE, "utf8"));
    } catch (_) {}
  }

  const existing = new Set(data.initialCodes.map((c) => c.code));
  for (const u of Object.values(data.users || {})) {
    if (u.myCode) existing.add(u.myCode);
  }

  const count = 20;
  const added = [];
  for (let i = 0; i < count; i++) {
    let code = generateReferralCode();
    while (existing.has(code)) code = generateReferralCode();
    existing.add(code);
    data.initialCodes.push({ code, usesLeft: REFERRAL_INITIAL_CODE_USES });
    added.push(code);
  }

  fs.writeFileSync(REFERRAL_FILE, JSON.stringify(data, null, 2));
  console.log("Generated 20 referral codes:");
  added.forEach((c) => console.log("  ", c));
  console.log("Saved to", REFERRAL_FILE);
}

main();
