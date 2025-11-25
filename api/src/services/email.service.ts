import config from '../config';

export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export class EmailService {
    async sendEmail(options: EmailOptions): Promise<void> {
        if (config.email.service === 'console') {
            // For development - just log to console
            console.log('\n📧 ===== EMAIL =====');
            console.log(`To: ${options.to}`);
            console.log(`Subject: ${options.subject}`);
            console.log(`Body:\n${options.text}`);
            console.log('==================\n');
            return;
        }

        // TODO: Implement AWS SES or other email service
        // For now, throw error if not in console mode
        throw new Error('Email service not configured. Please set up AWS SES or another provider.');
    }

    async sendVerificationCode(email: string, code: string): Promise<void> {
        const subject = 'VegFest Signup - Verification Code';
        const text = `
Your VegFest verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Thank you,
VegFest Team
    `.trim();

        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .code { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>VegFest Signup - Verification Code</h2>
    <p>Your verification code is:</p>
    <div class="code">${code}</div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, please ignore this email.</p>
    <div class="footer">
      <p>Thank you,<br>VegFest Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();

        await this.sendEmail({
            to: email,
            subject,
            text,
            html,
        });
    }

    async sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
        const name = firstName || 'there';
        const subject = 'Welcome to VegFest!';
        const text = `
Hi ${name},

Welcome to VegFest! Your account has been successfully created.

You can now log in and manage your registrations.

Thank you for joining us!

VegFest Team
    `.trim();

        await this.sendEmail({
            to: email,
            subject,
            text,
        });
    }
}

export const emailService = new EmailService();
