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
  async sendDocumentReminder(email: string, firstName: string, missingDocs: string[]): Promise<void> {
    const name = firstName || 'Exhibitor';
    const docList = missingDocs.map(d => `- ${d}`).join('\n');
    const docListHtml = missingDocs.map(d => `<li>${d}</li>`).join('');
    const loginUrl = `${config.frontend.url}/login`;

    const subject = 'Action Required: Missing Documents for Veg Fest';

    const text = `
Hi ${name},

We noticed that your Veg Fest application is missing some required documents:

${docList}

Please log in to the portal and upload these documents as soon as possible to ensure your application can be fully processed.

Log in here: ${loginUrl}

Thank you,
Veg Fest Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h2 { color: #d32f2f; margin: 0; font-size: 24px; }
    .content { margin: 30px 0; }
    .docs-list { background: #fff8e1; border-left: 4px solid #ffc107; padding: 15px 20px; border-radius: 4px; }
    .docs-list ul { margin: 0; padding-left: 20px; }
    .btn-container { text-align: center; margin-top: 30px; }
    .button { background-color: #2563eb; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; transition: background-color 0.3s; }
    .footer { margin-top: 40px; text-align: center; font-size: 14px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Action Required</h2>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>We noticed that your Veg Fest application is missing some required documents:</p>
      
      <div class="docs-list">
        <ul>
            ${docListHtml}
        </ul>
      </div>

      <p>Please log in to the portal and upload these documents as soon as possible to ensure your application can be fully processed.</p>
    </div>
    
    <div class="btn-container">
      <a href="${loginUrl}" class="button">Log In to Upload</a>
    </div>
    
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
  async sendApprovalEmail(email: string, firstName: string): Promise<void> {
    const name = firstName || 'Veggie Lover';
    const loginUrl = `${config.frontend.url}/login`;
    
    const subject = "You're In! Welcome to the Veg Fest Family! \uD83C\uDF89";

    const text = `
WOOHOO! \uD83E\uDD73

Hold onto your broccoli, ${name}! Your application has been APPROVED!

We are absolutely thrilled to have you join us for this year's Veg Fest. We did a little happy dance when we pressed the 'Approve' button (don't tell anyone, we have a reputation to maintain... mostly).

You are officially confirmed and good to go! 
Log in to your portal to see the shiny green 'Approved' badge and manage any final details.

Log in here: ${loginUrl}

Get ready for an amazing event!

High fives and kale vibes,
The Veg Fest Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f0f7f4; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 0; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #4caf50, #8bc34a); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 32px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .emoji-header { font-size: 48px; display: block; margin-bottom: 10px; }
    .content { padding: 40px 30px; text-align: center; }
    .content h2 { color: #2e7d32; margin-top: 0; }
    .highlight-box { background-color: #e8f5e9; border: 2px dashed #4caf50; border-radius: 12px; padding: 20px; margin: 25px 0; font-weight: bold; color: #2e7d32; font-size: 18px; }
    .btn-container { margin: 35px 0; }
    .button { background-color: #ff5722; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; display: inline-block; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 6px rgba(255, 87, 34, 0.3); }
    .button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(255, 87, 34, 0.4); }
    .footer { background-color: #333; color: #aaa; padding: 20px; text-align: center; font-size: 14px; }
    .vibes { font-style: italic; color: #4caf50; font-weight: bold; margin-top: 30px; display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji-header">\uD83E\uDD73</span>
      <h1>WOOHOO! You're In!</h1>
    </div>
    <div class="content">
      <p>Hold onto your broccoli, <strong>${name}</strong>!</p>
      
      <div class="highlight-box">
        Your application has been OFFICIALLY APPROVED!
      </div>

      <p>We are absolutely thrilled to have you join us for this year's Veg Fest. We did a little happy dance when we pressed the 'Approve' button (don't tell anyone, we have a reputation to maintain... mostly).</p>
      
      <p>Log in to your portal to see that shiny green <strong>'Approved'</strong> badge and manage any final details.</p>

      <div class="btn-container">
        <a href="${loginUrl}" class="button">Go to My Portal \uD83D\uDE80</a>
      </div>

      <p>Get ready for an amazing event!</p>
      
      <span class="vibes">High fives and kale vibes, \uD83E\uDD66</span>
    </div>
    <div class="footer">
      <p>The Veg Fest Team</p>
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
}

export const emailService = new EmailService();
