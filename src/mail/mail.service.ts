import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    // For Gmail, you MUST use an "App Password", not your regular password.
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER || 'producelabsandco@gmail.com',
        pass: process.env.MAIL_PASS || 'your-app-password-here',
      },
    });
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    const mailOptions = {
      from: process.env.MAIL_USER || 'producelabsandco@gmail.com',
      to,
      subject,
      text,
      html,
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendProposal(formData: { name: string; email: string; details: string }) {
    return this.sendMail(
      'producelabsandco@gmail.com',
      `🚀 New Project Proposal from ${formData.name}`,
      `You have received a new proposal request!\n\nName: ${formData.name}\nEmail: ${formData.email}\n\nDetails:\n${formData.details}`,
      `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Project Proposal</h2>
          <p><strong>Name:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Details:</strong><br>${formData.details.replace(/\\n/g, '<br>')}</p>
          <hr />
          <p style="font-size: 0.8em; color: #666;">Sent via Webex Digital Contact Form</p>
        </div>
      `
    );
  }
}
