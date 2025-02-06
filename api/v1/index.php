<?php
http_response_code(404);
header("Content-Type: text/plain");
header("X-Powered-By: ");

echo "404 Not Found";
exit;
