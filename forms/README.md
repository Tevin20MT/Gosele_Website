# Gosele Consulting Forms

The Contact and Consultation pages submit JSON to the PHP endpoints in this directory. The endpoints require PHP 7.4 or newer (PHP 8.1+ recommended), the PHP JSON and OpenSSL extensions, HTTPS, and PHPMailer. They do not use Node.js, a database, or a framework.

## Files

- `contact-handler.php`: validates and sends Contact form submissions.
- `consultation-handler.php`: validates and sends Consultation form submissions.
- `mail-common.php`: shared origin checks, validation, honeypot, rate limiting, SMTP delivery, and JSON responses. Direct web access is denied by `.htaccess`.
- `config.example.php`: credential-free configuration template. Copy it outside `public_html`; never put real credentials in this project.
- `.htaccess`: disables directory listings and blocks web access to helper/config files and rate-limit data.
- `README.md`: installation, deployment, tests, and troubleshooting.

## Axxess cPanel Deployment

1. In cPanel, enable PHP 8.1 or newer for the domain using MultiPHP Manager. PHP 7.4 is the code minimum. Ensure PHP JSON and OpenSSL extensions are enabled.
2. Enable an SSL certificate and use the HTTPS version of the website. The configured origin must exactly match the browser origin, including `www` if the canonical site uses it.
3. Upload the updated site files, preserving case-sensitive paths: `contact.html`, `consult.html`, `request.html`, `services.html`, `JS/script.js`, `CSS/style.css`, and the complete `forms/` directory. Do not upload a real SMTP password into `public_html`.
4. In the account home directory, create a private directory outside `public_html`, for example `/home/CPANEL_USER/private`. Copy `forms/config.example.php` there as `/home/CPANEL_USER/private/gosele-mail-config.php`. Set the configuration file permissions to `600` and the private directory to `700` using cPanel File Manager or Terminal.
5. Edit only the private copy:
   - Set `site_origin` to the exact HTTPS origin, such as `https://goseleconsult.co.za` or `https://www.goseleconsult.co.za`.
   - Keep the supplied SMTP host, port, username, and recipient unless Axxess has provided different settings.
   - Replace `smtp_password` with the mailbox password for `info@goseleconsult.co.za`.
   - Replace `rate_limit_salt` with a unique random value of at least 32 random bytes. Generate it in cPanel Terminal with `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"` or with a password manager. Do not reuse the mailbox password.
   - `rate_limit_directory` defaults to a folder next to the private config and is outside `public_html`.
6. Install PHPMailer outside `public_html`, next to the private config. Choose one method:

   **Composer, if available in cPanel Terminal:**

   ```sh
   mkdir -p ~/private/phpmailer
   cd ~/private/phpmailer
   composer require phpmailer/phpmailer
   ```

   The template expects `~/private/phpmailer/vendor/autoload.php`.

   **Manual upload:** Download the official PHPMailer release from its GitHub repository, extract it, and upload its `src` directory to `~/private/PHPMailer/src`. In the private config, set `phpmailer_autoload` to an empty string and set `phpmailer_src` to `/home/CPANEL_USER/private/PHPMailer/src`.

7. Confirm the final private paths resolve as `/home/CPANEL_USER/private/gosele-mail-config.php` and either `/home/CPANEL_USER/private/phpmailer/vendor/autoload.php` or `/home/CPANEL_USER/private/PHPMailer/src/PHPMailer.php`. The PHP helper uses this private config by default. If cPanel stores private files elsewhere, define the `GOSELE_MAIL_CONFIG` environment variable to the full config path in the domain's PHP configuration.
8. Submit one Contact form and one Consultation form using test information. Confirm each arrives at `info@goseleconsult.co.za` and that Reply in the received message addresses the visitor. Do not announce successful delivery until this real inbox check passes.

If cPanel Terminal is available, lint the uploaded PHP files before testing:

```sh
php -l public_html/forms/contact-handler.php
php -l public_html/forms/consultation-handler.php
php -l public_html/forms/mail-common.php
php -l /home/CPANEL_USER/private/gosele-mail-config.php
```

The handlers use authenticated SMTP at `mail.goseleconsult.co.za:465` with implicit TLS (`PHPMailer::ENCRYPTION_SMTPS`). The business mailbox is always the From address; the validated visitor address is Reply-To. TLS certificate verification remains enabled.

## Security and Operations

- Keep `gosele-mail-config.php`, PHPMailer, and `rate-limit/` outside the web root. The SMTP password and rate-limit salt are not part of this repository.
- The endpoints require a same-origin `Origin` (or `Referer` fallback) matching `site_origin`, and accept JSON POST only.
- Each endpoint allows five requests per client IP per 15-minute window. The hashed IP counters are stored in the private rate-limit directory. The honeypot field is hidden from normal visitors and bot submissions are silently accepted without sending mail.
- Field lengths are checked on both the browser and server. Email addresses use `filter_var()`, service areas use an allowlist, and message content is plain text. SMTP errors are written to the PHP server error log with passwords redacted; visitor responses never include SMTP diagnostics.
- Check cPanel's PHP error log after backend failures. Never enable PHPMailer SMTP debug output on the public site.

## Test Checklist

Run tests on the deployed HTTPS site, not a `file://` preview. Use test data and remove any temporary test messages afterward.

1. **Contact valid submission:** Submit first name, optional last name, valid email, and message. Expect a success announcement, cleared fields, restored button, and one email at the business inbox with subject `Website Enquiry – Gosele Consulting`; Reply-To should be the submitted email.
2. **Consultation valid submission:** Submit full name, valid email, a company if desired, one listed service area, and details. Expect a success announcement and one email with subject `Consultation Request – Gosele Consulting` containing every field.
3. **Invalid email:** Enter a malformed address. The browser should block it. Also test a direct JSON request to confirm the PHP endpoint returns HTTP 422.
4. **Missing required fields:** Submit each form empty and omit required fields in a direct JSON request. The browser should block empty forms; the endpoint should return HTTP 422.
5. **Overlong message:** Try more than 5,000 characters in a direct JSON request. Expect HTTP 422 and no email. The browser field also has a 5,000-character limit.
6. **Honeypot:** Include a non-empty `website` value in a direct JSON request. Expect a generic success response, but verify that no email is sent.
7. **SMTP authentication failure:** Temporarily set an invalid password only in the private config, submit once, and confirm the page shows a generic error while cPanel's PHP log records the failure without exposing the password. Restore the correct password immediately.
8. **Network/server error:** Temporarily make the endpoint unavailable or use the browser's offline mode. Expect a useful error message, no page reload, and the submit button to become available again.
9. **Duplicate submission:** Double-click Submit or trigger two rapid submits. The browser should send only one in-flight request. Confirm repeated requests are also limited after five submissions in 15 minutes.
10. **Mobile:** Test both forms on a phone-sized viewport and a real mobile browser. Confirm fields fit, validation is usable, and successful/error status is announced and visible.

For direct endpoint tests, send `Content-Type: application/json`, a same-origin `Origin: https://goseleconsult.co.za` header (adjust for the canonical origin), and JSON using the exact field names shown in the HTML. Do not place credentials in test commands, screenshots, browser logs, or support requests.

## Troubleshooting

- **Generic form error:** Check the cPanel PHP error log, private config permissions/path, PHP version/extensions, and PHPMailer paths. The browser intentionally does not display internal errors.
- **SMTP connection timeout:** Confirm outbound SMTP on port 465 is allowed by the Axxess hosting plan and that the host is exactly `mail.goseleconsult.co.za`.
- **Authentication rejected:** Confirm the mailbox exists, the SMTP username is the full email address, and the private config contains the current mailbox password. Never change the From address to the visitor's address.
- **403 response:** The `site_origin` must exactly match the website origin, including `https` and any `www` prefix. Do not add a trailing path.
- **429 response:** The source IP exceeded the five-per-15-minute limit. Wait for the window to expire; inspect private rate-limit storage if the limit needs adjustment.
- **Endpoint returns HTML/404:** Confirm the full `forms/` directory and `.htaccess` were uploaded and that the host executes PHP in `public_html`.
- **Inbox delivery delay:** Check spam/quarantine and the Axxess mail logs. Successful SMTP acceptance does not guarantee final inbox placement; verify the recipient inbox.
