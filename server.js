// https-server.js
// CA2 HTTPS Server: form + DB submit + health + db-test + CSP + sanitisation

require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");

// HTTPS modules
const https = require("https");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2) Static files (form.html, style.css, script.js in project root)
app.use(express.static(path.join(__dirname)));

// -------------------- SECURITY: CSP HEADER (Figure D6) --------------------
app.use((req, res, next) => {
  // Simple CSP suitable for CA2: allow only self resources
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  next();
});

// -------------------- DB POOL --------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "ca2_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// -------------------- HELPERS: Sanitisation + Validation --------------------

// Remove dangerous angle brackets (basic XSS prevention)
function sanitize(value) {
  return String(value || "").replace(/[<>]/g, "");
}

// Basic SQL injection pattern detection (demo-level)
function looksLikeSqlInjection(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  const pattern =
    /(--|#|\/\*|\*\/|\bUNION\b\s+\bSELECT\b|\b(OR|AND)\b\s+\d+\s*=\s*\d+|\bDROP\b\s+\bTABLE\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b)/i;
  return pattern.test(v);
}

// Server-side validation rules (match marking rubric)
function validateFormData({ first_name, second_name, email, phone, eircode }) {
  const errors = [];

  const nameRegex = /^[A-Za-z0-9]{1,20}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;
  const eircodeRegex = /^[0-9][A-Za-z0-9]{5}$/;

  const fn = sanitize(first_name).trim();
  const sn = sanitize(second_name).trim();
  const em = sanitize(email).trim();
  const ph = sanitize(phone).trim();
  const ec = sanitize(eircode).trim().replace(/\s+/g, "").toUpperCase();

  if (!nameRegex.test(fn)) errors.push("Invalid first name (alphanumeric, max 20).");
  if (!nameRegex.test(sn)) errors.push("Invalid second name (alphanumeric, max 20).");
  if (!emailRegex.test(em)) errors.push("Invalid email format.");
  if (!phoneRegex.test(ph)) errors.push("Invalid phone number (exactly 10 digits).");
  if (!eircodeRegex.test(ec)) errors.push("Invalid eircode (start with a number, 6 alphanumeric).");

  return {
    errors,
    cleaned: { first_name: fn, second_name: sn, email: em, phone: ph, eircode: ec },
  };
}

// -------------------- ROUTES --------------------

// Home -> form.html
app.get("/", (req, res) => {
  res.redirect("/form.html");
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).send(`HTTPS server is running on port ${PORT}`);
});

// DB test
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

// Handle form submission -> insert to DB (prepared statement)
app.post("/submit-form", async (req, res) => {
  try {
    const { first_name, second_name, email, phone, eircode } = req.body;

    // block obvious SQL injection payloads (demo)
    const inputsToCheck = [first_name, second_name, email, phone, eircode];
    if (inputsToCheck.some(looksLikeSqlInjection)) {
      return res.status(400).send("SQL Injection attempt blocked.");
    }

    // validate + sanitise (XSS prevention)
    const { errors, cleaned } = validateFormData({
      first_name,
      second_name,
      email,
      phone,
      eircode,
    });

    if (errors.length > 0) {
      return res.status(400).json({ message: "Form validation failed", errors });
    }

    // ✅ Prepared statement prevents SQL injection
    const sql =
      "INSERT INTO mysql_table (first_name, second_name, email, phone, eircode) VALUES (?, ?, ?, ?, ?)";
    await pool.execute(sql, [
      cleaned.first_name,
      cleaned.second_name,
      cleaned.email,
      cleaned.phone,
      cleaned.eircode,
    ]);

    return res.status(200).send("✅ Form submitted successfully and saved to database.");
  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    return res.status(500).send("Server error while saving form data.");
  }
});

// -------------------- HTTPS STARTUP (Figure D2) --------------------

// Uses existing SSL files in /ssl folder:
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "ssl", "server.key")),
  cert: fs.readFileSync(path.join(__dirname, "ssl", "server.cert")),
};

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`✅ HTTPS Server running at https://localhost:${PORT}`);
});
