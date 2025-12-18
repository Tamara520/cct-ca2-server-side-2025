
---

## 🛠️ Technologies Used
- **Node.js**
- **Express.js**
- **MySQL (Workbench 8.0)**
- **HTML5**
- **CSS3**
- **JavaScript**
- **CSV-Parser**
- **Body-Parser**
- **Helmet (Security Middleware)**

---

## 🚀 Features Implemented

### ✔ 1. Database Connection (MySQL)
- Connects to MySQL using the `mysql` module  
- Logs connection success or failure  
- Validates database schema before inserting any data  

---

### ✔ 2. Schema Validation
Before inserting records, the system verifies that the required columns exist:

- `id`
- `first_name`
- `second_name`
- `email`
- `phone`
- `eircode`

If the schema is invalid or incomplete, the request is rejected safely.

---

### ✔ 3. Form Input Validation
User input is validated using strict server-side rules:

| Field | Validation Rule |
|------|-----------------|
| First Name | Alphanumeric, max 20 characters |
| Second Name | Alphanumeric, max 20 characters |
| Email | Valid email format |
| Phone | Exactly 10 digits |
| Eircode | 6–7 alphanumeric characters |

Invalid data is never inserted into the database.

---

### ✔ 4. CSV Import Feature
- Reads records from `/data/data.csv`  
- Validates each row using the same rules as form submission  
- Inserts only valid rows into the database  
- Logs invalid records for debugging  

---

### ✔ 5. Security Implementation
- Server-side input sanitization  
- Content Security Policy (CSP) implemented using **Helmet middleware**  
- Restricts resource loading to same origin (`'self'`)  
- Protects against Cross-Site Scripting (XSS) attacks  
- Request logging middleware enabled  

---

### ✔ 6. Express Routes Overview

| Route | Method | Description |
|------|--------|-------------|
| `/` | GET | Loads the user input form |
| `/submit-form` | POST | Validates and stores user data |
| `/import-csv` | GET | Imports CSV data into MySQL |
| `/health` | GET | Checks server status |

---

## 🗄 Database Schema

**Database Name:** `ca2_database`  
**Table Name:** `mysql_table`

| Column | Type | Description |
|-------|------|-------------|
| id | INT (Primary Key, AUTO_INCREMENT) | Unique record ID |
| first_name | VARCHAR(50) | User first name |
| second_name | VARCHAR(50) | User surname |
| email | VARCHAR(100) | Email address |
| phone | VARCHAR(20) | Phone number |
| eircode | VARCHAR(10) | Irish postal code |

---

## ▶️ How to Run the Application

### 1. Install dependencies
Ensure **Node.js** is installed.  
From the project root directory, run:

```bash
npm install
