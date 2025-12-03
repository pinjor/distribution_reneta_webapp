"""
Invoice Report Generator
Generates customer copy invoice reports matching RENATA PLC format
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.platypus.flowables import Flowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.barcode import code128
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
import io


def number_to_words(num: Decimal) -> str:
    """Convert number to words (Bangla/English format)"""
    # Simplified version - can be enhanced with proper Bangla number conversion
    num_int = int(num)
    num_decimal = int((num - num_int) * 100)
    
    # Basic conversion for common numbers
    ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
    tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
    teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
    
    def convert_hundreds(n):
        if n == 0:
            return ""
        if n < 10:
            return ones[n]
        elif n < 20:
            return teens[n - 10]
        elif n < 100:
            return tens[n // 10] + (" " + ones[n % 10] if n % 10 > 0 else "")
        elif n < 1000:
            return ones[n // 100] + " hundred" + (" " + convert_hundreds(n % 100) if n % 100 > 0 else "")
        elif n < 100000:
            return convert_hundreds(n // 1000) + " thousand" + (" " + convert_hundreds(n % 1000) if n % 1000 > 0 else "")
        else:
            return convert_hundreds(n // 100000) + " lakh" + (" " + convert_hundreds(n % 100000) if n % 100000 > 0 else "")
    
    # Convert integer part
    result = convert_hundreds(num_int).capitalize()
    
    # Convert decimal part (Palsa) to words
    if num_decimal > 0:
        palsa_words = convert_hundreds(num_decimal)
        result += f" and Palsa {palsa_words}"
    
    # Always add "only" at the end
    result += " only"
    
    return result


def generate_invoice_report(
    order: Any,
    db: Optional[Any] = None,
    company_name: str = "RENATA LIMITED",
    company_address: str = "BLOCK-C, ROAD-6, HOUSE-39, DHOUR, TURAG, DHAKA-1230",
    company_phone: str = "8981868, 8981813",
    depot_name: str = "",
    customer_address: str = "",
    customer_phone: str = "",
    tin_number: str = "000000354-0005"
) -> bytes:
    """
    Generate an invoice report PDF for a single order/memo
    
    Args:
        order: Order object with items
        db: Database session (optional, for fetching product/customer data)
        company_name: Company name
        company_address: Company address
        company_phone: Company phone
        depot_name: Depot name
        customer_address: Customer address
        customer_phone: Customer phone
        tin_number: TIN number
    
    Returns:
        PDF bytes
    """
    buffer = io.BytesIO()
    # Margins to prevent cutting
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        topMargin=10*mm, 
        bottomMargin=10*mm,
        leftMargin=10*mm,  # Reduced margins for more space
        rightMargin=10*mm  # Reduced margins for more space
    )
    story = []
    styles = getSampleStyleSheet()
    
    # Import models if db is provided
    if db:
        from app import models
    
    # Ensure all string parameters are not None and convert to strings safely
    company_name = (str(company_name) if company_name is not None else "RENATA LIMITED").strip()
    company_address = (str(company_address) if company_address is not None else "BLOCK-C, ROAD-6, HOUSE-39, DHOUR, TURAG, DHAKA-1230").strip()
    company_phone = (str(company_phone) if company_phone is not None else "8981868, 8981813").strip()
    customer_address = (str(customer_address) if customer_address is not None else "").strip()
    customer_phone = (str(customer_phone) if customer_phone is not None else "").strip()
    
    # Format order date
    if hasattr(order, 'delivery_date') and order.delivery_date:
        if hasattr(order.delivery_date, 'strftime'):
            order_date = order.delivery_date.strftime("%d/%m/%Y")
        elif isinstance(order.delivery_date, str):
            try:
                parsed_date = datetime.strptime(order.delivery_date, "%Y-%m-%d")
                order_date = parsed_date.strftime("%d/%m/%Y")
            except:
                order_date = order.delivery_date[:10] if len(order.delivery_date) >= 10 else order.delivery_date
        else:
            order_date = str(order.delivery_date)[:10] if order.delivery_date else datetime.now().strftime("%d/%m/%Y")
    else:
        order_date = datetime.now().strftime("%d/%m/%Y")
    
    # Get memo number
    memo_no = getattr(order, 'memo_number', None) or f"TEMP-{getattr(order, 'id', 'UNK')}"
    pso_code = getattr(order, 'pso_code', None) or "—"
    
    # Get customer data from database
    customer_code = getattr(order, 'customer_code', None) or getattr(order, 'customer_id', None)
    customer_name = getattr(order, 'customer_name', 'Unknown Customer')
    customer_phone_number = customer_phone  # Use passed phone or fetch from DB
    
    if db and customer_code:
        customer = db.query(models.Customer).filter(models.Customer.code == customer_code).first()
        if customer:
            customer_name = (customer.name or customer_name).strip() if customer.name else customer_name
            if customer.phone:
                customer_phone = str(customer.phone).strip()
            if customer.address:
                customer_address = str(customer.address).strip()
    
    # Ensure customer_phone_number is set and all strings are safe
    customer_phone_number = customer_phone.strip() if customer_phone else ""
    customer_name = customer_name.strip() if customer_name else "Unknown Customer"
    customer_address = customer_address.strip() if customer_address else ""
    
    # Create barcode flowable class (needed for top header)
    class BarcodeFlowable(Flowable):
        def __init__(self, barcode_value, width, height):
            Flowable.__init__(self)
            self.barcode_value = barcode_value
            self.width = width
            self.height = height
        
        def draw(self):
            try:
                # Create and draw barcode directly on canvas
                # Code128 barcode with memo number (no human-readable text below)
                barcode = code128.Code128(
                    self.barcode_value,
                    barHeight=12*mm,
                    barWidth=0.8,
                    humanReadable=False
                )
                # Position barcode to align right
                x_pos = self.width - barcode.width
                y_pos = (self.height - barcode.height) / 2
                barcode.drawOn(self.canv, x_pos, y_pos)
            except Exception as e:
                print(f"Error drawing barcode: {e}")
                import traceback
                traceback.print_exc()
                # Draw text as fallback
                self.canv.setFont("Helvetica", 8)
                self.canv.drawRightString(self.width, self.height / 2, f"Memo: {self.barcode_value}")
    
    # Header with Company Name (left) and Barcode (right)
    story.append(Spacer(1, 2*mm))
    
    # Create barcode if memo number exists
    barcode_flowable = None
    barcode_value = str(memo_no).strip()
    if barcode_value:
        try:
            # Create barcode flowable - smaller size for top header
            barcode_flowable = BarcodeFlowable(barcode_value, 50*mm, 18*mm)
        except Exception as e:
            print(f"Error creating barcode flowable: {e}")
    
    # Header table: Company name on left, Barcode on right
    header_table_data = []
    if barcode_flowable:
        header_table_data = [
            [
                Paragraph(company_name, ParagraphStyle(
                    'CompanyTitle',
                    parent=styles['Normal'],
                    fontSize=14,
                    textColor=colors.HexColor('#000000'),
                    fontName='Helvetica-Bold',
                    alignment=TA_LEFT
                )),
                barcode_flowable
            ]
        ]
    else:
        # If no barcode, just show company name centered
        header_table_data = [
            [
                Paragraph(company_name, ParagraphStyle(
                    'CompanyTitle',
                    parent=styles['Normal'],
                    fontSize=14,
                    textColor=colors.HexColor('#000000'),
                    fontName='Helvetica-Bold',
                    alignment=TA_CENTER
                )),
                ''
            ]
        ]
    
    header_table = Table(header_table_data, colWidths=[140*mm, 50*mm] if barcode_flowable else [190*mm, 0])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT' if barcode_flowable else 'CENTER'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 3*mm))  # Added spacer between title and address
    story.append(Paragraph(company_address, ParagraphStyle(
        'CompanyAddress',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#000000'),
        spaceAfter=2,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )))
    story.append(Paragraph(f"Phone: {company_phone}", ParagraphStyle(
        'CompanyPhone',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#000000'),
        spaceAfter=4,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )))
    story.append(Spacer(1, 2*mm))
    
    # Payment type
    payment_type = "COD (PHARMA)"
    story.append(Paragraph(payment_type, ParagraphStyle(
        'PaymentType',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    )))
    story.append(Spacer(1, 3*mm))
    
    # Customer info (left) and Memo details (right)
    invoice_details_data = [
        ['Customer:', customer_phone_number or customer_code or '—', 'Memo No.:', memo_no],
        [customer_name, '', 'Date:', order_date],
        [customer_address or '—', '', 'PSO Code:', pso_code]
    ]
    
    invoice_table = Table(invoice_details_data, colWidths=[30*mm, 60*mm, 30*mm, 60*mm])
    invoice_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'LEFT'),
        ('ALIGN', (3, 0), (3, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(invoice_table)
    story.append(Spacer(1, 4*mm))
    
    # Trade Items table
    trade_items_data = [['Code', 'Product Name', 'Unit', 'Batch No.', 'Trade Price', 'Quantity', 'Amount', 'VAT Amount', 'Total Amount']]
    
    total_trade_amount = Decimal('0')
    total_vat_amount = Decimal('0')
    total_amount = Decimal('0')
    
    # Process selected items only
    trade_items = []
    free_goods_items = []
    
    for item in order.items:
        if not getattr(item, 'selected', True):
            continue
        
        product_code = getattr(item, 'product_code', None) or "N/A"
        product_name = getattr(item, 'product_name', None) or "Unknown Product"
        pack_size_raw = getattr(item, 'pack_size', None)
        # Ensure pack_size is always a valid string
        if pack_size_raw is None:
            pack_size = "1'S"
        else:
            pack_size = str(pack_size_raw).strip()
            if not pack_size or pack_size == "None":
                pack_size = "1'S"
        batch_no = getattr(item, 'batch_number', None) or "N/A"
        
        quantity = Decimal(str(getattr(item, 'quantity', 0) or 0))
        free_goods = Decimal(str(getattr(item, 'free_goods', 0) or 0))
        
        # Get trade price from PriceSetup or use item's trade_price
        trade_price = Decimal('0')
        if db:
            # Try to get product and price setup
            product = db.query(models.Product).filter(models.Product.code == product_code).first()
            if product:
                price_setup = db.query(models.PriceSetup).filter(
                    models.PriceSetup.product_id == product.id,
                    models.PriceSetup.is_active == True
                ).first()
                if price_setup and price_setup.trade_price:
                    trade_price = Decimal(str(price_setup.trade_price))
        
        # Fallback to item's trade_price
        if trade_price == 0:
            trade_price = Decimal(str(getattr(item, 'trade_price', 0) or getattr(item, 'unit_price', 0) or 0))
        
        # If still 0, use demo data
        if trade_price == 0:
            trade_price = Decimal('100.00')  # Demo price
        
        # Calculate unit: packsize * MC count
        # Get MC count from product or use demo
        mc_count = Decimal('1')
        if db:
            product = db.query(models.Product).filter(models.Product.code == product_code).first()
            if product and product.mc_result:
                mc_count = Decimal(str(product.mc_result))
            elif product and product.mc_value1:
                mc_count = Decimal(str(product.mc_value1))
        
        # Parse pack_size to get multiplier (e.g., "3*3" or "3")
        pack_multiplier = Decimal('1')
        if pack_size and isinstance(pack_size, str) and '*' in pack_size:
            try:
                parts = pack_size.split('*')
                pack_multiplier = Decimal(parts[0]) if parts[0].strip().isdigit() else Decimal('1')
            except:
                pass
        elif pack_size and isinstance(pack_size, str) and pack_size.replace("'S", "").replace("S", "").strip().isdigit():
            try:
                pack_multiplier = Decimal(pack_size.replace("'S", "").replace("S", "").strip())
            except:
                pass
        
        total_unit_count = pack_multiplier * mc_count
        unit_display = f"{int(pack_multiplier)}*{int(mc_count)} = {int(total_unit_count)}S"
        
        # Calculate amounts
        # Trade amount = trade_price * quantity
        trade_amount = trade_price * quantity
        # VAT is calculated on trade amount (static 15% for demo)
        vat_amount = trade_amount * Decimal('0.15')
        # Total = trade amount + VAT
        item_total = trade_amount + vat_amount
        
        total_trade_amount += trade_amount
        total_vat_amount += vat_amount
        total_amount += item_total
        
        # Store for trade items table
        trade_items.append({
            'code': product_code,
            'name': product_name,
            'unit': unit_display,
            'batch': batch_no,
            'trade_price': trade_price,
            'qty': quantity,
            'trade_amount': trade_amount,
            'vat_amount': vat_amount,
            'total': item_total
        })
        
        # Store free goods separately
        if free_goods > 0:
            free_goods_items.append({
                'code': product_code,
                'name': product_name,
                'batch': batch_no,
                'ratio': f"{int(quantity)}:1",
                'qty': free_goods,
                'trade_amount': trade_price * free_goods,
                'vat_amount': (trade_price * free_goods) * Decimal('0.15'),
                'total': (trade_price * free_goods) * Decimal('1.15')
            })
    
    # Add trade items to table with increased column widths
    for item in trade_items:
        trade_items_data.append([
            item['code'],
            item['name'][:35] if len(item['name']) > 35 else item['name'],
            item['unit'],
            item['batch'][:15] if len(item['batch']) > 15 else item['batch'],
            f"{float(item['trade_price']):,.2f}",
            str(int(item['qty'])),
            f"{float(item['trade_amount']):,.2f}",
            f"{float(item['vat_amount']):,.2f}",
            f"{float(item['total']):,.2f}"
        ])
    
    # Trade items table - increased column widths to prevent overlapping
    # Total: 15+40+20+18+18+18+20+20+20 = 189mm (fits in 190mm available)
    trade_table = Table(trade_items_data, colWidths=[15*mm, 40*mm, 20*mm, 18*mm, 18*mm, 18*mm, 20*mm, 20*mm, 20*mm])
    trade_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E0E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (4, 1), (8, -1), 'RIGHT'),  # Right align numeric columns
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(trade_table)
    story.append(Spacer(1, 4*mm))
    
    # Summary section - Total Amount
    summary_data = [
        ['Total Amount :', f"{float(total_amount):,.2f}"]
    ]
    
    summary_table = Table(summary_data, colWidths=[140*mm, 50*mm])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 2*mm))
    
    # Less: Trade Discount (always 2%)
    trade_discount_percent = Decimal('2.00')
    trade_discount_amount = total_amount * (trade_discount_percent / 100)
    
    discount_data = [
        [f'Less : Trade Discount On {float(total_amount):,.2f} @ {float(trade_discount_percent):.2f}%', f"{float(trade_discount_amount):,.2f}"]
    ]
    
    discount_table = Table(discount_data, colWidths=[140*mm, 50*mm])
    discount_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(discount_table)
    story.append(Spacer(1, 2*mm))
    
    # Less: Adjusted CN Amount (initially 0)
    adjusted_cn_amount = Decimal('0')
    cn_data = [
        ['Less : Adjusted CN Amount', f"{float(adjusted_cn_amount):,.2f}"]
    ]
    
    cn_table = Table(cn_data, colWidths=[140*mm, 50*mm])
    cn_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(cn_table)
    story.append(Spacer(1, 2*mm))
    
    # Net Payable Amount
    net_payable = total_amount - trade_discount_amount - adjusted_cn_amount
    
    net_payable_data = [
        ['Net Payable Amount :', f"{float(net_payable):,.2f}"]
    ]
    
    net_payable_table = Table(net_payable_data, colWidths=[140*mm, 50*mm])
    net_payable_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(net_payable_table)
    story.append(Spacer(1, 2*mm))
    
    # Amount in words
    inword_text = f"In word: Taka {number_to_words(net_payable)}."
    story.append(Paragraph(inword_text, ParagraphStyle(
        'Inword',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica',
        alignment=TA_LEFT
    )))
    story.append(Spacer(1, 4*mm))
    
    # Free Goods section
    if free_goods_items:
        story.append(Paragraph("Free Goods", ParagraphStyle(
            'FreeGoodsTitle',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold',
            alignment=TA_LEFT
        )))
        story.append(Spacer(1, 2*mm))
        
        free_goods_data = [['Code', 'Product Name', 'Batch No.', 'Ratio Quantity', 'Trade Amount', 'VAT Amount', 'Total Amount']]
        
        for item in free_goods_items:
            free_goods_data.append([
                item['code'],
                item['name'][:35] if len(item['name']) > 35 else item['name'],
                item['batch'][:15] if len(item['batch']) > 15 else item['batch'],
                f"{item['ratio']} ({int(item['qty'])})",
                f"{float(item['trade_amount']):,.2f}",
                f"{float(item['vat_amount']):,.2f}",
                f"{float(item['total']):,.2f}"
            ])
        
        # Free goods table - increased widths
        free_goods_table = Table(free_goods_data, colWidths=[15*mm, 40*mm, 20*mm, 25*mm, 20*mm, 20*mm, 20*mm])
        free_goods_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E0E0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (4, 1), (6, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(free_goods_table)
        story.append(Spacer(1, 3*mm))
    
    # Dues section
    story.append(Paragraph("Dues", ParagraphStyle(
        'DuesTitle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT
    )))
    story.append(Spacer(1, 2*mm))
    
    dues_data = [['Memo No.', 'Date', 'Payable Amount']]
    # Add empty row
    dues_data.append(['—', '—', '—'])
    
    dues_table = Table(dues_data, colWidths=[60*mm, 60*mm, 60*mm])
    dues_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E0E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(dues_table)
    story.append(Spacer(1, 4*mm))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
