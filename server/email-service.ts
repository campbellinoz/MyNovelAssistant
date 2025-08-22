import nodemailer from 'nodemailer';
import type { SupportTicket } from '@shared/schema';

// Gmail SMTP configuration
const createGmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USERNAME, // mynovelcraft@gmail.com
      pass: process.env.GMAIL_APP_PASSWORD, // App-specific password
    },
  });
};

export interface TicketEmailData {
  ticket: SupportTicket;
  userEmail: string;
  userName: string;
}

export async function sendSupportTicketNotification(data: TicketEmailData): Promise<boolean> {
  try {
    const transporter = createGmailTransporter();
    
    const { ticket, userEmail, userName } = data;
    
    // Email to admin (mynovelcraft@gmail.com)
    const adminEmailOptions = {
      from: process.env.GMAIL_USERNAME || 'mynovelcraft@gmail.com',
      to: 'mynovelcraft@gmail.com',
      subject: `New Support Ticket #${ticket.id.substring(0, 8)} - ${ticket.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">MyNovelCraft Support</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">New Support Ticket</p>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">Ticket Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Ticket ID:</td>
                <td style="padding: 8px 0;">#${ticket.id.substring(0, 8)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                <td style="padding: 8px 0;">${ticket.subject}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Category:</td>
                <td style="padding: 8px 0;">${ticket.category}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Priority:</td>
                <td style="padding: 8px 0;">
                  <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                    ${ticket.priority === 'high' ? 'background-color: #fecaca; color: #991b1b;' : 
                      ticket.priority === 'medium' ? 'background-color: #fef3c7; color: #92400e;' : 
                      'background-color: #dcfce7; color: #166534;'}">
                    ${ticket.priority.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">From:</td>
                <td style="padding: 8px 0;">${userName} (${userEmail})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Created:</td>
                <td style="padding: 8px 0;">${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Unknown'}</td>
              </tr>
            </table>
          </div>
          
          <div style="padding: 20px; background-color: white; border: 1px solid #e2e8f0; border-top: none;">
            <h3 style="color: #1e293b; margin-top: 0;">Message</h3>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
              ${ticket.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
              Respond to this ticket through the MyNovelCraft admin dashboard.
            </p>
          </div>
        </div>
      `,
    };

    // Email confirmation to user
    const userEmailOptions = {
      from: process.env.GMAIL_USERNAME || 'mynovelcraft@gmail.com',
      to: userEmail,
      subject: `Support Ticket Created - #${ticket.id.substring(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">MyNovelCraft Support</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Ticket Confirmation</p>
          </div>
          
          <div style="padding: 20px; background-color: white; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">Hello ${userName},</h2>
            
            <p style="color: #475569; line-height: 1.6;">
              Thank you for contacting MyNovelCraft support. We've successfully received your support ticket and will get back to you as soon as possible.
            </p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin-top: 0;">Your Ticket Details</h3>
              <p style="margin: 5px 0;"><strong>Ticket ID:</strong> #${ticket.id.substring(0, 8)}</p>
              <p style="margin: 5px 0;"><strong>Subject:</strong> ${ticket.subject}</p>
              <p style="margin: 5px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
              <p style="margin: 5px 0;"><strong>Created:</strong> ${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Unknown'}</p>
            </div>
            
            <p style="color: #475569; line-height: 1.6;">
              Please keep this ticket ID for your records. You can view the status of your ticket and add additional messages by logging into your MyNovelCraft account and visiting the Support Center.
            </p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-weight: bold;">⏱️ Expected Response Time</p>
              <p style="color: #92400e; margin: 5px 0 0 0;">
                ${ticket.priority === 'high' ? 'High priority tickets: Within 24 hours' : 
                  ticket.priority === 'medium' ? 'Medium priority tickets: Within 48 hours' : 
                  'Low priority tickets: Within 72 hours'}
              </p>
            </div>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
              This is an automated confirmation. Please do not reply to this email.
            </p>
            <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
              <em>"Written by writers for writers"</em>
            </p>
          </div>
        </div>
      `,
    };

    // Send both emails
    await transporter.sendMail(adminEmailOptions);
    await transporter.sendMail(userEmailOptions);
    
    console.log(`Support ticket email notifications sent for ticket ${ticket.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send support ticket emails:', error);
    return false;
  }
}

export async function sendTicketReplyNotification(
  ticket: SupportTicket, 
  userEmail: string, 
  userName: string,
  replyMessage: string,
  isFromAdmin: boolean
): Promise<boolean> {
  try {
    const transporter = createGmailTransporter();
    
    if (isFromAdmin) {
      // Notify user of admin reply
      const userEmailOptions = {
        from: process.env.GMAIL_USERNAME || 'mynovelcraft@gmail.com',
        to: userEmail,
        subject: `Support Ticket Reply - #${ticket.id.substring(0, 8)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">MyNovelCraft Support</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Support Team Reply</p>
            </div>
            
            <div style="padding: 20px; background-color: white; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin-top: 0;">Hello ${userName},</h2>
              
              <p style="color: #475569; line-height: 1.6;">
                Our support team has replied to your ticket <strong>#${ticket.id.substring(0, 8)}</strong> - "${ticket.subject}".
              </p>
              
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <h3 style="color: #1e293b; margin-top: 0;">Support Team Response</h3>
                <p style="color: #475569; line-height: 1.6; margin: 0;">
                  ${replyMessage.replace(/\n/g, '<br>')}
                </p>
              </div>
              
              <p style="color: #475569; line-height: 1.6;">
                You can view your full ticket history and reply by logging into your MyNovelCraft account and visiting the Support Center.
              </p>
            </div>
            
            <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
              <p style="color: #64748b; margin: 0; font-size: 14px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      };
      
      await transporter.sendMail(userEmailOptions);
    } else {
      // Notify admin of user reply
      const adminEmailOptions = {
        from: process.env.GMAIL_USERNAME || 'mynovelcraft@gmail.com',
        to: 'mynovelcraft@gmail.com',
        subject: `Ticket Reply - #${ticket.id.substring(0, 8)} - ${ticket.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">MyNovelCraft Support</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">User Reply</p>
            </div>
            
            <div style="padding: 20px; background-color: white; border: 1px solid #e2e8f0;">
              <p style="color: #475569; line-height: 1.6;">
                ${userName} (${userEmail}) has replied to ticket <strong>#${ticket.id.substring(0, 8)}</strong>.
              </p>
              
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Subject:</strong> ${ticket.subject}</p>
                <p style="margin: 5px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
              </div>
              
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
                <h3 style="color: #1e293b; margin-top: 0;">User Message</h3>
                <p style="color: #475569; line-height: 1.6; margin: 0;">
                  ${replyMessage.replace(/\n/g, '<br>')}
                </p>
              </div>
            </div>
            
            <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
              <p style="color: #64748b; margin: 0; font-size: 14px;">
                Respond to this ticket through the MyNovelCraft admin dashboard.
              </p>
            </div>
          </div>
        `,
      };
      
      await transporter.sendMail(adminEmailOptions);
    }
    
    console.log(`Ticket reply notification sent for ticket ${ticket.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send ticket reply notification:', error);
    return false;
  }
}