<?php
require '../security.php';
require '../env.php';
require '../vendor/autoload.php';

use Firebase\JWT\JWT;
use PHPMailer\PHPMailer\PHPMailer;

$backupDir = __DIR__ . "/backups/";
$action = $_GET['action'] ?? null;
$email = $_GET['email'] ?? null;
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
        createBackup($backupDir, $collection);
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
    case 'collections':
        fetchCollections();
        break;
    default:
        echo json_encode(["error" => "Invalid action"]);
}

// --- Firestore REST API helpers ---

function getAccessToken(): string
{
    $sa = getServiceAccount();
    $now = time();
    $payload = [
        'iss' => $sa['client_email'],
        'sub' => $sa['client_email'],
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
        'scope' => 'https://www.googleapis.com/auth/datastore',
    ];
    $jwt = JWT::encode($payload, $sa['private_key'], 'RS256');

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]),
    ]);
    $response = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        throw new \Exception('cURL error obtaining access token: ' . $err);
    }

    $data = json_decode($response, true);
    if (!isset($data['access_token'])) {
        throw new \Exception('Failed to obtain access token: ' . ($data['error_description'] ?? json_encode($data)));
    }
    return $data['access_token'];
}

function firestoreRequest(string $method, string $url, ?array $body = null): array
{
    static $token = null;
    if ($token === null) {
        $token = getAccessToken();
    }

    $ch = curl_init($url);
    $headers = [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ];

    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
    ];

    if ($method === 'POST') {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = json_encode($body ?? new \stdClass());
    } elseif ($method === 'PATCH') {
        $opts[CURLOPT_CUSTOMREQUEST] = 'PATCH';
        $opts[CURLOPT_POSTFIELDS] = json_encode($body ?? new \stdClass());
    }

    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err) {
        throw new \Exception('cURL error: ' . $err);
    }

    $data = json_decode($response, true);
    if ($httpCode >= 400) {
        $errorMsg = $data['error']['message'] ?? 'HTTP ' . $httpCode;
        throw new \Exception("Firestore API error: $errorMsg");
    }

    return $data ?? [];
}

function firestoreBaseUrl(): string
{
    $sa = getServiceAccount();
    $projectId = $sa['project_id'];
    return "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents";
}

function decodeFirestoreValue(array $value): mixed
{
    if (array_key_exists('nullValue', $value)) return null;
    if (isset($value['stringValue'])) return $value['stringValue'];
    if (isset($value['integerValue'])) return (int)$value['integerValue'];
    if (isset($value['doubleValue'])) return (float)$value['doubleValue'];
    if (isset($value['booleanValue'])) return $value['booleanValue'];
    if (isset($value['timestampValue'])) return $value['timestampValue'];
    if (isset($value['geoPointValue'])) return $value['geoPointValue'];
    if (isset($value['referenceValue'])) return $value['referenceValue'];
    if (isset($value['bytesValue'])) return $value['bytesValue'];
    if (isset($value['mapValue'])) {
        $result = [];
        foreach (($value['mapValue']['fields'] ?? []) as $k => $v) {
            $result[$k] = decodeFirestoreValue($v);
        }
        return $result;
    }
    if (isset($value['arrayValue'])) {
        $result = [];
        foreach (($value['arrayValue']['values'] ?? []) as $v) {
            $result[] = decodeFirestoreValue($v);
        }
        return $result;
    }
    return null;
}

function encodeFirestoreValue(mixed $value): array
{
    if (is_null($value)) return ['nullValue' => null];
    if (is_bool($value)) return ['booleanValue' => $value];
    if (is_int($value)) return ['integerValue' => (string)$value];
    if (is_float($value)) return ['doubleValue' => $value];
    if (is_string($value)) return ['stringValue' => $value];
    if (is_array($value)) {
        if (empty($value)) return ['mapValue' => ['fields' => new \stdClass()]];
        if (array_is_list($value)) {
            return ['arrayValue' => ['values' => array_map('encodeFirestoreValue', $value)]];
        }
        $fields = [];
        foreach ($value as $k => $v) {
            $fields[$k] = encodeFirestoreValue($v);
        }
        return ['mapValue' => ['fields' => $fields]];
    }
    return ['nullValue' => null];
}

function decodeDocument(array $doc): array
{
    $nameParts = explode('/', $doc['name']);
    $data = ['id' => end($nameParts)];
    foreach (($doc['fields'] ?? []) as $key => $value) {
        $data[$key] = decodeFirestoreValue($value);
    }
    return $data;
}

function listAllDocuments(string $collectionId): array
{
    $baseUrl = firestoreBaseUrl();
    $documents = [];
    $pageToken = null;

    do {
        $url = "{$baseUrl}/{$collectionId}?pageSize=300";
        if ($pageToken) {
            $url .= '&pageToken=' . urlencode($pageToken);
        }
        $result = firestoreRequest('GET', $url);
        foreach (($result['documents'] ?? []) as $doc) {
            $documents[] = decodeDocument($doc);
        }
        $pageToken = $result['nextPageToken'] ?? null;
    } while ($pageToken);

    return $documents;
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
                    // Avoid holding extremely large files fully in memory.
                    break;
                }
            }
            gzclose($gz);
            $decoded = json_decode($jsonData, true);
            if (is_array($decoded)) {
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

function fetchCollections(): void
{
    try {
        $baseUrl = firestoreBaseUrl();
        $result = firestoreRequest('POST', "{$baseUrl}:listCollectionIds", []);
        $names = $result['collectionIds'] ?? [];
        echo json_encode(["success" => true, "data" => $names]);
    } catch (\Exception $e) {
        echo json_encode(["success" => false, "error" => "Unable to list collections: " . $e->getMessage()]);
    }
}

function createBackup($backupDir, $singleCollection = null): void
{
    global $email;

    if ($singleCollection) {
        $collections = [$singleCollection];
    } else {
        try {
            $baseUrl = firestoreBaseUrl();
            $result = firestoreRequest('POST', "{$baseUrl}:listCollectionIds", []);
            $collections = $result['collectionIds'] ?? [];
        } catch (\Exception $e) {
            echo json_encode(["success" => false, "data" => [], "error" => "Failed to list collections: " . $e->getMessage()]);
            return;
        }
    }

    $response = [];
    $errors = [];
    $success = true;

    foreach ($collections as $collection) {
        try {
            $data = listAllDocuments($collection);

            $jsonData = json_encode($data, JSON_PRETTY_PRINT);
            $backupFile = $backupDir . $collection . "_" . date('Y-m-d_H-i-s') . ".json.gz";

            $gzFile = gzopen($backupFile, 'w9');
            gzwrite($gzFile, $jsonData);
            gzclose($gzFile);

            $response[] = ["collection" => $collection, "file" => basename($backupFile)];
        } catch (\Exception $e) {
            $errorMsg = "ERROR: Failed to backup $collection - " . $e->getMessage() . "\n";
            $response[] = ["collection" => $collection, "error" => $errorMsg];
            $errors[] = $errorMsg;
            $success = false;
        }
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

    $collectionName = explode('_', $file)[0];
    $baseUrl = firestoreBaseUrl();
    $errors = [];

    foreach ($data as $doc) {
        try {
            $docId = $doc['id'] ?? null;
            if (!$docId) continue;

            $fields = [];
            foreach ($doc as $key => $value) {
                $fields[$key] = encodeFirestoreValue($value);
            }

            $url = "{$baseUrl}/{$collectionName}/{$docId}";
            firestoreRequest('PATCH', $url, ['fields' => $fields]);
        } catch (\Exception $e) {
            $errors[] = "Failed to restore document {$docId}: " . $e->getMessage();
        }
    }

    if (empty($errors)) {
        echo json_encode(["success" => true, "message" => "Backup restored"]);
    } else {
        onError("Partial restore failure: " . implode('; ', $errors));
    }
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
        $mail->Subject = 'Backup Failure Alert';
        $mail->Body = "Backup Failed! Error details:\n\n" . $errorMessage;

        $mail->send();
    } catch (\Exception $e) {
        error_log("Email notification failed: " . $mail->ErrorInfo);
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
