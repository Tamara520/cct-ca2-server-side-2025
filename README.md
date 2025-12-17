# CA2 – Server-Side Programming  
**Author:** Tsolmon Jargalsaikan  
**Course:** BSc in Computing – Server-Side Programming  
**Instructor:** Michael Weiss  
**Year:** 2025  

---

## 📌 Project Overview
This project demonstrates a complete server-side application developed using **Node.js**, **Express**, and **MySQL**.  
The system performs:

- Client-side & server-side validation  
- Secure data sanitization  
- Database schema validation  
- Dynamic form submission  
- CSV file import  
- Logging & basic security headers  

Valid data is saved into a MySQL database table called `mysql_table`.

---

## 📁 Project Structure


---

## 🛠️ Technologies Used
- **Node.js**
- **Express.js**
- **MySQL (Workbench 8.0)**
- **HTML5**
- **CSS3**
- **CSV-Parser (for reading CSV files)**
- **Body-Parser**

---

## 🚀 Features Implemented

### ✔ 1. Database Connection (MySQL)
- Connects using the `mysql` module  
- Logs success/failure  
- Validates schema on every insert

### ✔ 2. Schema Validation
Before inserting data, the system checks:

Required columns:
- `id`
- `first_name`
- `second_name`
- `email`
- `phone`
- `eircode`

If anything is missing → request is rejected safely.

### ✔ 3. Form Input Validation
Validation rules include:

| Field | Validation Rule |
|-------|-----------------|
| First Name | A–Z / 0–9, max 20 chars |
| Second Name | A–Z / 0–9, max 20 chars |
| Email | Standard email format |
| Phone | 10 digits |
| Eircode | 6 characters, starting with a digit |

Invalid data never reaches the database.

### ✔ 4. CSV Import Feature
- Reads data from `/data/data.csv`
- Validates each row using same server rules
- Inserts valid rows into MySQL
- Logs invalid rows in console

### ✔ 5. Security
- Input sanitization (removes `<` and `>`)
- CSP header: `default-src 'self'`
- Prevents simple XSS attacks
- Middleware logs every request

### ✔ 6. Express Routes Overview

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Loads the form UI |
| `/submit-form` | POST | Validates + stores data |
| `/import-csv` | GET | Imports data.csv into MySQL |
| `/health` | GET | Debug route → checks server status |

---

## 🗄 Database Schema

**Database:** `ca2_database`  
**Table:** `mysql_table`

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, AUTO_INCREMENT) | Unique ID |
| first_name | VARCHAR(50) | User’s first name |
| second_name | VARCHAR(50) | User’s surname |
| email | VARCHAR(100) | Email address |
| phone | VARCHAR(20) | Phone number |
| eircode | VARCHAR(10) | Irish postal code |

---

## ▶️ How to Run the Application

### 1. Install dependencies
```bash
npm install
