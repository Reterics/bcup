<?php
header("Content-Security-Policy: default-src 'none'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Frame-Options: DENY"); // Blocks iframes (Clickjacking)
header("X-XSS-Protection: 1; mode=block"); // Blocks XSS in old browsers
header("X-Content-Type-Options: nosniff"); // Prevent MIME-type sniffing
header("Content-Type: application/json");

if (!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] !== 'on') {
  //http_response_code(403);
  //die(json_encode(["error" => "HTTPS required"]));
}

header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$ip     = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$limit  = 100;  // Max requests per hour
$window = 3600; // Seconds

if (function_exists('apcu_inc')) {
  $key = 'rl_' . hash('sha256', $ip);
  apcu_add($key, 0, $window); // no-op if key already exists; sets TTL on first request
  $count = apcu_inc($key);
  if ($count > $limit) {
    http_response_code(429);
    die(json_encode(["error" => "Too many requests. Try again later."]));
  }
}
