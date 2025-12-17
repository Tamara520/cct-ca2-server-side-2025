const fs = require("fs");
const path = require("path");
const selfsigned = require("selfsigned");

// Generate a self-signed cert for localhost
const attrs = [{ name: "commonName", value: "localhost" }];
const pems = selfsigned.generate(attrs, {
  days: 365,
  keySize: 2048,
  algorithm: "sha256"
});

// DEBUG: show what selfsigned returned
console.log("selfsigned keys:", Object.keys(pems));

const sslDir = path.join(__dirname, "ssl");
fs.mkdirSync(sslDir, { recursive: true });

// Be defensive about property names across versions
const keyData = pems.private || pems.privateKey || pems.key;
const certData = pems.cert || pems.certificate;

if (!keyData || !certData) {
  console.error("❌ Could not find key/cert data in selfsigned output.");
  console.error("pems keys:", Object.keys(pems));
  process.exit(1);
}

fs.writeFileSync(path.join(sslDir, "server.key"), keyData);
fs.writeFileSync(path.join(sslDir, "server.cert"), certData);

console.log("✅ SSL certificate generated successfully");
console.log("Key:", path.join(sslDir, "server.key"));
console.log("Cert:", path.join(sslDir, "server.cert"));
