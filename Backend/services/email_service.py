# SCM-INSIGHTS Email Service
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional
from config import EMAIL_CONFIG

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_server = EMAIL_CONFIG["smtp_host"]
        self.smtp_port = EMAIL_CONFIG["smtp_port"]
        self.smtp_user = EMAIL_CONFIG["smtp_user"]
        self.smtp_password = EMAIL_CONFIG["smtp_password"]
        self.from_name = EMAIL_CONFIG["from_name"]
        self.use_tls = EMAIL_CONFIG.get("use_tls", True)

    def _send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        is_html: bool = True,
    ) -> bool:
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{self.from_name} <{self.smtp_user}>"
            msg["To"] = ", ".join(to)
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "html" if is_html else "plain", "utf-8"))
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.smtp_user, to, msg.as_string())
            return True
        except Exception as e:
            logger.error("[EmailService] Failed to send email: %s", e)
            return False

    def send_activation_email(self, email: str, activation_url: str) -> bool:
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6;">
            <div style="margin-bottom: 28px;">
                <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 8px 0;">Welcome to SCM Insights!</h1>
                <p style="margin: 0; color: #555; font-size: 15px;">You're one step away from accessing global trade intelligence.</p>
            </div>

            <p style="margin: 0 0 20px 0;">Please click below to activate your account:</p>
            <p style="margin: 0 0 24px 0;">
                <a href="{activation_url}" style="display: inline-block; background: #4F46E5; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Activate Account</a>
            </p>

            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #4F46E5;">
                <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e3a5f;">Once activated, you can access:</p>
                <ul style="margin: 0; padding-left: 20px; color: #444;">
                    <li><strong>Buyers &amp; Importers</strong> — Discover and connect with verified buyers worldwide</li>
                    <li><strong>Suppliers &amp; Exporters</strong> — Find suppliers and trade partners by product and country</li>
                    <li><strong>Buyers Directory</strong> — Browse the full directory and filter by HS code, country, and more</li>
                    <li><strong>One-to-one connections</strong> — Reach out directly to buyers and suppliers for your trade needs</li>
                    <li><strong>Trade insights</strong> — View top companies, years, and summary data to make informed decisions</li>
                </ul>
            </div>

            <p style="color: #666; font-size: 13px; margin: 0 0 8px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #4F46E5; margin: 0 0 20px 0;">{activation_url}</p>
            <p style="color: #888; font-size: 12px; margin: 0;">This link expires in 24 hours.</p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;">
            <p style="margin: 0; text-align: center; font-size: 12px; color: #64748b;">
                Powered by <a href="https://aashita.ai" style="color: #4F46E5; text-decoration: none; font-weight: 600;">Aashita</a> · <a href="https://aashita.ai" style="color: #4F46E5; text-decoration: none;">aashita.ai</a>
            </p>
        </body>
        </html>
        """
        return self._send_email([email], "Welcome to SCM Insights – Activate Your Account", html)

    def send_password_reset_email(self, email: str, reset_url: str) -> bool:
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6;">
            <h1 style="color: #1e3a5f; font-size: 22px; margin: 0 0 16px 0;">Password Reset</h1>
            <p style="margin: 0 0 20px 0;">Click below to reset your password for SCM Insights:</p>
            <p style="margin: 0 0 24px 0;">
                <a href="{reset_url}" style="display: inline-block; background: #4F46E5; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
            </p>
            <p style="color: #888; font-size: 13px; margin: 0;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;">
            <p style="margin: 0; text-align: center; font-size: 12px; color: #64748b;">
                Powered by <a href="https://aashita.ai" style="color: #4F46E5; text-decoration: none; font-weight: 600;">Aashita</a> · <a href="https://aashita.ai" style="color: #4F46E5; text-decoration: none;">aashita.ai</a>
            </p>
        </body>
        </html>
        """
        return self._send_email([email], "SCM Insights: Reset Your Password", html)

    def send_contact_reply(
        self,
        to_email: str,
        recipient_name: str,
        subject: str,
        body: str,
    ) -> bool:
        """Send reply from admin to a contact form submission. Body is plain text or HTML."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6;">
            <p style="margin: 0 0 16px 0;">Hi {recipient_name or 'there'},</p>
            <div style="margin: 20px 0; padding: 16px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                {body.replace(chr(10), "<br>") if body else ""}
            </div>
            <p style="color: #666; font-size: 13px; margin: 24px 0 0 0;">Best regards,<br/>SCM Insights Team</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;">
            <p style="margin: 0; text-align: center; font-size: 12px; color: #64748b;">
                SCM Insights · <a href="https://aashita.ai" style="color: #4F46E5; text-decoration: none;">aashita.ai</a>
            </p>
        </body>
        </html>
        """
        return self._send_email([to_email], subject or "Re: Your enquiry – SCM Insights", html)
