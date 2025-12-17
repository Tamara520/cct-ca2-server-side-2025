// database.js
// This file is responsible for connecting to the MySQL database
// and validating that the required table and columns exist.

const mysql = require("mysql");

// Create the database connection object
const db = mysql.createConnection({
    host: "localhost",
    user: "root",          // your MySQL username
    password: "Unitel@8",  // MySQL password
    database: "ca2_database"
});

// Try to connect to the database when the app starts
db.connect((err) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
        return;
    }
    console.log("✅ Database connected successfully.");
});

// -------------------------------------------------------------
// Final, Correct, and Improved Schema Validation Function
// -------------------------------------------------------------
const validateSchema = (callback) => {
    // Check table exists
    const tableQuery = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'ca2_database'
        AND TABLE_NAME = 'mysql_table';
    `;

    db.query(tableQuery, (err, results) => {
        if (err || results.length === 0) {
            console.error("❌ Schema validation failed. Table 'mysql_table' not found.");
            return callback(new Error("Table missing"));
        }

        // List required columns
        const requiredColumns = [
            "id",
            "first_name",
            "second_name",
            "email",
            "phone",
            "eircode"
        ];

        // Extract existing column names
        const existingColumns = results.map((row) => row.COLUMN_NAME);

        // Find missing columns
        const missingColumns = requiredColumns.filter(
            (col) => !existingColumns.includes(col)
        );

        if (missingColumns.length > 0) {
            console.error(
                "❌ Schema validation failed. Missing columns: " +
                missingColumns.join(", ")
            );
            return callback(new Error("Missing columns"));
        }

        console.log("✅ Schema validated successfully. All required columns are present.");
        return callback(null);
    });
};

// Export the connection and schema validation
module.exports = { db, validateSchema };
