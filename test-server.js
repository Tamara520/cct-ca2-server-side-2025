// test-server.js
const express = require("express");
const app = express();
const PORT = 3000;

// Simple logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[TEST LOG] ${timestamp} ${req.method} ${req.url}`);
    next();
});

// Simple health route
app.get("/health", (req, res) => {
    console.log("🩺 /health reached in test-server.js");
    res.send("TEST SERVER OK on port " + PORT);
});

// Start server
app.listen(PORT, () => {
    console.log(`🧪 Test server running at http://localhost:${PORT}`);
});
