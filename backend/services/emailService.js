import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send email
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured. Email not sent.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'Smart Energy Portal',
        address: process.env.EMAIL_USER
      },
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Smart Energy Portal</h1>
        <p style="color: #6b7280; margin: 5px 0;">MSEB Customer Service Platform</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h2 style="margin: 0 0 10px 0;">Welcome to Smart Energy Portal!</h2>
        <p style="margin: 0; opacity: 0.9;">Your journey to smart energy management begins now</p>
      </div>
      
      <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="color: #1f2937; margin-top: 0;">Hello ${user.profile.firstName}!</h3>
        <p style="color: #4b5563; line-height: 1.6;">
          Thank you for joining Smart Energy Portal. Your account has been successfully created with the following details:
        </p>
        <ul style="color: #4b5563; line-height: 1.8;">
          <li><strong>MSEB Customer ID:</strong> ${user.msebCustomerId}</li>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Mobile:</strong> ${user.mobile}</li>
          <li><strong>Location:</strong> ${user.fullAddress}</li>
        </ul>
      </div>
      
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 25px;">
        <h4 style="color: #065f46; margin-top: 0;">What you can do now:</h4>
        <ul style="color: #047857; line-height: 1.6; margin-bottom: 0;">
          <li>Track your monthly electricity consumption</li>
          <li>Get intelligent predictions for future usage</li>
          <li>Analyze your energy consumption patterns</li>
          <li>Receive personalized energy-saving recommendations</li>
          <li>Monitor peak usage hours and optimize consumption</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard" 
           style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Access Your Dashboard
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Need help? Contact our support team at 
          <a href="mailto:support@smartenergyportal.com" style="color: #2563eb;">support@smartenergyportal.com</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
          Smart Energy Portal - Maharashtra State Electricity Board
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Welcome to Smart Energy Portal - Your Account is Ready!',
    html
  });
};

// Send consumption reminder
export const sendConsumptionReminder = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Monthly Consumption Reminder</h2>
      <p>Hello ${user.profile.firstName},</p>
      <p>This is a friendly reminder to submit your monthly electricity consumption data.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/consumption" 
           style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Submit Consumption Data
        </a>
      </div>
      <p>Regular data submission helps us provide better predictions and recommendations.</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Monthly Consumption Data Reminder - Smart Energy Portal',
    html
  });
};

// Send bill estimation
export const sendBillEstimation = async (user, estimationData) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Your Monthly Bill Estimation</h2>
      <p>Hello ${user.profile.firstName},</p>
      <p>Based on your consumption data, here's your estimated electricity bill:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937;">Consumption Summary</h3>
        <p><strong>Total Units:</strong> ${estimationData.totalUnits} kWh</p>
        <p><strong>Estimated Bill:</strong> ₹${estimationData.estimatedBill}</p>
        <p><strong>Period:</strong> ${estimationData.month}/${estimationData.year}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/analytics" 
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Detailed Analytics
        </a>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Monthly Bill Estimation - Smart Energy Portal',
    html
  });
};