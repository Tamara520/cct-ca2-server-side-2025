// index.js
// Main server file for CA2 – handles CSV validation, form submission,
// middleware, security headers, and communication with the database.

const express = require("express");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const bodyParser = require("body-parser");
const helmet = require("helmet");
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

// ---------- 6.2 SECURITY: Content Security Policy (CSP) ----------
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
        },
    })
);

// Serve static files (HTML, CSS, client-side JS)
app.use(express.static(__dirname));

// Parse JSON and form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 5.2.1 Function to sanitize input (remove dangerous characters)
const sanitize = (value) => {
    return String(value || "")
        .replace(/['";]/g, "")
        .replace(/--/g, "")
        .replace(/[<>]/g, "")
        .replace(/[\0\x08\x09\x1a\n\r\t\\%]/g, "");
};

// 5.2.2 SQL Injection Protection Middleware
app.use((req, res, next) => {
    const body = req.body || {};
    const query = req.query || {};

    if (Object.keys(body).length === 0 && Object.keys(query).length === 0) {
        return next();
    }

    const payload = JSON.stringify({ body, query });
    const sqlInjectionPattern =
        /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bSELECT\b|--|;|'|")/i;

    if (sqlInjectionPattern.test(payload)) {
        console.error("❌ SQL Injection attempt detected:", payload);
        return res.status(400).send("SQL Injection attempt blocked.");
    }

    next();
});

// ---------- ROUTES ----------

// Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "form.html"));
});

// Validate CSV only
app.get("/validate-csv", (req, res, next) => {
    const csvFilePath = path.join(__dirname, "data", "data.csv");
    const invalidRows = [];
    let rowNumber = 2;

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
                invalidRows.push({
                    line: rowNumber,
                    errors,
                });
            }
            rowNumber++;
        })
        .on("end", () => {
            if (invalidRows.length === 0) {
                return res.json({ message: "All records are valid." });
            }
            res.status(400).json({ invalidRows });
        })
        .on("error", next);
});

// Import CSV
app.get("/import-csv", (req, res) => {
    validateSchema((schemaErr) => {
        if (schemaErr) {
            return res.status(500).send("Database schema error.");
        }

        const csvFilePath = path.join(__dirname, "data", "data.csv");
        const validRows = [];
        let rowNumber = 2;

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

                if (errors.length === 0) {
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
                    return res.send("No valid rows found.");
                }

                const insertQuery = `
                    INSERT INTO mysql_table
                    (first_name, second_name, email, phone, eircode)
                    VALUES ?
                `;

                db.query(insertQuery, [validRows], (err) => {
                    if (err) {
                        return res.status(500).send("Database insert error.");
                    }
                    res.send("CSV imported successfully.");
                });
            });
    });
});

// ---------- VALIDATION FUNCTION ----------
function validateRecord(firstName, secondName, email, phone, eircode) {
    const errors = [];
    const dangerous = /(DROP|DELETE|INSERT|UPDATE|SELECT|--|;|'|")/i;

    if (dangerous.test(firstName)) errors.push("Invalid first name");
    if (dangerous.test(secondName)) errors.push("Invalid second name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email");
    if (!/^[0-9]{10}$/.test(phone)) errors.push("Invalid phone");
    if (!/^[A-Za-z0-9]{7}$/.test(eircode.replace(/\s/g, "")))
        errors.push("Invalid eircode");

    return errors;
}

// ---------- FORM SUBMISSION ----------
app.post("/submit-form", (req, res) => {
    validateSchema(() => {
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
            return res.status(400).send(errors.join(", "));
        }

        const insertQuery = `
            INSERT INTO mysql_table
            (first_name, second_name, email, phone, eircode)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            insertQuery,
            [firstName, secondName, email, phone, eircode],
            () => res.send("Form submitted successfully.")
        );
    });
});

// ---------- HEALTH CHECK ----------
app.get("/health", (req, res) => {
    res.send("Server is running on port " + PORT);
});

// ---------- GLOBAL ERROR HANDLER ----------
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send("Internal server error.");
});

// ---------- START SERVER ----------
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 HTTP Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
