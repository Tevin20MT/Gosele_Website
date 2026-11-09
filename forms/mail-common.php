<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

function formResponse(int $statusCode, array $response): void
{
    http_response_code($statusCode);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function formLogError(string $context, ?Throwable $error = null, array $config = []): void
{
    $detail = $error ? $error->getMessage() : $context;
    $password = isset($config['smtp_password']) ? (string) $config['smtp_password'] : '';

    if ($password !== '') {
        $detail = str_replace($password, '[redacted]', $detail);
    }

    $detail = preg_replace('/[\r\n\x00-\x1F]+/', ' ', $detail);
    error_log('[Gosele forms] ' . $context . ': ' . $detail);
}

function loadFormConfig(): array
{
    $configPath = getenv('GOSELE_MAIL_CONFIG');

    if (!is_string($configPath) || $configPath === '') {
        $configPath = dirname(__DIR__, 2) . '/private/gosele-mail-config.php';
    }

    if (!is_file($configPath) || !is_readable($configPath)) {
        throw new RuntimeException('Private mail configuration is missing or unreadable.');
    }

    $config = require $configPath;
    if (!is_array($config)) {
        throw new RuntimeException('Private mail configuration must return an array.');
    }

    foreach (['site_origin', 'smtp_host', 'smtp_username', 'smtp_password', 'recipient', 'rate_limit_salt', 'rate_limit_directory'] as $key) {
        if (!isset($config[$key]) || !is_string($config[$key]) || trim($config[$key]) === '') {
            throw new RuntimeException('A required mail configuration value is missing: ' . $key);
        }
    }

    if (strpos($config['smtp_password'], 'REPLACE_WITH_') === 0 || strpos($config['rate_limit_salt'], 'REPLACE_WITH_') === 0) {
        throw new RuntimeException('Private mail configuration still contains template values.');
    }

    if (!filter_var($config['smtp_username'], FILTER_VALIDATE_EMAIL) || !filter_var($config['recipient'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Mail sender or recipient address is invalid.');
    }

    if (!isset($config['smtp_port']) || (int) $config['smtp_port'] !== 465) {
        throw new RuntimeException('SMTP must be configured for implicit TLS on port 465.');
    }

    return $config;
}

function normalizeOrigin(string $url): ?string
{
    $parts = parse_url($url);
    if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        return null;
    }

    $scheme = strtolower((string) $parts['scheme']);
    if ($scheme !== 'https' && $scheme !== 'http') {
        return null;
    }

    $origin = $scheme . '://' . strtolower((string) $parts['host']);
    if (isset($parts['port'])) {
        $origin .= ':' . (int) $parts['port'];
    }

    return $origin;
}

function requestHasAllowedOrigin(array $config): bool
{
    $expected = normalizeOrigin((string) $config['site_origin']);
    $requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? (string) $_SERVER['HTTP_ORIGIN'] : '';

    if ($requestOrigin === '' && isset($_SERVER['HTTP_REFERER'])) {
        $requestOrigin = (string) $_SERVER['HTTP_REFERER'];
    }

    $actual = normalizeOrigin($requestOrigin);
    return $expected !== null && $actual !== null && hash_equals($expected, $actual);
}

function requestHasJsonContentType(): bool
{
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? strtolower(trim((string) $_SERVER['CONTENT_TYPE'])) : '';
    $mediaType = trim(explode(';', $contentType, 2)[0]);
    return $mediaType === 'application/json';
}

function isWithinRateLimit(array $config): bool
{
    $directory = rtrim((string) $config['rate_limit_directory'], DIRECTORY_SEPARATOR);
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Unable to create private rate-limit storage.');
    }

    @chmod($directory, 0700);
    $path = $directory . DIRECTORY_SEPARATOR . 'requests.json';
    $file = @fopen($path, 'c+');
    if ($file === false) {
        throw new RuntimeException('Unable to open private rate-limit storage.');
    }

    try {
        if (!flock($file, LOCK_EX)) {
            throw new RuntimeException('Unable to lock private rate-limit storage.');
        }

        rewind($file);
        $contents = stream_get_contents($file);
        $entries = is_string($contents) ? json_decode($contents, true) : [];
        if (!is_array($entries)) {
            $entries = [];
        }

        $now = time();
        $windowSeconds = 900;
        foreach ($entries as $key => $entry) {
            if (!is_array($entry) || !isset($entry['started'], $entry['count']) || $now - (int) $entry['started'] >= $windowSeconds) {
                unset($entries[$key]);
            }
        }

        $ipAddress = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
        $clientKey = hash('sha256', (string) $config['rate_limit_salt'] . '|' . $ipAddress);
        $entry = isset($entries[$clientKey]) ? $entries[$clientKey] : ['started' => $now, 'count' => 0];

        if ((int) $entry['count'] >= 5) {
            flock($file, LOCK_UN);
            return false;
        }

        $entry['count'] = (int) $entry['count'] + 1;
        $entries[$clientKey] = $entry;
        $encoded = json_encode($entries);
        if (!is_string($encoded)) {
            throw new RuntimeException('Unable to encode rate-limit data.');
        }

        rewind($file);
        if (!ftruncate($file, 0) || fwrite($file, $encoded) === false) {
            throw new RuntimeException('Unable to write private rate-limit data.');
        }

        fflush($file);
        @chmod($path, 0600);
        flock($file, LOCK_UN);
        return true;
    } finally {
        fclose($file);
    }
}

function readFormPayload(): ?array
{
    $rawBody = file_get_contents('php://input');
    if (!is_string($rawBody) || $rawBody === '' || strlen($rawBody) > 12000) {
        return null;
    }

    $payload = json_decode($rawBody);
    return is_object($payload) ? (array) $payload : null;
}

function readFormField(array $payload, string $key, string $label, int $maxLength, bool $required, array &$errors): string
{
    if (!array_key_exists($key, $payload)) {
        if ($required) {
            $errors[$key] = $label . ' is required.';
        }
        return '';
    }

    if (!is_string($payload[$key])) {
        $errors[$key] = $label . ' is invalid.';
        return '';
    }

    $value = trim($payload[$key]);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);
    if (!is_string($value) || preg_match('//u', $value) !== 1) {
        $errors[$key] = $label . ' contains invalid characters.';
        return '';
    }

    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($length > $maxLength) {
        $errors[$key] = $label . ' must be no more than ' . $maxLength . ' characters.';
        return '';
    }

    if ($required && $value === '') {
        $errors[$key] = $label . ' is required.';
    }

    return $value;
}

function loadPHPMailer(array $config): void
{
    $mailerClass = 'PHPMailer\\PHPMailer\\PHPMailer';
    $autoload = isset($config['phpmailer_autoload']) ? (string) $config['phpmailer_autoload'] : '';
    $sourceDirectory = isset($config['phpmailer_src']) ? rtrim((string) $config['phpmailer_src'], DIRECTORY_SEPARATOR) : '';

    if ($autoload !== '' && is_file($autoload)) {
        require_once $autoload;
    } elseif ($sourceDirectory !== '' && is_file($sourceDirectory . '/PHPMailer.php')) {
        require_once $sourceDirectory . '/Exception.php';
        require_once $sourceDirectory . '/PHPMailer.php';
        require_once $sourceDirectory . '/SMTP.php';
    } else {
        throw new RuntimeException('PHPMailer is not installed at the configured private path.');
    }

    if (!class_exists($mailerClass)) {
        throw new RuntimeException('PHPMailer classes could not be loaded.');
    }
}

function safeReplyName(string $name): string
{
    $safeName = preg_replace('/[\r\n]+/', ' ', $name);
    return trim(is_string($safeName) ? $safeName : '');
}

function sendFormEmail(array $config, string $subject, string $replyTo, string $replyName, string $body): void
{
    loadPHPMailer($config);

    $mailerClass = 'PHPMailer\\PHPMailer\\PHPMailer';
    $mail = new $mailerClass(true);
    $mail->isSMTP();
    $mail->Host = (string) $config['smtp_host'];
    $mail->SMTPAuth = true;
    $mail->Username = (string) $config['smtp_username'];
    $mail->Password = (string) $config['smtp_password'];
    $mail->SMTPSecure = constant($mailerClass . '::ENCRYPTION_SMTPS');
    $mail->Port = 465;
    $mail->Timeout = 15;
    $mail->CharSet = 'UTF-8';
    $mail->SMTPDebug = 0;
    $mail->setFrom((string) $config['smtp_username'], 'Gosele Consulting');
    $mail->addAddress((string) $config['recipient']);
    $mail->addReplyTo($replyTo, safeReplyName($replyName));
    $mail->Subject = $subject;
    $mail->Body = $body;
    $mail->isHTML(false);
    $mail->send();
}

function handleFormSubmission(string $formType): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        formResponse(405, ['success' => false, 'message' => 'Use the form to submit your enquiry.']);
    }

    if (!requestHasJsonContentType()) {
        formResponse(415, ['success' => false, 'message' => 'The form submission format is not supported.']);
    }

    $config = [];
    try {
        $config = loadFormConfig();

        if (!requestHasAllowedOrigin($config)) {
            formResponse(403, ['success' => false, 'message' => 'Please reload the page and try submitting the form again.']);
        }

        if (!isWithinRateLimit($config)) {
            formResponse(429, ['success' => false, 'message' => 'Too many submissions. Please wait 15 minutes before trying again.']);
        }

        $payload = readFormPayload();
        if ($payload === null) {
            formResponse(400, ['success' => false, 'message' => 'The form data could not be read. Please check the form and try again.']);
        }

        if (isset($payload['website']) && !is_string($payload['website'])) {
            formResponse(400, ['success' => false, 'message' => 'The form data is invalid.']);
        }

        if (trim((string) ($payload['website'] ?? '')) !== '') {
            formResponse(200, ['success' => true, 'message' => 'Thank you. Your enquiry has been received.']);
        }

        $errors = [];
        if ($formType === 'contact') {
            $firstName = readFormField($payload, 'first_name', 'First name', 120, true, $errors);
            $lastName = readFormField($payload, 'last_name', 'Last name', 120, false, $errors);
            $email = readFormField($payload, 'email', 'Email address', 254, true, $errors);
            $message = readFormField($payload, 'message', 'Message', 5000, true, $errors);

            if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email))) {
                $errors['email'] = 'Enter a valid email address.';
            }

            if ($errors) {
                formResponse(422, ['success' => false, 'message' => 'Please correct the highlighted information and try again.', 'errors' => $errors]);
            }

            $fullName = trim($firstName . ' ' . $lastName);
            $body = "Website Contact Enquiry\n\n" .
                "First name: {$firstName}\n" .
                "Last name: {$lastName}\n" .
                "Email: {$email}\n\n" .
                "Message:\n{$message}\n";
            sendFormEmail($config, 'Website Enquiry – Gosele Consulting', $email, $fullName, $body);
        } elseif ($formType === 'consultation') {
            $fullName = readFormField($payload, 'full_name', 'Full name', 160, true, $errors);
            $email = readFormField($payload, 'email', 'Email address', 254, true, $errors);
            $company = readFormField($payload, 'company', 'Company', 160, false, $errors);
            $serviceArea = readFormField($payload, 'service_area', 'Service area', 100, true, $errors);
            $details = readFormField($payload, 'details', 'Consultation details', 5000, true, $errors);
            $allowedServiceAreas = [
                'Skills development and accredited training',
                'Occupational health and safety compliance',
                'Social and stakeholder facilitation',
                'ISO management systems',
                'Other',
            ];

            if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email))) {
                $errors['email'] = 'Enter a valid email address.';
            }
            if ($serviceArea !== '' && !in_array($serviceArea, $allowedServiceAreas, true)) {
                $errors['service_area'] = 'Select a valid service area.';
            }

            if ($errors) {
                formResponse(422, ['success' => false, 'message' => 'Please correct the highlighted information and try again.', 'errors' => $errors]);
            }

            $body = "Consultation Request\n\n" .
                "Full name: {$fullName}\n" .
                "Email: {$email}\n" .
                "Company: {$company}\n" .
                "Service area: {$serviceArea}\n\n" .
                "Consultation details:\n{$details}\n";
            sendFormEmail($config, 'Consultation Request – Gosele Consulting', $email, $fullName, $body);
        } else {
            formResponse(404, ['success' => false, 'message' => 'This form endpoint does not exist.']);
        }

        formResponse(200, ['success' => true, 'message' => 'Thank you. Your enquiry has been sent successfully.']);
    } catch (Throwable $error) {
        formLogError('Submission failed for ' . $formType, $error, $config);
        formResponse(500, ['success' => false, 'message' => 'We could not send your enquiry right now. Please try again later or contact info@goseleconsult.co.za.']);
    }
}