<?php
require __DIR__ . '/api/env.php';
require __DIR__ . '/api/vendor/autoload.php';

use Kreait\Firebase\Factory;

$factory = (new Factory)->withServiceAccount(getServiceAccount());
$firestore = $factory->createFirestore()->database();

$backupDir = __DIR__ . "/api/v1/backups/";
$logFile = __DIR__ . "/restore.log";
$collection = "parts"; // Change to correct collection name

// Find the latest backup file
$files = glob($backupDir . "{$collection}_*.json.gz");
usort($files, fn($a, $b) => filemtime($b) - filemtime($a));

if (empty($files)) {
    file_put_contents($logFile, "No backup files found for restore at " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
    die("No backup files found.\n");
}

$latestBackup = $files[0]; // Most recent backup

// Open log file
$log = fopen($logFile, 'a');
fwrite($log, "Restore started at " . date('Y-m-d H:i:s') . " using $latestBackup\n");

// Decompress Gzip File
$gzFile = gzopen($latestBackup, 'r');
$jsonData = '';
while (!gzeof($gzFile)) {
    $jsonData .= gzread($gzFile, 4096);
}
gzclose($gzFile);

$data = json_decode($jsonData, true);

if (!$data) {
    fwrite($log, "ERROR: Failed to read backup file $latestBackup\n");
    fclose($log);
    die("Failed to read backup file.\n");
}

// Restore data to Firestore
$collectionRef = $firestore->collection($collection);
foreach ($data as $doc) {
    try {
        $collectionRef->document($doc['id'])->set($doc);
    } catch (\Exception $e) {
        fwrite($log, "ERROR: Failed to restore document {$doc['id']} - " . $e->getMessage() . "\n");
    }
}

fwrite($log, "Restore completed successfully from $latestBackup at " . date('Y-m-d H:i:s') . "\n\n");
fclose($log);

echo "Data restored successfully from $latestBackup\n";
