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
        $collections = $body['collections'] ?? null;
        $project = $body['project'] ?? null;
        createBackup($backupDir, $collections, $project);
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

    $documentCount = null;
    $collectionNames = [];

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
            if (is_array($decoded)) {
                if (isset($decoded['collections']) && is_array($decoded['collections'])) {
                    // New unified format
                    $collectionNames = array_keys($decoded['collections']);
                    $documentCount = 0;
                    foreach ($decoded['collections'] as $docs) {
                        if (is_array($docs)) {
                            $documentCount += count($docs);
                        }
                    }
                } elseif (isset($decoded['documents']) && is_array($decoded['documents'])) {
                    // Old single-collection format
                    $collectionNames = [$decoded['collection'] ?? explode('_', $fileName)[0]];
                    $documentCount = count($decoded['documents']);
                } elseif (!isset($decoded['documents']) && !isset($decoded['collections'])) {
                    // Legacy format: top-level array of documents
                    $collectionNames = [explode('_', $fileName)[0]];
                    $documentCount = count($decoded);
                }
            }
        }
    } catch (\Throwable $e) {
        $documentCount = null;
    }

    return [
        "file" => $fileName,
        "timestamp" => filemtime($filePath),
        "collections" => $collectionNames,
        "documents" => $documentCount,
        "size" => filesize($filePath),
    ];
}

function createBackup($backupDir, $collections, $project): void
{
    if (!is_array($collections) || empty($collections)) {
        onError("Missing collections data");
        return;
    }

    try {
        $backupData = [
            'collections' => $collections,
            'createdAt' => date('c'),
        ];

        if ($project) {
            $backupData['project'] = $project;
        }

        $jsonData = json_encode($backupData, JSON_PRETTY_PRINT);
        $backupFile = $backupDir . "backup_" . date('Y-m-d_H-i-s') . ".json.gz";

        $gzFile = gzopen($backupFile, 'w9');
        gzwrite($gzFile, $jsonData);
        gzclose($gzFile);

        echo json_encode([
            "success" => true,
            "data" => [
                "collections" => array_keys($collections),
                "file" => basename($backupFile),
            ],
        ]);
    } catch (\Exception $e) {
        onError("Failed to create backup: " . $e->getMessage());
    }
}

function deleteBackup($backupDir, $file): void
{
    $file = $file ? basename($file) : null;
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
    $file = $file ? basename($file) : null;
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

    // New unified format: { collections: { col1: [...], col2: [...] }, ... }
    if (isset($data['collections']) && is_array($data['collections'])) {
        echo json_encode([
            "success" => true,
            "collections" => $data['collections'],
            "project" => $data['project'] ?? null,
        ]);
        return;
    }

    // Old single-collection format: { collection, documents, ... }
    if (isset($data['documents']) && is_array($data['documents'])) {
        $collectionName = $data['collection'] ?? explode('_', $file)[0];
        echo json_encode([
            "success" => true,
            "collections" => [$collectionName => $data['documents']],
            "project" => $data['project'] ?? null,
        ]);
        return;
    }

    // Legacy format: top-level array of documents
    $collectionName = explode('_', $file)[0];
    echo json_encode([
        "success" => true,
        "collections" => [$collectionName => $data],
    ]);
}

function onError($errorMessage): void
{
    echo json_encode(["success" => false, "error" => $errorMessage]);
}
