import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const sendReportEmail = async (userEmail, pdfBuffer, session) => {
  if (!process.env.SMTP_USER || !process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_REFRESH_TOKEN) {
    console.warn('[emailService] Email credentials missing. Mocking email delivery.');
    console.log(`[emailService] Would send PDF to ${userEmail} for session ${session._id}`);
    return { success: true, mocked: true };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.SMTP_USER, // Your Gmail address
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN
    }
  });

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

  const info = await transporter.sendMail(mailOptions);
  console.log('[emailService] Email sent:', info.messageId);
  return { success: true, messageId: info.messageId };
};
