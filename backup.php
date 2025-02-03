<?php
require 'vendor/autoload.php';

use Google\Cloud\Firestore\FirestoreClient;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$firestore = new FirestoreClient([
    'projectId' => 'your-project-id'
]);

$collections = ['parts', 'orders', 'users']; // Collections to back up
$backupDir = __DIR__ . "/backups/";
$logFile = __DIR__ . "/backup.log"; // 📌 Log file

// Email settings
$notifyEmail = "your-email@example.com"; // 🔹 Change to your email
$smtpHost = "smtp.example.com"; // 🔹 Change SMTP host
$smtpUsername = "your-smtp-username";
$smtpPassword = "your-smtp-password";
$smtpPort = 587; // 🔹 Use 465 for SSL, 587 for TLS

// Ensure backup directory exists
if (!file_exists($backupDir)) {
    mkdir($backupDir, 0777, true);
}

// Open log file
$log = fopen($logFile, 'a');
fwrite($log, "🕒 Backup started at " . date('Y-m-d H:i:s') . "\n");

$errors = [];

foreach ($collections as $collection) {
    try {
        $documents = $firestore->collection($collection)->documents();
        $data = [];

        foreach ($documents as $document) {
            $data[] = $document->data();
        }

        // Convert to JSON
        $jsonData = json_encode($data, JSON_PRETTY_PRINT);

        // ✅ Compress JSON with Gzip
        $backupFile = $backupDir . $collection . "_" . date('Y-m-d_H-i-s') . ".json.gz";
        $gzFile = gzopen($backupFile, 'w9'); // 'w9' = maximum compression
        gzwrite($gzFile, $jsonData);
        gzclose($gzFile);

        fwrite($log, "✅ Backup saved: $backupFile (" . round(strlen($jsonData) / 1024, 2) . " KB)\n");
    } catch (Exception $e) {
        $errorMsg = "❌ ERROR: Failed to backup $collection - " . $e->getMessage() . "\n";
        fwrite($log, $errorMsg);
        $errors[] = $errorMsg;
    }
}

// ✅ Keep only the last 30 backups (delete old ones)
$files = glob($backupDir . "*.json.gz");
usort($files, fn($a, $b) => filemtime($b) - filemtime($a));

if (count($files) > 30) {
    foreach (array_slice($files, 30) as $oldFile) {
        unlink($oldFile);
        fwrite($log, "🗑️ Deleted old backup: $oldFile\n");
    }
}

fwrite($log, "✅ Backup completed successfully at " . date('Y-m-d H:i:s') . "\n\n");
fclose($log);

// 🔴 If there were errors, send an email notification
if (!empty($errors)) {
    sendFailureEmail($errors, $notifyEmail, $smtpHost, $smtpUsername, $smtpPassword, $smtpPort);
}

echo "Backup completed successfully.\n";

// 📌 Function to send an email alert
function sendFailureEmail($errors, $toEmail, $smtpHost, $smtpUsername, $smtpPassword, $smtpPort)
{
    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->SMTPAuth = true;
        $mail->Username = $smtpUsername;
        $mail->Password = $smtpPassword;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // Use 'ssl' for port 465
        $mail->Port = $smtpPort;

        // Email content
        $mail->setFrom($smtpUsername, 'Backup System');
        $mail->addAddress($toEmail);
        $mail->Subject = '⚠ Backup Failure Alert!';
        $mail->Body = "🚨 Backup Failed! Details:\n\n" . implode("\n", $errors);

        // Send email
        $mail->send();
        echo "🚀 Backup failure email sent!\n";
    } catch (Exception $e) {
        echo "❌ Email notification failed: " . $mail->ErrorInfo . "\n";
    }
}
?>
