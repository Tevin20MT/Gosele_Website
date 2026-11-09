<?php
declare(strict_types=1);

return [
    'site_origin' => 'https://goseleconsult.co.za',
    'smtp_host' => 'mail.goseleconsult.co.za',
    'smtp_port' => 465,
    'smtp_username' => 'info@goseleconsult.co.za',
    'smtp_password' => 'REPLACE_WITH_MAILBOX_PASSWORD',
    'recipient' => 'info@goseleconsult.co.za',
    'rate_limit_salt' => 'REPLACE_WITH_A_RANDOM_64_CHARACTER_SECRET',
    'rate_limit_directory' => __DIR__ . '/rate-limit',
    'phpmailer_autoload' => __DIR__ . '/phpmailer/vendor/autoload.php',
    'phpmailer_src' => '',
];