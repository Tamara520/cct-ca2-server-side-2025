// database.js
// Responsible for MySQL connection, schema validation, and safe inserts.
// Verify mysql_table schema before inserting data
const mysql = require("mysql");

// IMPORTANT: Use environment variables in real submissions (avoid hardcoding passwords)
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Unitel@8",
  database: "ca2_database",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    return;
  }
  console.log("✅ Database connected successfully.");
});

// -------------------------------------------------------------
// Schema Validation
// -------------------------------------------------------------
const validateSchema = (callback) => {
  const tableQuery = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'ca2_database'
      AND TABLE_NAME = 'mysql_table';
  `;

  db.query(tableQuery, (err, results) => {
    if (err || !results || results.length === 0) {
      console.error("❌ Schema validation failed. Table 'mysql_table' not found.");
      return callback(new Error("Table missing"));
    }

    const requiredColumns = ["id", "first_name", "second_name", "email", "phone", "eircode"];
    const existingColumns = results.map((row) => row.COLUMN_NAME);

    const missingColumns = requiredColumns.filter((c) => !existingColumns.includes(c));
    if (missingColumns.length > 0) {
      console.error("❌ Schema validation failed. Missing columns: " + missingColumns.join(", "));
      return callback(new Error("Missing columns"));
    }

    console.log("✅ Schema validated successfully. All required columns are present.");
    return callback(null);
  });
};

// -------------------------------------------------------------
// A3: Safe Insert Logic (Parameterized + Batch Insert)
// -------------------------------------------------------------

/**
 * Batch insert validated rows into mysql_table using parameterized query.
 * Each record must already be validated in index.js.
 *
 * @param {Array<Object>} rows - Array of validated objects
 * @param {Function} callback - (err, result)
 */
const insertValidRows = (rows, callback) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return callback(null, { affectedRows: 0 });
  }

  // Map objects -> 2D array (batch values)
  const values = rows.map((r) => [
    r.id,
    r.first_name,
    r.second_name,
    r.email,
    r.phone,
    r.eircode,
  ]);

  // Parameterized batch insert: VALUES ?
  const sql = `
    INSERT INTO mysql_table (id, first_name, second_name, email, phone, eircode)
    VALUES ?
  `;

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("❌ Batch insert failed:", err.message);
      return callback(err);
    }
    console.log(`✅ Inserted ${result.affectedRows} valid record(s) into mysql_table.`);
    return callback(null, result);
  });
};

module.exports = { db, validateSchema, insertValidRows };
