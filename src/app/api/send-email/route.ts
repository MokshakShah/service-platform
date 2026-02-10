import { NextResponse, NextRequest } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientEmail, subject, body, attachments } = await req.json();
    
    // Validate required fields
    if (!recipientEmail || !subject || !body) {
      return NextResponse.json({ 
        error: 'Missing required fields: recipientEmail, subject, and body are required' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ 
        error: 'Invalid recipient email format' 
      }, { status: 400 });
    }

    // Get sender email from user
    const senderEmail = user.emailAddresses?.[0]?.emailAddress;
    if (!senderEmail) {
      return NextResponse.json({ 
        error: 'No email address found for the current user' 
      }, { status: 400 });
    }

    // Check if email service is configured
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({ 
        error: 'Email service not configured. Please contact administrator.' 
      }, { status: 500 });
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Prepare email options
    const mailOptions: any = {
      from: `"${user.firstName || 'Fuzzie User'}" <${process.env.EMAIL_USER}>`, // Use configured email as sender
      replyTo: senderEmail, // Set user's email as reply-to
      to: recipientEmail,
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                This email was sent via Fuzzie workflow automation by <strong>${senderEmail}</strong>
              </p>
            </div>
            <div style="background-color: white; padding: 20px; border-radius: 5px; border: 1px solid #e9ecef;">
              ${body.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666;">
                Powered by <strong>Fuzzie</strong> - Workflow Automation Platform
              </p>
            </div>
          </div>
        </div>
      `,
    };

    // Handle attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((attachment: any) => ({
        filename: attachment.filename,
        content: attachment.content,
        encoding: 'base64',
        contentType: attachment.contentType,
      }));
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      from: senderEmail,
      to: recipientEmail,
      subject: subject,
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      from: senderEmail,
      to: recipientEmail,
    });

  } catch (error: any) {
    console.error('Email sending error:', error);
    
    // Handle specific nodemailer errors
    if (error.code === 'EAUTH') {
      return NextResponse.json({
        error: 'Email authentication failed. Please check email configuration.',
        details: 'Invalid email credentials'
      }, { status: 500 });
    }
    
    if (error.code === 'ECONNECTION') {
      return NextResponse.json({
        error: 'Failed to connect to email server. Please try again later.',
        details: 'Connection error'
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Failed to send email',
      details: error.message
    }, { status: 500 });
  }
}