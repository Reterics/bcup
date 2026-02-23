<?php
require '../security.php';

$backupDir = __DIR__ . "/backups/";
$action = $_GET['action'] ?? null;
$file = $_GET['file'] ?? null;

if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

$body = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'list':
        listBackups($backupDir);
        break;
    case 'create':
        $collection = $body['collection'] ?? null;
        $documents = $body['documents'] ?? null;
        $project = $body['project'] ?? null;
        createBackup($backupDir, $collection, $documents, $project);
        break;
    case 'delete':
        $file = $body['file'] ?? null;
        deleteBackup($backupDir, $file);
        break;
    case 'restore':
        $restoreFile = $body['file'] ?? null;
        restoreBackup($backupDir, $restoreFile);
        break;
    case 'download':
        $fileToDownload = $file ?: ($body['file'] ?? null);
        downloadBackup($backupDir, $fileToDownload);
        break;
    default:
        echo json_encode(["error" => "Invalid action"]);
}

// --- Actions ---

function listBackups($backupDir): void
{
    $files = glob($backupDir . "*.json.gz");
    $backups = array_map(fn($file) => enrichBackupMetadata($file), $files);

    echo json_encode(["success" => true, "data" => $backups]);
}

function enrichBackupMetadata(string $filePath): array
{
    $fileName = basename($filePath);
    $collectionName = explode('_', $fileName)[0];

    $documentCount = null;
    try {
        $gz = gzopen($filePath, 'r');
        if ($gz !== false) {
            $jsonData = '';
            while (!gzeof($gz)) {
                $chunk = gzread($gz, 8192);
                if ($chunk === false) {
                    break;
                }
                $jsonData .= $chunk;
                if (strlen($jsonData) > 5_000_000) {
                    break;
                }
            }
            gzclose($gz);
            $decoded = json_decode($jsonData, true);
            if (is_array($decoded) && isset($decoded['documents']) && is_array($decoded['documents'])) {
                $documentCount = count($decoded['documents']);
            } elseif (is_array($decoded) && !isset($decoded['documents'])) {
                // Legacy format: top-level array of documents
                $documentCount = count($decoded);
            }
        }
    } catch (\Throwable $e) {
        $documentCount = null;
    }

    return [
        "file" => $fileName,
        "timestamp" => filemtime($filePath),
        "collection" => $collectionName,
        "documents" => $documentCount,
        "size" => filesize($filePath),
    ];
}

function createBackup($backupDir, $collection, $documents, $project): void
{
    if (!$collection || !is_array($documents)) {
        onError("Missing collection name or documents data");
        return;
    }

    try {
        $backupData = [
            'collection' => $collection,
            'documents' => $documents,
            'createdAt' => date('c'),
        ];

        if ($project) {
            $backupData['project'] = $project;
        }

        $jsonData = json_encode($backupData, JSON_PRETTY_PRINT);
        $backupFile = $backupDir . $collection . "_" . date('Y-m-d_H-i-s') . ".json.gz";

        $gzFile = gzopen($backupFile, 'w9');
        gzwrite($gzFile, $jsonData);
        gzclose($gzFile);

        echo json_encode([
            "success" => true,
            "data" => ["collection" => $collection, "file" => basename($backupFile)],
        ]);
    } catch (\Exception $e) {
        onError("Failed to create backup: " . $e->getMessage());
    }
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

function downloadBackup($backupDir, $file): void
{
    if (!$file) {
        onError("File not specified");
        return;
    }

    $safeFile = basename($file);
    $fullPath = $backupDir . $safeFile;

    if (!file_exists($fullPath)) {
        onError("File not found");
        return;
    }

    header('Content-Type: application/gzip');
    header('Content-Disposition: attachment; filename="' . $safeFile . '"');
    header('Content-Length: ' . filesize($fullPath));
    readfile($fullPath);
    exit;
}

function restoreBackup($backupDir, $file): void
{
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

    // New format: { collection, documents, project, createdAt }
    if (isset($data['documents']) && is_array($data['documents'])) {
        echo json_encode([
            "success" => true,
            "collection" => $data['collection'] ?? explode('_', $file)[0],
            "documents" => $data['documents'],
            "project" => $data['project'] ?? null,
        ]);
        return;
    }

    // Legacy format: top-level array of documents
    $collectionName = explode('_', $file)[0];
    echo json_encode([
        "success" => true,
        "collection" => $collectionName,
        "documents" => $data,
    ]);
}

function onError($errorMessage): void
{
    echo json_encode(["success" => false, "error" => $errorMessage]);
}
