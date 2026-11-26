import smtplib
import logging
import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Dict, Any, Optional

from app.config import settings
from app.services.brochure_service import generate_property_brochure_pdf, format_inr_text

logger = logging.getLogger(__name__)


def send_booking_confirmation_email(
    to_email: str,
    customer_name: str,
    booking_id: str,
    property_data: Dict[str, Any],
    visit_details: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Sends a professional booking confirmation email with an attached PDF brochure
    using Python SMTP with Gmail and an App Password stored in .env.
    Tracks status as 'Sent' or 'Failed' and prevents false delivery claims.
    """
    if not to_email or "@" not in to_email:
        return {"status": "Failed", "error": f"Invalid recipient email: {to_email}"}

    smtp_user = settings.SMTP_USER or getattr(settings, "GMAIL_USER", "")
    smtp_pass = settings.SMTP_PASSWORD or getattr(settings, "GMAIL_APP_PASSWORD", "")
    smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
    smtp_port = int(settings.SMTP_PORT or 587)
    from_name = getattr(settings, "SMTP_FROM_NAME", "DreamSpace Realty Bangalore")
    company_phone = getattr(settings, "COMPANY_PHONE", "+91 80 4567 8900")
    company_email = getattr(settings, "COMPANY_EMAIL", "sales@dreamspacerealty.com")
    company_address = getattr(settings, "COMPANY_ADDRESS", "Level 4, UB City, Vittal Mallya Road, Bangalore - 560001")

    # If SMTP is not yet configured with real credentials
    if not smtp_user or not smtp_pass or smtp_user == "your_email@gmail.com":
        msg = "Gmail SMTP credentials not configured in .env (SMTP_USER and SMTP_PASSWORD required)."
        logger.warning(msg)
        return {"status": "Failed", "error": msg}

    prop_name = property_data.get("name", "DreamSpace Luxury Residence")
    location = property_data.get("location", "Bangalore")
    prop_type = property_data.get("property_type", "Apartment")
    bhk = property_data.get("bhk", 3)
    price_val = property_data.get("price", 0)
    price_str = format_inr_text(price_val)
    visit_time = visit_details.get("date_time", "Upcoming Weekend")

    amenities = property_data.get("amenities", [])
    if isinstance(amenities, list):
        amenities_str = ", ".join(amenities)
    else:
        amenities_str = str(amenities)

    # 1. Generate ReportLab PDF brochure
    try:
        pdf_bytes = generate_property_brochure_pdf(property_data, visit_details)
    except Exception as e:
        logger.error(f"Error generating PDF brochure: {e}")
        pdf_bytes = None

    # 2. Build MIME Email
    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Site Visit Confirmed: {prop_name} | Booking ID: {booking_id}"
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = to_email

    text_content = f"""Dear {customer_name},

Thank you for choosing DreamSpace Realty Bangalore! Your upcoming property walkthrough has been officially scheduled.

VISIT DETAILS & INSTRUCTIONS:
• Booking ID: {booking_id}
• Property: {prop_name} ({bhk} BHK {prop_type})
• Property Address: {prop_name}, Tech Corridor Main Road, {location}, Bangalore - 560066
• Pricing: {price_str}
• Key Amenities: {amenities_str}
• Scheduled Visit Date & Time: {visit_time}

VISIT INSTRUCTIONS:
1. Please arrive 10 minutes before your scheduled appointment slot ({visit_time}).
2. Display this Booking ID ({booking_id}) at the main security gate for reserved guest parking and visitor badge.
3. Our property concierge will meet you at the Club Experience Centre for your personalized model home and amenities walkthrough.
4. Comfortable walking footwear is recommended for viewing the outdoor landscaped grounds.

Your official property brochure is attached as a PDF to this email.

CONTACT & VENUE:
DreamSpace Realty Bangalore
Office: {company_address}
Concierge Desk: {company_phone}
Email: {company_email}
Website: https://dreamspacerealty.com

NOTICE: This property listing and booking are demonstration data created for showcasing EstateVoice AI.
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F2E9; margin: 0; padding: 24px; color: #171717; }}
  .container {{ max-width: 600px; margin: 0 auto; background: #FFFCF7; border: 1px solid #D6CDBB; border-radius: 20px; overflow: hidden; }}
  .header {{ background-color: #14532D; color: #FFFFFF; padding: 24px; text-align: left; }}
  .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
  .header p {{ margin: 4px 0 0; font-size: 12px; color: #E2F1E7; }}
  .content {{ padding: 24px; }}
  .greeting {{ font-size: 15px; font-weight: 600; margin-bottom: 16px; }}
  .badge {{ display: inline-block; background-color: #E2F1E7; color: #14532D; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; border: 1px solid #D6CDBB; }}
  .card {{ background-color: #F5F2E9; border: 1px solid #D6CDBB; border-radius: 14px; padding: 16px; margin: 16px 0; }}
  .row {{ display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(214, 205, 187, 0.6); font-size: 13px; }}
  .row:last-child {{ border-bottom: none; }}
  .label {{ color: #555555; font-weight: 500; }}
  .value {{ font-weight: 700; color: #171717; text-align: right; }}
  .disclaimer {{ background-color: #FFF1CC; border: 1px solid #E5D8A8; border-radius: 12px; padding: 12px; font-size: 11px; color: #854D0E; margin-top: 20px; line-height: 1.4; }}
  .footer {{ padding: 20px 24px; font-size: 11px; color: #777777; border-top: 1px solid #D6CDBB; text-align: center; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>DreamSpace Realty Bangalore</h1>
    <p>Official Site Visit Walkthrough Confirmation</p>
  </div>
  <div class="content">
    <div class="greeting">Dear {customer_name},</div>
    <span class="badge">CONFIRMED SITE VISIT • {booking_id}</span>
    <p style="font-size: 13px; line-height: 1.5; margin: 0 0 16px;">
      We are delighted to confirm your upcoming property tour. Our sales concierge will welcome you at the project reception.
    </p>

    <div class="card">
      <div class="row"><span class="label">Booking Reference:</span><span class="value">{booking_id}</span></div>
      <div class="row"><span class="label">Property Name:</span><span class="value">{prop_name}</span></div>
      <div class="row"><span class="label">Property Address:</span><span class="value" style="font-size: 11px;">{prop_name}, Tech Corridor Main Rd, {location}, Bangalore - 560066</span></div>
      <div class="row"><span class="label">Configuration:</span><span class="value">{bhk} BHK {prop_type}</span></div>
      <div class="row"><span class="label">Location:</span><span class="value">{location}, Bangalore</span></div>
      <div class="row"><span class="label">Indicative Price:</span><span class="value">{price_str}</span></div>
      <div class="row"><span class="label">Scheduled Time:</span><span class="value" style="color: #14532D;">{visit_time}</span></div>
      <div class="row"><span class="label">Amenities:</span><span class="value" style="font-size: 11px;">{amenities_str}</span></div>
    </div>

    <div style="background-color: #E2F1E7; border: 1px solid #B7DEC4; border-radius: 12px; padding: 14px; margin: 16px 0;">
      <h3 style="margin: 0 0 6px; font-size: 12px; color: #14532D; font-weight: 700;">VISIT INSTRUCTIONS & VENUE GUIDANCE</h3>
      <ol style="margin: 0; padding-left: 18px; font-size: 11.5px; color: #171717; line-height: 1.5;">
        <li>Arrive 10 minutes prior to your scheduled slot ({visit_time}).</li>
        <li>Present this confirmation (Booking ID: <b>{booking_id}</b>) at the security desk for reserved visitor parking.</li>
        <li>Our senior sales concierge will meet you at the Club Experience Centre for a tour of model homes and amenities.</li>
        <li>Comfortable walking footwear is suggested for touring the landscaped outdoor areas.</li>
      </ol>
    </div>

    <p style="font-size: 12px; color: #555555; line-height: 1.4;">
      📎 <b>Property Brochure Attached:</b> A complete PDF brochure containing floor plans, community specifications, and direction map is attached to this email.
    </p>

    <div class="disclaimer">
      <b>Demonstration Data Notice:</b> This confirmation, property details, and attached brochure are simulated demonstration records created by EstateVoice AI Bangalore for showcase and testing purposes.
    </div>
  </div>
  <div class="footer">
    <b>DreamSpace Realty Bangalore</b> • {company_address}<br/>
    Phone: {company_phone} • Email: {company_email} • Web: https://dreamspacerealty.com
  </div>
</div>
</body>
</html>
"""

    alt_part = MIMEMultipart("alternative")
    alt_part.attach(MIMEText(text_content, "plain", "utf-8"))
    alt_part.attach(MIMEText(html_content, "html", "utf-8"))
    msg.attach(alt_part)

    # Attach PDF brochure if generated
    if pdf_bytes:
        safe_name = "".join(c for c in prop_name if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
        pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
        pdf_attachment.add_header(
            "Content-Disposition",
            "attachment",
            filename=f"{safe_name}_Brochure.pdf"
        )
        msg.attach(pdf_attachment)

    # 3. Deliver via SMTP TLS
    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        logger.info(f"Successfully sent confirmation email to {to_email} for booking {booking_id}")
        return {"status": "Sent", "error": None}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send email to {to_email} via {smtp_host}:{smtp_port}: {error_msg}")
        return {"status": "Failed", "error": error_msg}


def send_booking_email_in_background(appointment_id: str):
    """
    Executes in a background thread/task to generate brochure and deliver email
    without blocking or delaying the active voice/chat conversation.
    Updates appointment status to 'Sent' or 'Failed' and prevents duplicate sending.
    """
    from app.database import SessionLocal
    from app.models import Appointment, Property

    db = SessionLocal()
    try:
        appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
        if not appt:
            logger.warning(f"Background email task: Appointment {appointment_id} not found.")
            return

        # Prevent duplicate emails
        if appt.email_status == "Sent":
            logger.info(f"Email for appointment {appointment_id} already sent. Skipping duplicate.")
            return

        if not appt.customer_email:
            logger.info(f"Appointment {appointment_id} has no customer_email yet. Skipping email.")
            return

        appt.email_status = "Pending"
        db.commit()

        # Fetch actual property information from database
        prop = db.query(Property).filter(Property.name == appt.property_name).first()
        prop_data = prop.to_dict() if prop else {
            "name": appt.property_name,
            "location": appt.location,
            "property_type": "Apartment",
            "bhk": 3,
            "price": 14500000,
            "area": 1850,
            "amenities": ["Clubhouse", "Swimming Pool", "Gym", "24/7 Security"],
            "availability": "Ready to Move",
            "description": f"Verified premium residential development at {appt.property_name}, {appt.location}."
        }

        visit_details = {
            "customer_name": appt.customer_name,
            "customer_phone": appt.customer_phone,
            "customer_email": appt.customer_email,
            "booking_id": appt.appointment_id,
            "date_time": appt.date_time.strftime("%A, %d %b %Y at %I:%M %p") if appt.date_time else "Upcoming Weekend"
        }

        result = send_booking_confirmation_email(
            to_email=appt.customer_email,
            customer_name=appt.customer_name,
            booking_id=appt.appointment_id,
            property_data=prop_data,
            visit_details=visit_details
        )

        appt.email_status = result["status"]
        if result["status"] == "Sent":
            appt.email_sent_at = datetime.datetime.now(datetime.timezone.utc)
            appt.email_error = None
            logger.info(f"Background email completed: {appointment_id} status={appt.email_status}")
        else:
            appt.email_error = result.get("error")
            logger.warning(f"Background email delivery failed: {appointment_id} err={appt.email_error}")

        db.commit()
    except Exception as e:
        logger.error(f"Error in background email task for {appointment_id}: {e}")
        try:
            appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
            if appt:
                appt.email_status = "Failed"
                appt.email_error = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

