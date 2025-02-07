<?php
require '../security.php';
require '../vendor/autoload.php';

use Kreait\Firebase\Factory;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

global $firestore;

$backupDir = __DIR__ . "/backups/";
$action = $_GET['action'] ?? null;
$email = $_GET['email'] ?? null;

switch ($action) {
    case 'list':
        listBackups($backupDir);
        break;
    case 'create':
        initFirestore();
        createBackup($backupDir);
        break;
    case 'delete':
        $file = $_POST['file'] ?? null;
        deleteBackup($backupDir, $file);
        break;
    case 'restore':
        initFirestore();
        $file = $_POST['file'] ?? null;
        restoreBackup($backupDir, $file);
        break;
    default:
        echo json_encode(["error" => "Invalid action"]);
}

function initFirestore(): void
{
  global $firestore;
  // Initialize Firebase with the JSON key file
  $factory = (new Factory)->withServiceAccount($_ENV['FIRESTORE_SERVICE_ACCOUNT']);
  $firestore = $factory->createFirestore()->database();
}

function listBackups($backupDir): void
{
    $files = glob($backupDir . "*.json.gz");
    $backups = array_map(fn($file) => [
        "file" => basename($file),
        "timestamp" => filemtime($file)
    ], $files);

    echo json_encode(["success" => true, "data" => $backups]);
}



function createBackup($backupDir): void
{
  global $email, $firestore;
  $collections = ['parts', 'orders', 'users'];
  $response = [];
  $errors = [];
  $success = true;

  try {


    foreach ($collections as $collection) {
      try {
        $documents = $firestore->collection($collection)->documents();
        $data = [];

        foreach ($documents as $document) {
          $data[] = $document->data();
        }

        $jsonData = json_encode($data, JSON_PRETTY_PRINT);
        $backupFile = $backupDir . $collection . "_" . date('Y-m-d_H-i-s') . ".json.gz";

        $gzFile = gzopen($backupFile, 'w9');
        gzwrite($gzFile, $jsonData);
        gzclose($gzFile);

        $response[] = ["collection" => $collection, "file" => basename($backupFile)];
      } catch (Exception $e) {
        $errorMsg = "❌ ERROR: Failed to backup $collection - " . $e->getMessage() . "\n";
        $response[] = ["collection" => $collection, "error" => $errorMsg];
        $errors[] = $errorMsg;
        $success = false;
      }
    }
  } catch (Exception $e) {
    $errors[] = "❌ ERROR: Firebase initialization failed - " . $e->getMessage();
    $success = false;
  }

  if ($success === false && $email) {
    sendFailureEmail(implode("\n", $errors));
  }
  echo json_encode(["success" => $success, "data" => $response]);
}

function deleteBackup($backupDir, $file): void
{
    if ($file && file_exists($backupDir . $file)) {
        unlink($backupDir . $file);
        echo json_encode(["success" => true, "message" => "Backup deleted"]);
    } else {
        onError("File not found");
    }
}


function restoreBackup($backupDir, $file): void
{
    global $firestore;
    if (!$file || !file_exists($backupDir . $file)) {
        onError("Backup file not found");
        return;
    }

    $gzFile = gzopen($backupDir . $file, 'r');
    $jsonData = '';
    while (!gzeof($gzFile)) {
        $jsonData .= gzread($gzFile, 4096);
    }
    gzclose($gzFile);

    $data = json_decode($jsonData, true);
    if (!$data) {
        onError("Invalid backup data");
        return;
    }

    $collectionName = explode('_', $file)[0];
    $collectionRef = $firestore->collection($collectionName);

    foreach ($data as $doc) {
        $collectionRef->document($doc['id'])->set($doc);
    }

    echo json_encode(["success" => true, "message" => "Backup restored"]);
}


function sendFailureEmail($errorMessage): void
{
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.example.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'your-smtp-username';
        $mail->Password = 'your-smtp-password';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->setFrom('your-email@example.com', 'Backup System');
        $mail->addAddress('notify-email@example.com');
        $mail->Subject = '⚠ Backup Failure Alert!';
        $mail->Body = "🚨 Backup Failed! Error details:\n\n" . $errorMessage;

        $mail->send();
    } catch (Exception $e) {
        echo "❌ Email notification failed: " . $mail->ErrorInfo . "\n";
    }
}

function onError($errorMessage): void
{
    global $email;
    echo json_encode(["error" => $errorMessage]);
    if ($email) {
        sendFailureEmail($errorMessage);
    }
}
