// https-server.js
// HTTPS Express server for CA2 (static form + DB submit + health + db-test + CSP)

require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");

// HTTPS core modules
const https = require("https");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------- Middleware -------------------

// Parse form data + JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CSP MUST be BEFORE static + routes so it applies to all responses
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  next();
});

// Serve static files from project root folder (form.html, style.css, script.js)
app.use(express.static(__dirname));

// ------------------- MySQL Pool -------------------

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "ca2_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ------------------- Routes -------------------

// Redirect homepage to form
app.get("/", (req, res) => {
  res.redirect("/form.html");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send(`Server is running on port ${PORT} (HTTPS enabled)`);
});

// DB test endpoint
app.get("/db-test", async (req, res) => {
  try {
    const [dbRow] = await pool.query("SELECT DATABASE() AS db_name");
    const [tables] = await pool.query("SHOW TABLES");
    res.status(200).json({
      message: "✅ DB connection OK",
      connected_database: dbRow[0]?.db_name,
      tables,
    });
  } catch (err) {
    res.status(500).json({
      message: "❌ DB connection failed",
      error: err.message,
      code: err.code,
    });
  }
});

// CSP proof route (INLINE SCRIPT SHOULD BE BLOCKED by CSP)
// Use this for evidence: it should NOT show alert if CSP is working.
app.get("/csp-test", (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>CSP Test</title></head>
    <body>
      <h1>CSP header test page</h1>
      <p>If CSP is working, the inline script below should be blocked.</p>

      <script>
        alert("CSP TEST - this should be BLOCKED if CSP works");
      </script>
    </body>
    </html>
  `);
});

// ------------------- Security Helpers -------------------

// Basic SQL injection pattern detection (simple demo)
function looksLikeSqlInjection(value) {
  if (typeof value !== "string") return false;
  const pattern =
    /(--|#|\/\*|\*\/|\bUNION\b\s+\bSELECT\b|\b(OR|AND)\b\s+\d+\s*=\s*\d+|\bDROP\b\s+\bTABLE\b)/i;
  return pattern.test(value);
}

// Server-side validation rules
function validateFormData({ first_name, second_name, email, phone, eircode }) {
  const errors = [];

  // As per CA rules: letters OR numbers, max 20 chars
  const nameRegex = /^[A-Za-z0-9]{1,20}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;
  const eircodeRegex = /^[0-9][A-Za-z0-9]{5}$/; // starts with number, alphanumeric, 6 chars

  const fn = (first_name || "").trim();
  const sn = (second_name || "").trim();
  const em = (email || "").trim();
  const ph = (phone || "").trim();
  const ec = (eircode || "").trim().replace(/\s+/g, "").toUpperCase();

  if (!nameRegex.test(fn)) errors.push("Invalid first name");
  if (!nameRegex.test(sn)) errors.push("Invalid second name");
  if (!emailRegex.test(em)) errors.push("Invalid email");
  if (!phoneRegex.test(ph)) errors.push("Invalid phone");
  if (!eircodeRegex.test(ec)) errors.push("Invalid eircode");

  return { errors, cleaned: { fn, sn, em, ph, ec } };
}

// Handle form submission
app.post("/submit-form", async (req, res) => {
  try {
    // Simple SQL injection detection (demo)
    if (Object.values(req.body).some(looksLikeSqlInjection)) {
      return res.status(400).send("❌ SQL Injection attempt blocked.");
    }

    // Validate
    const { errors, cleaned } = validateFormData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // Insert cleaned values (IMPORTANT: use cleaned values)
    await pool.execute(
      "INSERT INTO mysql_table (first_name, second_name, email, phone, eircode) VALUES (?, ?, ?, ?, ?)",
      [cleaned.fn, cleaned.sn, cleaned.em, cleaned.ph, cleaned.ec]
    );

    res.status(200).send("✅ Form submitted successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Server error.");
  }
});

// ------------------- HTTPS Server Startup -------------------

// SSL certificate paths
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "ssl", "server.key")),
  cert: fs.readFileSync(path.join(__dirname, "ssl", "server.cert")),
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`✅ HTTPS Server running at https://localhost:${PORT}`);
});
