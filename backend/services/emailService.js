import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
dotenv.config();

export const sendReportEmail = async (userEmail, pdfBuffer, session) => {
  if (!process.env.SMTP_USER || !process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_REFRESH_TOKEN) {
    console.warn('[emailService] Email credentials missing. Mocking email delivery.');
    console.log(`[emailService] Would send PDF to ${userEmail} for session ${session._id}`);
    return { success: true, mocked: true };
  }

  const percentage = session.percentage || (session.finalMaxScore > 0 ? Math.round((session.finalScore/session.finalMaxScore)*100) : 0);

  const mailOptions = {
    from: `"Sarthi.ai" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `Your Sarthi.ai Interview Report - ${session.sessionType.toUpperCase()}`,
    html: `
      <h2>Hello!</h2>
      <p>Thank you for completing your technical interview on Sarthi.ai.</p>
      <p><strong>Session Type:</strong> ${session.sessionType.toUpperCase()}</p>
      <p><strong>Total Score:</strong> ${session.finalScore || 0} / ${session.finalMaxScore || 0}</p>
      <p><strong>Accuracy:</strong> ${percentage}%</p>
      <p>Please find your detailed feedback report attached as a PDF.</p>
      <br/>
      <p>Best regards,</p>
      <p>The Sarthi.ai Team</p>
    `,
    attachments: [
      {
        filename: `Interview_Report_${session._id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  try {
    // 1. Authenticate with Google API
    const oAuth2Client = new google.auth.OAuth2(
      process.env.OAUTH_CLIENT_ID,
      process.env.OAUTH_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oAuth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // 2. Build the raw email string using Nodemailer's MailComposer
    const mail = new MailComposer(mailOptions);
    const message = await mail.compile().build();
    
    // 3. Encode base64url format for Gmail API
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // 4. Send directly via HTTP REST API (Bypasses Port 465)
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log('[emailService] Email sent via HTTP API:', res.data.id);
    return { success: true, messageId: res.data.id };

  } catch (error) {
    console.error('[emailService] Error sending email via Gmail API:', error);
    return { success: false, error };
  }
};
