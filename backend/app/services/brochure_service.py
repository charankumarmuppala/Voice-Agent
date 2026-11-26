import io
import datetime
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def format_inr_text(amount: float) -> str:
    if not amount:
        return "₹0"
    if amount >= 10000000:
        cr = amount / 10000000
        return f"₹{cr:.2f} Cr"
    elif amount >= 100000:
        lakhs = amount / 100000
        return f"₹{lakhs:.2f} Lakhs"
    return f"₹{amount:,.0f}"


def generate_property_brochure_pdf(
    property_data: Dict[str, Any],
    visit_details: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Generates a professional PDF brochure for a property using ReportLab.
    Matches the Warm Neo-Brutalist Light theme.
    Clearly labels property details as demonstration data.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    brand_color = colors.HexColor("#14532D")       # Forest green
    cream_bg = colors.HexColor("#F5F2E9")          # Warm cream
    border_color = colors.HexColor("#D6CDBB")      # Subtle beige
    text_dark = colors.HexColor("#171717")         # Near black
    text_muted = colors.HexColor("#555555")
    accent_green = colors.HexColor("#E2F1E7")      # Pastel green

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=brand_color,
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=text_muted,
        alignment=TA_LEFT
    )

    prop_name_style = ParagraphStyle(
        'PropName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=brand_color
    )

    label_style = ParagraphStyle(
        'CellLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=text_muted
    )

    value_style = ParagraphStyle(
        'CellValue',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=text_dark
    )

    body_style = ParagraphStyle(
        'BodyDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=text_dark
    )

    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#854D0E"),
        alignment=TA_CENTER
    )

    contact_style = ParagraphStyle(
        'ContactText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=text_dark,
        alignment=TA_CENTER
    )

    elements = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("DREAMSPACE PROPERTIES BANGALORE", title_style),
            Paragraph(f"Date: {datetime.datetime.now().strftime('%d %b %Y')}<br/>Ref: {visit_details.get('booking_id', 'ESTATE-DEMO') if visit_details else 'ESTATE-DEMO'}", ParagraphStyle('HeadRight', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=text_muted, alignment=TA_RIGHT))
        ],
        [
            Paragraph("Official Property Portfolio • Bangalore Tech Corridors", subtitle_style),
            Paragraph("Verified Listing", ParagraphStyle('HeadTag', fontName='Helvetica-Bold', fontSize=8, textColor=brand_color, alignment=TA_RIGHT))
        ]
    ]
    header_table = Table(header_data, colWidths=[380, 160])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=brand_color, spaceAfter=14))

    # 2. Property Title & Price Highlight
    prop_name = property_data.get("name", "DreamSpace Luxury Residence")
    location = property_data.get("location", "Bangalore")
    prop_type = property_data.get("property_type", "Apartment")
    bhk = property_data.get("bhk", 3)
    price = property_data.get("price", 0)
    price_str = format_inr_text(price)
    area = property_data.get("area", 1600)
    avail = property_data.get("availability", "Ready to Move")
    desc = property_data.get("description", "Premium residential development offering lifestyle amenities.")

    banner_data = [
        [
            Paragraph(prop_name, prop_name_style),
            Paragraph(f"<font size='14'><b>{price_str}</b></font><br/><font size='8' color='#555555'>All Inclusive (Approx)</font>", ParagraphStyle('PriceCell', alignment=TA_RIGHT, leading=16))
        ],
        [
            Paragraph(f"<b>Location:</b> {location}, Bangalore • <b>Type:</b> {bhk} BHK {prop_type} • <b>Super Area:</b> {area:,.0f} sq.ft.", subtitle_style),
            Paragraph(f"<font color='#14532D'><b>Status: {avail}</b></font>", ParagraphStyle('StatusCell', fontName='Helvetica-Bold', fontSize=8.5, alignment=TA_RIGHT))
        ]
    ]
    banner_table = Table(banner_data, colWidths=[380, 160])
    banner_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), cream_bg),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 12))

    # 3. Key Specifications Grid
    spec_data = [
        [
            Paragraph("CONFIGURATION", label_style),
            Paragraph("SUPER BUILT-UP", label_style),
            Paragraph("POSSESSION STATUS", label_style),
            Paragraph("PRIMARY LOCALITY", label_style)
        ],
        [
            Paragraph(f"{bhk} BHK Premium", value_style),
            Paragraph(f"{area:,.0f} Sq. Ft.", value_style),
            Paragraph(str(avail), value_style),
            Paragraph(str(location), value_style)
        ]
    ]
    spec_table = Table(spec_data, colWidths=[135, 135, 135, 135])
    spec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFFCF7")),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(spec_table)
    elements.append(Spacer(1, 12))

    # 4. Amenities Section
    amenities = property_data.get("amenities", [])
    if isinstance(amenities, str):
        try:
            import json
            amenities = json.loads(amenities)
        except Exception:
            amenities = [a.strip() for a in amenities.split(",") if a.strip()]

    if not amenities:
        amenities = ["Clubhouse", "Swimming Pool", "Fitness Center", "Children Play Area", "24/7 Security", "Power Backup"]

    # Format amenities into 3 columns
    amenity_items = [f"• {a}" for a in amenities]
    num_cols = 3
    rows = []
    for i in range(0, len(amenity_items), num_cols):
        chunk = amenity_items[i:i + num_cols]
        while len(chunk) < num_cols:
            chunk.append("")
        rows.append([Paragraph(item, body_style) for item in chunk])

    amenities_table = Table(
        [[Paragraph("<b>PREMIER COMMUNITY AMENITIES & FACILITIES</b>", label_style), "", ""]] + rows,
        colWidths=[180, 180, 180]
    )
    amenities_table.setStyle(TableStyle([
        ('SPAN', (0, 0), (2, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), cream_bg),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#FFFCF7")),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAE3D4")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(amenities_table)
    elements.append(Spacer(1, 12))

    # 5. Property Overview Narrative
    desc_table = Table([
        [Paragraph("<b>PROJECT OVERVIEW & SPECIFICATIONS</b>", label_style)],
        [Paragraph(desc, body_style)]
    ], colWidths=[540])
    desc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), cream_bg),
        ('BACKGROUND', (0, 1), (0, 1), colors.HexColor("#FFFCF7")),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(desc_table)
    elements.append(Spacer(1, 12))

    # 6. Site Visit Walkthrough Pass (If booked)
    if visit_details:
        cust_name = visit_details.get("customer_name", "Valued Customer")
        cust_phone = visit_details.get("customer_phone", "Verified on file")
        booking_id = visit_details.get("booking_id", "APT-CONFIRMED")
        visit_time = visit_details.get("date_time", "Upcoming Weekend")

        visit_data = [
            [
                Paragraph("<b>CONFIRMED SITE VISIT PASS</b>", ParagraphStyle('VTitle', fontName='Helvetica-Bold', fontSize=9, textColor=brand_color)),
                Paragraph(f"<b>BOOKING ID: {booking_id}</b>", ParagraphStyle('VBid', fontName='Helvetica-Bold', fontSize=9, textColor=brand_color, alignment=TA_RIGHT))
            ],
            [
                Paragraph(f"<b>Visitor:</b> {cust_name}<br/><b>Contact:</b> {cust_phone}", body_style),
                Paragraph(f"<b>Scheduled Slot:</b> {visit_time}<br/><b>Property:</b> {prop_name} ({location})", body_style)
            ],
            [
                Paragraph("<i>Please arrive 10 minutes prior to your slot. Our dedicated sales concierge will meet you at the community clubhouse.</i>", ParagraphStyle('VNote', fontName='Helvetica-Oblique', fontSize=8, textColor=text_muted)),
                Paragraph("Status: <b>CONFIRMED</b>", ParagraphStyle('VStat', fontName='Helvetica-Bold', fontSize=9, textColor=brand_color, alignment=TA_RIGHT))
            ]
        ]
        visit_table = Table(visit_data, colWidths=[340, 200])
        visit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), accent_green),
            ('BOX', (0, 0), (-1, -1), 1.5, brand_color),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#B7DEC4")),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(visit_table)
        elements.append(Spacer(1, 12))

    # 7. Demonstration Notice (Prominently labeled as requested)
    disclaimer_box = Table([
        [Paragraph(
            "<b>NOTICE: DEMONSTRATION DATA</b><br/>"
            "This property brochure, pricing, specifications, and appointment reference are simulated demonstration data "
            "generated by EstateVoice AI for showcasing autonomous real estate sales assistant capabilities. "
            "Not a legal offer for sale or contract.",
            disclaimer_style
        )]
    ], colWidths=[540])
    disclaimer_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFF1CC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E5D8A8")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(disclaimer_box)
    elements.append(Spacer(1, 10))

    # 8. Company Contact Footer
    contact_data = [
        [
            Paragraph(
                "<b>DreamSpace Properties Bangalore</b> • Level 4, UB City, Vittal Mallya Road, Bangalore - 560001<br/>"
                "Sales Desk: +91 80 4567 8900 • Email: sales@dreamspacerealty.com • Web: https://dreamspacerealty.com",
                contact_style
            )
        ]
    ]
    contact_table = Table(contact_data, colWidths=[540])
    contact_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(contact_table)

    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
