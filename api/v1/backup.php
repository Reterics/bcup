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
        $projectDir = resolveProjectDir($backupDir, $_GET['project'] ?? null);
        if (!$projectDir) { onError("No project specified"); break; }
        listBackups($projectDir);
        break;
    case 'create':
        $collections = $body['collections'] ?? null;
        $project = $body['project'] ?? null;
        $projectDir = resolveProjectDir($backupDir, $project['firebaseConfig']['projectId'] ?? null);
        if (!$projectDir) { onError("No project specified"); break; }
        createBackup($projectDir, $collections, $project);
        break;
    case 'delete':
        $file = $body['file'] ?? null;
        $projectDir = resolveProjectDir($backupDir, $body['project'] ?? null);
        if (!$projectDir) { onError("No project specified"); break; }
        deleteBackup($projectDir, $file);
        break;
    case 'restore':
        $restoreFile = $body['file'] ?? null;
        $projectDir = resolveProjectDir($backupDir, $body['project'] ?? null);
        if (!$projectDir) { onError("No project specified"); break; }
        restoreBackup($projectDir, $restoreFile);
        break;
    case 'download':
        $fileToDownload = $file ?: ($body['file'] ?? null);
        $projectDir = resolveProjectDir($backupDir, $_GET['project'] ?? null);
        if (!$projectDir) { onError("No project specified"); break; }
        downloadBackup($projectDir, $fileToDownload);
        break;
    default:
        echo json_encode(["error" => "Invalid action"]);
}

// --- Helpers ---

function resolveProjectDir(string $baseDir, ?string $projectName): ?string
{
    if (!$projectName || trim($projectName) === '') return null;
    $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', trim($projectName));
    $dir = $baseDir . $safe . '/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return $dir;
}

// --- Actions ---

function listBackups(string $projectDir): void
{
    $files = glob($projectDir . "*.json.gz");
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

function createBackup(string $projectDir, $collections, $project): void
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
        $backupFile = $projectDir . "backup_" . date('Y-m-d_H-i-s') . ".json.gz";

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

function deleteBackup(string $projectDir, $file): void
{
    $file = $file ? basename($file) : null;
    if ($file && file_exists($projectDir . $file)) {
        unlink($projectDir . $file);
        echo json_encode(["success" => true, "message" => "Backup deleted"]);
    } else {
        onError("File not found");
    }
}

function downloadBackup(string $projectDir, $file): void
{
    if (!$file) {
        onError("File not specified");
        return;
    }

    $safeFile = basename($file);
    $fullPath = $projectDir . $safeFile;

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

function restoreBackup(string $projectDir, $file): void
{
    $file = $file ? basename($file) : null;
    if (!$file || !file_exists($projectDir . $file)) {
        onError("Backup file not found");
        return;
    }

    $gzFile = gzopen($projectDir . $file, 'r');
    if ($gzFile === false) {
        onError("Failed to open backup file");
        return;
    }
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
