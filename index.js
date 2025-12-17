// index.js
// Main server file for CA2 – handles CSV validation, form submission,
// middleware, security headers, and communication with the database.

const express = require("express");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const bodyParser = require("body-parser");
const { db, validateSchema } = require("./database");

const app = express();
const PORT = 3000;

// ---------- MIDDLEWARE SECTION ----------

// 5.1.1 Request Logging Middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;

    console.log(`[${timestamp}] ${method} ${url}`);
    next();
});

// 5.1.2 Port Availability Check Middleware
app.use((req, res, next) => {
    if (!PORT) {
        console.error("❌ Server port is not configured.");
        return res.status(500).send("Server configuration error.");
    }
    next();
});

// 5.1.3 Schema Validation Middleware
app.use((req, res, next) => {
    validateSchema((error) => {
        if (error) {
            console.error(
                "❌ Schema validation middleware: schema is incorrect or missing."
            );
            return res
                .status(500)
                .send("Database schema is incorrect or missing.");
        }
        console.log("✅ Schema validation middleware passed.");
        next();
    });
});

// Basic security header to prevent simple XSS attacks using CSP
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    next();
});

// Serve static files (HTML, CSS, client-side JS)
app.use(express.static(__dirname));

// Parse JSON and form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 5.2.1 Function to sanitize input (remove dangerous characters)
const sanitize = (value) => {
    return String(value || "")
        .replace(/['";]/g, "") // remove quotes and semicolons
        .replace(/--/g, "") // remove SQL comment markers
        .replace(/[<>]/g, "") // remove HTML tag brackets (XSS)
        .replace(/[\0\x08\x09\x1a\n\r\t\\%]/g, ""); // remove control chars
};

// 5.2.2 SQL Injection Protection Middleware
app.use((req, res, next) => {
    const body = req.body || {};
    const query = req.query || {};

    // If both body and query are empty, skip SQL injection check
    if (Object.keys(body).length === 0 && Object.keys(query).length === 0) {
        return next();
    }

    const payload = JSON.stringify({ body, query });

    // Common SQL injection patterns
    const sqlInjectionPattern =
        /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bSELECT\b|--|;|'|")/i;

    if (sqlInjectionPattern.test(payload)) {
        console.error("❌ SQL Injection attempt detected:", payload);
        return res.status(400).send("SQL Injection attempt blocked.");
    }

    next();
});

// ---------- ROUTES ----------

// Homepage (load form.html)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "form.html"));
});

// ---------------------------------------------------------
// 3.2 Error Handling & Invalid Record Detection (Validation only)
// Route to validate CSV and report invalid records (no DB insert)
// ---------------------------------------------------------
app.get("/validate-csv", (req, res, next) => {
    const csvFilePath = path.join(__dirname, "data", "data.csv");

    const invalidRows = [];
    let rowNumber = 2; // line 1 = header, data starts at line 2

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
            const firstName = sanitize(row.first_name);
            const secondName = sanitize(row.second_name);
            const email = sanitize(row.email);
            const phone = sanitize(row.phone);
            const eircode = sanitize(row.eircode);

            const errors = validateRecord(
                firstName,
                secondName,
                email,
                phone,
                eircode
            );

            if (errors.length > 0) {
                console.warn(
                    `Invalid CSV record at line ${rowNumber}: ${errors.join(", ")}`
                );
                invalidRows.push({
                    line: rowNumber,
                    data: { firstName, secondName, email, phone, eircode },
                    errors: errors,
                });
            }

            rowNumber++;
        })
        .on("end", () => {
            if (invalidRows.length === 0) {
                return res.json({
                    message: "All records in data.csv are valid.",
                    invalidCount: 0,
                });
            }

            res.status(400).json({
                message: "CSV contains invalid records.",
                invalidCount: invalidRows.length,
                invalidRows: invalidRows,
            });
        })
        .on("error", (err) => {
            console.error("CSV read error in /validate-csv:", err.message);
            next(err);
        });
});

// ---------------------------------------------------------
// Route to import and validate CSV file, then insert valid rows
// ---------------------------------------------------------
app.get("/import-csv", (req, res) => {
    validateSchema((schemaErr) => {
        if (schemaErr) {
            return res.status(500).send("Database schema is incorrect. Check logs.");
        }

        const csvFilePath = path.join(__dirname, "data", "data.csv");

        const validRows = [];
        const invalidRows = [];
        let rowNumber = 2; // header is line 1

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on("data", (row) => {
                const firstName = sanitize(row.first_name);
                const secondName = sanitize(row.second_name);
                const email = sanitize(row.email);
                const phone = sanitize(row.phone);
                const eircode = sanitize(row.eircode);

                const errors = validateRecord(
                    firstName,
                    secondName,
                    email,
                    phone,
                    eircode
                );

                if (errors.length > 0) {
                    console.log(`Invalid row ${rowNumber}:`, errors.join(", "));
                    invalidRows.push({ row: rowNumber, errors });
                } else {
                    validRows.push([
                        firstName,
                        secondName,
                        email,
                        phone,
                        eircode,
                    ]);
                }

                rowNumber++;
            })
            .on("end", () => {
                if (validRows.length === 0) {
                    return res.send("CSV processed. No valid rows found.");
                }

                const insertQuery = `
                    INSERT INTO mysql_table
                    (first_name, second_name, email, phone, eircode)
                    VALUES ?
                `;

                db.query(insertQuery, [validRows], (err, result) => {
                    if (err) {
                        console.error("Error inserting CSV data:", err.message);
                        return res.status(500).send("Database insert error.");
                    }

                    let response = `
                        CSV Import Complete.<br>
                        Valid rows inserted: ${result.affectedRows}<br>
                    `;

                    if (invalidRows.length > 0) {
                        response +=
                            "Invalid rows: " +
                            invalidRows.map((x) => x.row).join(", ") +
                            "<br>Check server logs for details.";
                    }

                    res.send(response);
                });
            })
            .on("error", (err) => {
                console.error("CSV read error:", err.message);
                res.status(500).send("CSV reading error.");
            });
    });
});

// ---------- VALIDATION FUNCTION ----------
function validateRecord(firstName, secondName, email, phone, eircode) {
    const errors = [];

    // Extra protection: block SQL keywords or dangerous characters
    const dangerous = /(DROP|DELETE|INSERT|UPDATE|SELECT|--|;|'|")/i;
    if (dangerous.test(firstName)) errors.push("Invalid characters in first name");
    if (dangerous.test(secondName)) errors.push("Invalid characters in second name");
    if (dangerous.test(email)) errors.push("Invalid characters in email");
    if (dangerous.test(phone)) errors.push("Invalid characters in phone");
    if (dangerous.test(eircode)) errors.push("Invalid characters in eircode");

    // Name: letters and numbers, max 20 characters
    const nameRegex = /^[A-Za-z0-9]{1,20}$/;
    if (!nameRegex.test(firstName)) errors.push("Invalid first name");
    if (!nameRegex.test(secondName)) errors.push("Invalid second name");

    // Basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.push("Invalid email format");

    // Phone: exactly 10 digits
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) errors.push("Invalid phone number");

    // Eircode: allow Irish style (A65 F4E2 or A65F4E2)
    const compactEircode = eircode.replace(/\s/g, "");
    const eircodeRegex = /^[A-Za-z0-9]{7}$/;
    if (!eircodeRegex.test(compactEircode)) {
        errors.push("Invalid eircode format");
    }

    return errors;
}

// ---------- FORM SUBMISSION ----------
app.post("/submit-form", (req, res) => {
    validateSchema((schemaErr) => {
        if (schemaErr) {
            return res.status(500).send("Database schema error.");
        }

        const firstName = sanitize(req.body.first_name);
        const secondName = sanitize(req.body.second_name);
        const email = sanitize(req.body.email);
        const phone = sanitize(req.body.phone);
        const eircode = sanitize(req.body.eircode);

        const errors = validateRecord(
            firstName,
            secondName,
            email,
            phone,
            eircode
        );

        if (errors.length > 0) {
            return res.status(400).send("Form validation failed: " + errors.join(", "));
        }

        const insertQuery = `
            INSERT INTO mysql_table
            (first_name, second_name, email, phone, eircode)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            insertQuery,
            [firstName, secondName, email, phone, eircode],
            (err) => {
                if (err) {
                    console.error("Form insert error:", err.message);
                    return res.status(500).send("Database insert error.");
                }

                res.send("Form submitted and saved successfully.");
            }
        );
    });
});

// ---------- HEALTH CHECK ----------
app.get("/health", (req, res) => {
    console.log("🩺 /health route handler reached.");
    res.send("Server is running on port " + PORT);
});

// ---------- GLOBAL ERROR HANDLER (for unexpected errors) ----------
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack || err);
    res.status(500).send("Internal server error.");
});

// ---------- START SERVER (HTTP only when running index.js directly) ----------
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 HTTP Server running at http://localhost:${PORT}`);
    });
}

// Export Express app for HTTPS server
module.exports = app;
