import config from '../config';

import nodemailer from 'nodemailer';

export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        if (config.email.service !== 'console' && config.email.smtp.host) {
            this.transporter = nodemailer.createTransport({
                host: config.email.smtp.host,
                port: config.email.smtp.port,
                secure: config.email.smtp.secure, // true for 465, false for other ports
                auth: {
                    user: config.email.smtp.user,
                    pass: config.email.smtp.pass,
                },
            });
        }
    }

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

        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: config.email.from,
                    to: options.to,
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                });
                console.log(`Email sent to ${options.to}`);
            } catch (error) {
                console.error('Error sending email:', error);
                throw error;
            }
        } else {
            console.error('Email service not configured correctly.');
            throw new Error('Email service not configured. Please check SMTP settings.');
        }
    }

    async sendVerificationCode(email: string, code: string): Promise<void> {
        const subject = 'Veg Fest Signup - Verification Code';
        const text = `
Your Veg Fest verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

This is an automated message, please do not reply to this email.
You can return to the site at: ${config.frontend.url}?email=${encodeURIComponent(email)}&code=${code}

Thank you,
VegFest Team
    `.trim();

        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h2 { color: #2e7d32; margin: 0; font-size: 24px; }
    .code-container { text-align: center; margin: 30px 0; }
    .code { font-size: 36px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; padding: 20px; background: #f1f8e9; border-radius: 8px; display: inline-block; border: 2px solid #c8e6c9; }
    .info { color: #666; font-size: 14px; text-align: center; }
    .warning { color: #999; font-style: italic; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
    .btn-container { text-align: center; margin-top: 30px; }
    .button { background-color: #4CAF50; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; transition: background-color 0.3s; }
    .footer { margin-top: 40px; text-align: center; font-size: 14px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Veg Fest Signup</h2>
    </div>
    <div class="info">
      <p>Hello,</p>
      <p>Your verification code for the Veg Fest Signup portal is:</p>
    </div>
    <div class="code-container">
      <div class="code">${code}</div>
    </div>
    <div class="info">
      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
    <div class="btn-container">
      <a href="${config.frontend.url}?email=${encodeURIComponent(email)}&code=${code}" class="button">Return to Signup Site</a>
    </div>
    <p class="warning">This is an automated message, please do not reply to this email.</p>
    <div class="footer">
      <p>Thank you,<br><strong>Veg Fest Team</strong></p>
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
        const subject = 'Welcome to Veg Fest!';
        const text = `
Hi ${name},

Welcome to Veg Fest! Your account has been successfully created.

You can now log in and manage your registrations.

Thank you for joining us!

Veg Fest Team
    `.trim();

        await this.sendEmail({
            to: email,
            subject,
            text,
        });
    }
}

export const emailService = new EmailService();
