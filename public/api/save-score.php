<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '', true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload']);
    exit;
}

function sanitize_text(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }

    $cleaned = trim(preg_replace('/\s+/', ' ', $value) ?? '');
    return substr($cleaned, 0, $maxLength);
}

$entry = [
    'name' => sanitize_text($payload['name'] ?? 'Unknown', 80),
    'category' => sanitize_text($payload['category'] ?? 'Unknown', 40),
    'score' => max(0, (int) ($payload['score'] ?? 0)),
    'total' => max(0, (int) ($payload['total'] ?? 0)),
    'mistakes' => max(0, (int) ($payload['mistakes'] ?? 0)),
    'date' => max(0, (int) ($payload['date'] ?? round(microtime(true) * 1000))),
    'saved_at' => gmdate('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    'user_agent' => sanitize_text($_SERVER['HTTP_USER_AGENT'] ?? '', 255),
];

$siteRoot = dirname(__DIR__);
$storageDir = dirname($siteRoot) . '/word-quest-data';
$storageFile = $storageDir . '/scores.json';

if (!is_dir($storageDir) && !mkdir($storageDir, 0755, true) && !is_dir($storageDir)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Unable to create storage directory']);
    exit;
}

if (!file_exists($storageFile) && file_put_contents($storageFile, "[]\n", LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Unable to initialize score file']);
    exit;
}

$fileHandle = fopen($storageFile, 'c+');

if ($fileHandle === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Unable to open score file']);
    exit;
}

if (!flock($fileHandle, LOCK_EX)) {
    fclose($fileHandle);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Unable to lock score file']);
    exit;
}

$existingContent = stream_get_contents($fileHandle);
$scores = json_decode($existingContent ?: '[]', true);

if (!is_array($scores)) {
    $scores = [];
}

$scores[] = $entry;
$scores = array_slice($scores, -5000);

rewind($fileHandle);
ftruncate($fileHandle, 0);

$encoded = json_encode($scores, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

if ($encoded === false || fwrite($fileHandle, $encoded . PHP_EOL) === false) {
    flock($fileHandle, LOCK_UN);
    fclose($fileHandle);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Unable to write score file']);
    exit;
}

fflush($fileHandle);
flock($fileHandle, LOCK_UN);
fclose($fileHandle);

echo json_encode([
    'ok' => true,
    'saved' => true,
]);
