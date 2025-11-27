"""
Packing Report Generator
Generates PDF packing reports similar to the RENATA LIMITED format
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any
import io


def generate_packing_number() -> str:
    """Generate a packing number (6-digit)"""
    import random
    return str(random.randint(100000, 999999))


def generate_packing_report(
    orders: List[Any],
    company_name: str = "RENATA LIMITED",
    depot_name: str = "",
    route_name: str = "",
    area: str = ""
) -> bytes:
    """
    Generate a packing report PDF
    
    Args:
        orders: List of Order objects with items
        company_name: Company name
        depot_name: Depot name
        route_name: Route name
        area: Area name (defaults to route_name)
    
    Returns:
        PDF bytes
    """
    buffer = io.BytesIO()
    # Increased margins to prevent cutting on left and right sides
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        topMargin=15*mm, 
        bottomMargin=15*mm,
        leftMargin=10*mm,  # Reduced to give more space for table
        rightMargin=10*mm  # Reduced to give more space for table
    )
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#000000'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#000000'),
        alignment=TA_LEFT,
        fontName='Helvetica'
    )
    
    # Generate packing number
    packing_no = generate_packing_number()
    report_date = datetime.now().strftime("%d/%m/%Y")
    
    # Use route_name as area if area is not provided
    display_area = area or route_name or "N/A"
    
    # Header - Title format: RENATA LIMITED, then Depot, then PACKING REPORT (ALL CENTERED)
    # First line: Company name (bold, largest, CENTERED) - Always use RENATA LIMITED
    company_title_style = ParagraphStyle(
        'CompanyTitle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=colors.HexColor('#000000'),
        spaceAfter=8,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph("RENATA LIMITED", company_title_style))
    story.append(Spacer(1, 3*mm))  # Space after company name
    
    # Second line: Depot name (less bold, smaller, CENTERED)
    depot_style = ParagraphStyle(
        'DepotName',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#000000'),
        spaceAfter=8,
        alignment=TA_CENTER,
        fontName='Helvetica'  # Regular, not bold
    )
    depot_display = depot_name.upper() if depot_name else "CENTRAL STORE"
    story.append(Paragraph(depot_display, depot_style))
    story.append(Spacer(1, 3*mm))  # Space after depot name
    
    # Third line: Report name (bold, similar to first line, CENTERED)
    report_title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=colors.HexColor('#000000'),
        spaceAfter=10,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph("PACKING REPORT", report_title_style))
    story.append(Spacer(1, 8*mm))  # Increased space under title
    
    # Header info table: Packing No., Area (route), Date
    # Layout matching image: Date top right, Packing No. bottom left, Area bottom right
    # Create a 2-row table with proper alignment
    header_data = [
        ['', '', 'Date :', report_date],  # Top row: Date on right
        ['Packing No. :', packing_no, 'AREA :', display_area]  # Bottom row: Packing No. left, Area right
    ]
    # Adjust header table widths to fit page (A4 width - margins = 210mm - 20mm = 190mm)
    header_table = Table(header_data, colWidths=[40*mm, 50*mm, 35*mm, 65*mm])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),  # Packing No. label left
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),  # Packing No. value left
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),  # Date label right (top row)
        ('ALIGN', (3, 0), (3, 0), 'LEFT'),  # Date value left (top row)
        ('ALIGN', (2, 1), (2, 1), 'RIGHT'),  # Area label right (bottom row)
        ('ALIGN', (3, 1), (3, 1), 'LEFT'),  # Area value left (bottom row)
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 1), (-1, 1), 1, colors.black),  # Horizontal line below bottom row
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8*mm))
    
    # Group products by product code and batch number
    product_groups: Dict[str, Dict[str, Any]] = {}
    
    # Process orders and items
    memo_list = []
    total_amount = Decimal('0')
    
    for order in orders:
        # Format order date
        if hasattr(order.delivery_date, 'strftime'):
            order_date = order.delivery_date.strftime("%d/%m/%y")
        elif order.delivery_date:
            # Try to parse if it's a string
            try:
                if isinstance(order.delivery_date, str):
                    # Try different date formats
                    try:
                        parsed_date = datetime.strptime(order.delivery_date, "%Y-%m-%d")
                        order_date = parsed_date.strftime("%d/%m/%y")
                    except:
                        # Try ISO format
                        try:
                            parsed_date = datetime.fromisoformat(order.delivery_date.replace('Z', '+00:00'))
                            order_date = parsed_date.strftime("%d/%m/%y")
                        except:
                            order_date = str(order.delivery_date)[:8] if len(str(order.delivery_date)) >= 8 else str(order.delivery_date)
                else:
                    order_date = str(order.delivery_date)[:8] if order.delivery_date else "—"
            except Exception as e:
                # Fallback to string representation
                order_date = str(order.delivery_date)[:8] if order.delivery_date else "—"
        else:
            order_date = "—"
        
        # Calculate total amount from selected items (matching frontend calculation)
        memo_amount = Decimal('0')
        
        for item in order.items:
            if not item.selected:
                continue
            
            # Calculate total price: unit_price * (1 - discount/100) * total_quantity
            unit_price_val = getattr(item, 'unit_price', None)
            trade_price_val = getattr(item, 'trade_price', None)
            unit_price = Decimal(str(unit_price_val if unit_price_val is not None else (trade_price_val if trade_price_val is not None else 0)))
            
            discount_percent_val = getattr(item, 'discount_percent', None)
            discount = Decimal(str(discount_percent_val if discount_percent_val is not None else 0))
            
            total_qty_val = getattr(item, 'total_quantity', None)
            quantity_val = getattr(item, 'quantity', None) or 0
            free_goods_val = getattr(item, 'free_goods', None) or 0
            total_qty_decimal = Decimal(str(total_qty_val if total_qty_val is not None else (quantity_val + free_goods_val)))
            
            price_after_discount = unit_price * (1 - discount / 100)
            item_total = price_after_discount * total_qty_decimal
            
            memo_amount += item_total
            
            # Group by product code and batch number for product table
            product_code = getattr(item, 'product_code', None) or "N/A"
            product_name = getattr(item, 'product_name', None) or "Unknown Product"
            quantity = float(quantity_val)
            free_goods = float(free_goods_val)
            total_qty = float(total_qty_val if total_qty_val is not None else (quantity + free_goods))
            batch_no = getattr(item, 'batch_number', None) or "N/A"
            
            # Group by product code and batch number
            # Create a key combining product code and batch number for proper grouping
            group_key = f"{product_code}_{batch_no}"
            
            if group_key not in product_groups:
                product_groups[group_key] = {
                    'product_code': product_code,
                    'product_name': product_name,
                    'total_qty': 0,
                    'carton_qty': 0,
                    'loose_qty': 0,
                    'carton_size': 0,
                    'free_goods': 0,
                    'batch_no': batch_no
                }
            
            product_groups[group_key]['total_qty'] += total_qty
            product_groups[group_key]['loose_qty'] += total_qty  # Assuming all are loose for now
            product_groups[group_key]['free_goods'] += free_goods
        
        # Add memo to list - include all orders (memo_number should be generated by now)
        # If memo_number is still missing, generate a placeholder
        memo_no = getattr(order, 'memo_number', None) or f"TEMP-{getattr(order, 'id', 'UNK')}"
        pso_code = getattr(order, 'pso_code', None) or "—"
        memo_list.append({
            'memo_no': memo_no,
            'date': order_date,
            'pso_code': pso_code,
            'amount': memo_amount
        })
        total_amount += memo_amount
    
    # Product table
    story.append(Paragraph("A Group - Phamar, Purnava & Suture Products", ParagraphStyle(
        'GroupTitle',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT
    )))
    story.append(Spacer(1, 3*mm))
    
    # Product table data with wrapped headers
    product_table_data = [[
        Paragraph('Code', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('Product<br/>Name', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('No. of<br/>Total', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('No. of<br/>Carton', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('No. of<br/>Loose', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('Carton<br/>Size', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('Carton<br/>Quantity', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('Free<br/>Goods', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('Batch<br/>No.', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER))
    ]]
    
    # Check if we have any products
    if not product_groups:
        product_table_data.append([
            "—", "No products found", "0", "0", "0", "0", "0", "0", "—"
        ])
    else:
        for group_key, data in sorted(product_groups.items(), key=lambda x: x[1].get('product_code', '')):
            # Calculate carton quantity (total - free goods)
            carton_qty = max(0, int(data.get('total_qty', 0) - data.get('free_goods', 0)))
            
            product_table_data.append([
                data.get('product_code', 'N/A'),
                (data.get('product_name', 'Unknown')[:40] if len(data.get('product_name', '')) > 40 else data.get('product_name', 'Unknown')),  # Truncate to fit 50mm column
                str(int(data.get('total_qty', 0))),
                "0",  # No. of Carton (assuming all loose)
                str(int(data.get('loose_qty', 0))),
                str(int(data.get('carton_size', 0))) if data.get('carton_size', 0) > 0 else "0",
                str(carton_qty),
                str(int(data.get('free_goods', 0))),
                (data.get('batch_no', 'N/A')[:20] if len(data.get('batch_no', '')) > 20 else data.get('batch_no', 'N/A'))  # Truncate long batch numbers
            ])
    
    # Calculate column widths to fit page (A4 width - margins = 210mm - 20mm = 190mm)
    # Total: 17+52+17+17+17+17+19+14+17 = 187mm (fits within 190mm with 3mm buffer)
    available_width = 190*mm
    product_table = Table(product_table_data, colWidths=[
        17*mm,  # Code
        52*mm,  # Product Name (increased for full names)
        17*mm,  # No. of Total
        17*mm,  # No. of Carton
        17*mm,  # No. of Loose
        17*mm,  # Carton Size
        19*mm,  # Carton Quantity
        14*mm,  # Free Goods
        17*mm   # Batch No.
    ])
    
    product_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E0E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (8, -1), 'CENTER'),  # Center numeric columns
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),  # Center header text
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),  # Increased padding for wrapped headers
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),  # Add left padding
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),  # Add right padding
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    story.append(product_table)
    story.append(Spacer(1, 8*mm))  # Space after product table
    
    # Memo list table
    story.append(Paragraph("Memo List According To Packing Report", ParagraphStyle(
        'MemoTitle',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT
    )))
    story.append(Spacer(1, 3*mm))
    
    # Memo table with wrapped headers
    memo_table_data = [[
        Paragraph('Memo<br/>No', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('Date', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('PSO<br/>Code', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('Amount', ParagraphStyle('Header', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER))
    ]]
    
    for memo in sorted(memo_list, key=lambda x: x['memo_no']):
        memo_table_data.append([
            memo['memo_no'],
            memo['date'],
            memo['pso_code'],
            f"{float(memo['amount']):,.2f}"
        ])
    
    # Add total row
    memo_table_data.append([
        f"Total ({len(memo_list)})",
        "",
        "",
        f"{float(total_amount):,.2f}"
    ])
    
    # Calculate column widths to fit page (A4 width - margins = 210mm - 30mm = 180mm)
    # Memo table - fit within 190mm (A4 width - 20mm margins)
    # Total: 50+35+35+50 = 170mm (leaving 20mm buffer)
    memo_table = Table(memo_table_data, colWidths=[50*mm, 35*mm, 35*mm, 50*mm])
    memo_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E0E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (3, 1), (3, -1), 'RIGHT'),  # Right align amounts
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTSIZE', (0, 1), (-1, -2), 7),
        ('FONTSIZE', (0, -1), (-1, -1), 8),  # Total row
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),  # Total row bold
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),  # Center header text
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),  # Add left padding
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),  # Add right padding
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    story.append(memo_table)
    story.append(Spacer(1, 10*mm))
    
    # Build PDF (footer removed as requested)
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

