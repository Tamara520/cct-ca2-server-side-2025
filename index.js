// https-server.js
// CA2 - HTTPS + CSP + Input Sanitisation/Validation + DB Insert
// CSV row validation with row number tracking
// Invalid rows are skipped and logged
require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");

// HTTPS core modules
const https = require("https");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse form data + JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// -------------------- SECURITY: CSP HEADER (Figure D6/D7) --------------------
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  next();
});

// Serve static files (form.html, style.css, script.js)
app.use(express.static(__dirname));

// -------------------- DB (MySQL Pool) --------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "ca2_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// -------------------- SECURITY: INPUT SANITISATION + VALIDATION (Figure D9) --------------------
const sanitize = (value) => {
  // remove common XSS characters: < >
  return String(value || "").replace(/[<>]/g, "").trim();
};

function looksLikeSqlInjection(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  const pattern =
    /(--|#|\/\*|\*\/|\bUNION\b\s+\bSELECT\b|\b(OR|AND)\b\s+\d+\s*=\s*\d+|\bDROP\b\s+\bTABLE\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|('|%27|")\s*(OR|AND|UNION|SELECT|DROP|INSERT|UPDATE|DELETE)\b)/i;
  return pattern.test(v);
}

function validateFormData({ first_name, second_name, email, phone, eircode }) {
  const errors = [];

  // Marking rubric rules
  const nameRegex = /^[A-Za-z0-9]{1,20}$/;        // alphanumeric, max 20
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;                  // exactly 10 digits
  const eircodeRegex = /^[0-9][A-Za-z0-9]{5}$/;   // starts with digit, 6 chars

  const cleaned = {
    first_name: sanitize(first_name),
    second_name: sanitize(second_name),
    email: sanitize(email),
    phone: sanitize(phone),
    eircode: sanitize(eircode).replace(/\s+/g, "").toUpperCase(),
  };

  if (!nameRegex.test(cleaned.first_name))
    errors.push("Invalid first name (alphanumeric, max 20 chars).");

  if (!nameRegex.test(cleaned.second_name))
    errors.push("Invalid second name (alphanumeric, max 20 chars).");

  if (!emailRegex.test(cleaned.email))
    errors.push("Invalid email format.");

  if (!phoneRegex.test(cleaned.phone))
    errors.push("Invalid phone number (exactly 10 digits).");

  if (!eircodeRegex.test(cleaned.eircode))
    errors.push("Invalid eircode (start with a number, 6 alphanumeric).");

  return { errors, cleaned };
}

// -------------------- Routes --------------------

// Home page → form.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "form.html"));
});

// Health endpoint (optional)
app.get("/health", (req, res) => {
  res.status(200).send(`OK - HTTPS server running on port ${PORT}`);
});

// CSP test route (for D8 console proof)
app.get("/csp-test", (req, res) => {
  res.send(`
    <h1>CSP header test OK</h1>
    <script>
      alert("CSP TEST");
    </script>
  `);
});

// Handle form submission → validate + insert DB
app.post("/submit-form", async (req, res) => {
  try {
    const { first_name, second_name, email, phone, eircode } = req.body;

    // Block obvious SQL injection payloads (demo)
    const inputsToCheck = [first_name, second_name, email, phone, eircode];
    if (inputsToCheck.some(looksLikeSqlInjection)) {
      console.log("❌ SQL Injection attempt detected:", req.body);
      return res.status(400).send("SQL Injection attempt blocked.");
    }

    // Validate + sanitise
    const { errors, cleaned } = validateFormData({
      first_name,
      second_name,
      email,
      phone,
      eircode,
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Form validation failed",
        errors,
      });
    }

    // Insert using prepared statement
    const sql =
      "INSERT INTO mysql_table (first_name, second_name, email, phone, eircode) VALUES (?, ?, ?, ?, ?)";
    const params = [
      cleaned.first_name,
      cleaned.second_name,
      cleaned.email,
      cleaned.phone,
      cleaned.eircode,
    ];

    await pool.execute(sql, params);

    return res.status(200).send("✅ Form submitted successfully and saved to database.");
  } catch (err) {
    console.error("SUBMIT ERROR:", err.message);
    return res.status(500).send("Server error while saving form data.");
  }
});

// -------------------- HTTPS Server Startup (Figure D2/D3 proof) --------------------
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "ssl", "server.key")),
  cert: fs.readFileSync(path.join(__dirname, "ssl", "server.cert")),
};

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`✅ HTTPS Server running at https://localhost:${PORT}`);
});
