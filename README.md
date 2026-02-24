<p align="center">
  <img src="./img/logo_128.png" />
</p>

# 🔥 B'Cup

### Firestore Backup & Restore with PHP & React

This project provides a **reliable backup and restore solution for Firestore**, using **PHP Cron Jobs**, **Gzip compression**, and **Email notifications for failures**.

## 🎯 Features
✅ **Automated Firestore backups** (JSON format, compressed as `.gz`)  
✅ **Restores data from the latest backup**  
✅ **Keeps only the last 30 backups (auto-cleanup)**  
✅ **Logs all backup and restore operations**  
✅ **Sends an email alert if a backup fails**

---

## 🛠 Installation & Setup

### 1️⃣ Install Dependencies
First, install the required PHP libraries along with NPM Packages:

```sh
npm install
cd api
composer install
```

### 2️⃣ Configure Firestore & SMTP Credentials
Create a `.env` file or edit the PHP files directly with your settings:

#### **Firestore Credentials**
Ensure your Firestore service account is set up.  
Update `projectId` in the scripts:

```php
$firestore = new FirestoreClient([
    'projectId' => 'your-project-id'
]);
```

#### **Email (SMTP) Settings**
Update your SMTP credentials in `api/index.php`:

```php
$notifyEmail = "your-email@example.com"; 
$smtpHost = "smtp.example.com"; 
$smtpUsername = "your-smtp-username";
$smtpPassword = "your-smtp-password";
$smtpPort = 587; // Use 465 for SSL, 587 for TLS
```

---

## 📌 API Endpoints

### 🔄 **List Backups**
- **URL:** `GET /php_api_boilerplate.php?action=list`
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {"file": "parts_2025-02-03_12-00-00.json.gz", "timestamp": 1706961600 }
    ]
  }
  ```

### 🔄 **Create a Backup**
- **URL:** `GET /php_api_boilerplate.php?action=create`
- **Response:**
  ```json
  {
    "success": true,
    "data": [{ "collection": "parts", "file": "parts_2025-02-03_12-00-00.json.gz" }]
  }
  ```

### 🗑️ **Delete a Backup**
- **URL:** `POST /php_api_boilerplate.php?action=delete`
- **Body:** `{ "file": "parts_2025-02-03_12-00-00.json.gz" }`
- **Response:**
  ```json
  { "success": true, "message": "Backup deleted" }
  ```

### 🔄 **Restore a Backup**
- **URL:** `POST /php_api_boilerplate.php?action=restore`
- **Body:** `{ "file": "parts_2025-02-03_12-00-00.json.gz" }`
- **Response:**
  ```json
  { "success": true, "message": "Backup restored" }
  ```


### 3️⃣ Set Up Cron Jobs
Schedule the backup script to run daily at **3 AM**:

```sh
crontab -e
```

Add the following line:
```sh
0 3 * * * php /path/to/backup.php >> /path/to/backup.log 2>&1
```

---

## 📌 Usage

### 🔄 **Run Backup Manually**
To run a backup manually, execute:

```sh
php backup.php
```

---

## 🚀 How It Works
1️⃣ The **backup script** retrieves Firestore data and saves it as **compressed JSON (`.gz`)**.  
2️⃣ The **restore script** loads the latest `.gz` file and writes data back to Firestore.  
3️⃣ A **cron job automates daily backups** and keeps only the last 30 files.  
4️⃣ If a backup **fails**, an **email alert** is sent via SMTP.

---

## ⚠ Troubleshooting

### 🔹 "No backup files found"
- Ensure backups exist in the `backups/` directory.
- Check the cron job is running correctly.

### 🔹 "Backup failed due to Firestore error"
- Verify Firestore credentials are correct.
- Ensure the service account has **read access**.

### 🔹 "Email not sent"
- Check your SMTP credentials.
- Try using **port 465 (SSL)** instead of **587 (TLS)**.

---

## 📄 License
This project is open-source under the **MIT License**.

---

## 🎉 Contributing
Feel free to submit **pull requests** or report issues!

For more information [open the contribution guide!](./CONTRIBUTION.md)

---
🚀 **Happy Backing Up!** 🚀
