import config from '../config';

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  cc?: string;
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
      if (options.cc) console.log(`Cc: ${options.cc}`);
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
          cc: options.cc,
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
      <h2>Twin Cities Veg Fest Signup</h2>
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
      <p>Thank you,<br><strong>Twin Cities Veg Fest Team</strong></p>
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
    const subject = 'Welcome to Twin Cities Veg Fest!';
    const text = `
Hi ${name},

Welcome to Twin Cities Veg Fest! Your account has been successfully created.

You can now log in and manage your registrations.

Thank you for joining us!

Twin Cities Veg Fest Team
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

We noticed that your Twin Cities Veg Fest application is missing some required documents:

${docList}

Please log in to the portal and upload these documents as soon as possible to ensure your application can be fully processed.

Log in here: ${loginUrl}

Thank you,
Twin Cities Veg Fest Team
exhibitors@tcvegfest.com
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
      <p>We noticed that your Twin Cities Veg Fest application is missing some required documents:</p>
      
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
      <p>Thank you,<br><strong>Twin Cities Veg Fest Team</strong><br><a href="mailto:exhibitors@tcvegfest.com" style="color: #2563eb; text-decoration: none;">exhibitors@tcvegfest.com</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({
      to: email,
      cc: 'exhibitors@tcvegfest.com',
      subject,
      text,
      html,
    });
  }
  async sendApprovalEmail(registration: any): Promise<void> {
    const name = registration.firstName || 'Veggie Lover';
    const businessName = registration.organizationName || 'your business';
    const loginUrl = `${config.frontend.url}/login`;
    const email = registration.email;

    const subject = "Welcome to Twin Cities Veg Fest";

    // Build the required documents list
    const requiredDocs: string[] = [];
    const docs = registration.documents || [];

    if (registration.coiOption === 'later' && !docs.some((d: any) => d.type === 'COI')) {
      requiredDocs.push('Certificate of Insurance (COI)');
    }
    if (registration.st19Option === 'later' && !docs.some((d: any) => d.type === 'ST-19')) {
      requiredDocs.push('ST-19 Form');
    }
    if (registration.menuOption === 'later' && !docs.some((d: any) => d.type === 'Menu')) {
      requiredDocs.push('Menu');
    }

    const cat = registration.organizationCategory || '';
    const needsFoodPermit = cat === 'On-site food prep & sales $600' ||
      cat === 'Food business with on-site food prep — not a restaurant or food truck $350';

    // We don't have a 'foodPermitOption' in the schema. If it's missing, require it.
    if (needsFoodPermit && !docs.some((d: any) => d.type === 'Food Permit')) {
      requiredDocs.push('State of Minnesota Food Permit');
    }

    const initialInvoiceAmount = registration.initialInvoiceAmount || 0;
    const amountPaid = registration.amountPaid || 0;
    const remainingAmount = Math.max(0, initialInvoiceAmount - amountPaid);

    let requiredDocsText = '';
    let requiredDocsHtml = '';

    if (requiredDocs.length > 0 || remainingAmount > 0) {
      requiredDocsText = `\nWe need the following from you:\n`;
      requiredDocsHtml = `<div class="requirements"><p>We need the following from you:</p><ul>`;

      requiredDocs.forEach(doc => {
        requiredDocsText += `  - ${doc}\n`;
        requiredDocsHtml += `<li>${doc}</li>`;
      });

      if (remainingAmount > 0 && registration.quickbooksInvoiceLink) {
        requiredDocsText += `  - Payment of $${remainingAmount}; link to invoice: ${registration.quickbooksInvoiceLink}\n`;
        requiredDocsHtml += `<li>Payment of $${remainingAmount}; <a href="${registration.quickbooksInvoiceLink}">link to invoice</a></li>`;
      }

      requiredDocsHtml += `</ul></div>\n`;
    }

    const text = `
Welcome to Twin Cities Veg Fest

${name} we're delighted to welcome ${businessName} to Twin Cities Veg Fest this year!
${requiredDocsText}
Login here
${loginUrl}

The Twin Cities Veg Fest Team
exhibitors@tcvegfest.com
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .content { padding: 20px 0; }
    .requirements { background: #fff8e1; border-left: 4px solid #ffc107; padding: 15px 20px; border-radius: 4px; margin: 20px 0; }
    .requirements ul { margin: 0; padding-left: 20px; }
    .footer { margin-top: 40px; font-size: 14px; color: #666; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Welcome to Twin Cities Veg Fest</p>
      
      <p>${name} we're delighted to welcome ${businessName} to Twin Cities Veg Fest this year!</p>
      
      ${requiredDocsHtml}

      <p><a href="${loginUrl}">Login here</a></p>
    </div>
    
    <div class="footer">
      <p>The Twin Cities Veg Fest Team<br><a href="mailto:exhibitors@tcvegfest.com">exhibitors@tcvegfest.com</a></p>
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
