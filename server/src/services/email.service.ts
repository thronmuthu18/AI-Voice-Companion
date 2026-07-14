import { Resend } from "resend";
import { env } from "../config/env";

// Lazy-initialize Resend client only if the API key is configured
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured. Email sending is unavailable.");
    }
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export class EmailService {
  /**
   * Sends an email verification link to a newly registered user.
   * The raw token is passed in and embedded in the URL — it is never logged or stored.
   */
  async sendVerificationEmail(
    toEmail: string,
    toName: string,
    rawToken: string
  ): Promise<void> {
    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const fromAddress = env.EMAIL_FROM_ADDRESS || "noreply@champai.app";
    const fromName = env.EMAIL_FROM_NAME || "Champ.ai";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Champ.ai email</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(99,102,241,0.2);border-radius:20px;overflow:hidden;max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;background:linear-gradient(180deg,rgba(99,102,241,0.12),transparent);">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:14px;margin-bottom:16px;">
                <span style="color:#fff;font-size:22px;font-weight:800;">C</span>
              </div>
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Champ.ai</h1>
              <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:13px;">Your AI companion</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 40px 40px;">
              <h2 style="color:#fff;font-size:20px;font-weight:600;margin:0 0 12px;">Verify your email address</h2>
              <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.6;margin:0 0 24px;">
                Hi ${toName.split(" ")[0]},<br><br>
                Thanks for signing up! Click the button below to verify your email address and activate your Champ.ai account.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:0 0 24px;">
                    <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;letter-spacing:0.2px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Token expiry note -->
              <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                <p style="color:rgba(255,255,255,0.55);font-size:13px;margin:0;line-height:1.5;">
                  ⏱ This link expires in <strong style="color:rgba(255,255,255,0.8);">30 minutes</strong>. If you didn't create a Champ.ai account, you can safely ignore this email.
                </p>
              </div>
              <!-- Fallback link -->
              <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color:rgba(99,102,241,0.7);word-break:break-all;">${verifyUrl}</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Champ.ai — All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const client = getResendClient();
    const result = await client.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: toEmail,
      subject: "Verify your Champ.ai email address",
      html,
    });

    if (result.error) {
      // Log the error type but not any token or user data
      console.error("[EmailService] Failed to send verification email:", result.error.name, result.error.message);
      throw new Error("Failed to send verification email. Please try again.");
    }

    // Log only that an email was sent (no token, no sensitive data)
    console.log(`[EmailService] Verification email dispatched to: ${toEmail.substring(0, 3)}***`);
  }
}

export const emailService = new EmailService();
