<?php
header("Content-Security-Policy: default-src 'none'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("X-Frame-Options: DENY"); // Blocks iframes (Clickjacking)
header("X-XSS-Protection: 1; mode=block"); // Blocks XSS in old browsers
header("X-Content-Type-Options: nosniff"); // Prevent MIME-type sniffing
header("Content-Type: application/json");

if (!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] !== 'on') {
  //http_response_code(403);
  //die(json_encode(["error" => "HTTPS required"]));
}

header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");

session_start();
$ip = $_SERVER['REMOTE_ADDR'];
$limit = 100; // Max requests per hour

if (!isset($_SESSION['requests'][$ip])) {
  $_SESSION['requests'][$ip] = ['count' => 0, 'timestamp' => time()];
}

if (time() - $_SESSION['requests'][$ip]['timestamp'] < 3600) {
  $_SESSION['requests'][$ip]['count']++;
} else {
  $_SESSION['requests'][$ip] = ['count' => 1, 'timestamp' => time()];
}

if ($_SESSION['requests'][$ip]['count'] > $limit) {
  http_response_code(429);
  die(json_encode(["error" => "Too many requests. Try again later."]));
}


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}
