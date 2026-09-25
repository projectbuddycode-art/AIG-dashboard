const crypto = require("crypto");
const fs = require("fs");

const secret = () => crypto.randomBytes(32).toString("hex");
const adminPass = secret().slice(0, 20);
const env = [
  'DATABASE_URL="file:./dev.db"',
  `AUTH_SECRET="${secret()}"`,
  'AUTH_URL="http://localhost:3000"',
  `CUSTOMER_JWT_SECRET="${secret()}"`,
  'ADMIN_EMAIL="admin@aig.local"',
  `ADMIN_PASSWORD="${adminPass}"`,
  'ADMIN_NAME="AIG Administrator"',
  "",
].join("\n");

fs.writeFileSync(".env", env);
fs.writeFileSync(".env.local", env);
console.log("Wrote .env and .env.local");
