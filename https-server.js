// https-server.js
// Demonstration of HTTPS for Secure Transmission (Task 6.1)

const https = require("https");
const fs = require("fs");
const path = require("path");

// Import the Express app from index.js (so all middleware + routes are reused)
const app = require("./index");

// --- Load SSL certificate and key from /ssl folder ---
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "ssl", "server.key")),
    cert: fs.readFileSync(path.join(__dirname, "ssl", "server.cert"))
};

// Use non-privileged port to avoid admin permission issues on Windows
const HTTPS_PORT = 3443;

// Start HTTPS server
https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`🔐 HTTPS Server running securely at https://localhost:${HTTPS_PORT}`);
});
