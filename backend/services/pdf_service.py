"""
PDF Service for generating receipts
"""
from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
import os
from datetime import datetime
from utils import get_uzbekistan_now, format_datetime_uz
try:
    from .sale_service import SaleService
    from .settings_service import SettingsService
except ImportError:
    from sale_service import SaleService
    from settings_service import SettingsService
from reportlab.platypus import Image


class PDFService:
    """Service for generating PDF receipts"""
    
    RECEIPTS_DIR = "receipts"
    
    @staticmethod
    def _ensure_receipts_dir():
        """Ensure receipts directory exists"""
        if not os.path.exists(PDFService.RECEIPTS_DIR):
            os.makedirs(PDFService.RECEIPTS_DIR)
    
    @staticmethod
    def _header_footer(canvas_obj, doc, settings=None):
        """Add header and footer to each page with modern design"""
        canvas_obj.saveState()
        
        # Get settings if not provided
        if settings is None:
            from database import SessionLocal
            db = SessionLocal()
            try:
                settings = SettingsService.get_settings(db)
            finally:
                db.close()
        
        # Modern header design - vertical layout: logo on top, store name below
        has_logo = settings and settings.logo_url and settings.receipt_show_logo
        header_height = 50*mm if has_logo else 35*mm
        
        # No colored background - clean white header
        canvas_obj.setFillColor(colors.white)
        
        # Calculate center position
        page_center_x = (doc.width + doc.leftMargin + doc.rightMargin) / 2.0
        
        # Draw logo if available and enabled (centered, on top)
        logo_y_offset = 0
        if has_logo:
            try:
                logo_path = settings.logo_url
                # Convert URL path to file system path
                if logo_path.startswith('/uploads/'):
                    backend_dir = os.path.dirname(os.path.dirname(__file__))
                    project_root = os.path.dirname(backend_dir)
                    logo_path = os.path.join(project_root, logo_path.lstrip('/'))
                elif logo_path.startswith('/'):
                    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), logo_path.lstrip('/'))
                
                logo_path = os.path.normpath(logo_path)
                
                if os.path.exists(logo_path):
                    # Draw logo centered at top of header (smaller size)
                    logo_width = 35*mm
                    logo_height = 18*mm
                    logo_x = page_center_x - (logo_width / 2)
                    logo_y = doc.height + doc.topMargin - 8*mm - logo_height
                    
                    canvas_obj.drawImage(logo_path, 
                                        logo_x, 
                                        logo_y,
                                        width=logo_width, 
                                        height=logo_height, 
                                        preserveAspectRatio=True,
                                        mask='auto')
                    logo_y_offset = logo_height + 5*mm  # Space for logo
                else:
                    print(f"Logo file not found at: {logo_path}")
            except Exception as e:
                print(f"Error loading logo: {e}")
                import traceback
                traceback.print_exc()
        
        # Draw store name centered below logo (or centered if no logo) - dark text on white
        store_name = settings.store_name.upper() if settings and settings.store_name else "SOTUV CHEKI"
        canvas_obj.setFont('Helvetica-Bold', 16)
        canvas_obj.setFillColor(colors.HexColor('#1e293b'))  # Dark text color
        
        # Position store name below logo or centered if no logo
        if has_logo:
            title_y = doc.height + doc.topMargin - header_height + 8*mm
        else:
            title_y = doc.height + doc.topMargin - header_height/2
        
        canvas_obj.drawCentredString(page_center_x, title_y, store_name)
        
        # Add store info below name (if available) in smaller font
        if settings and (settings.store_address or settings.store_phone):
            canvas_obj.setFont('Helvetica', 7)
            canvas_obj.setFillColor(colors.HexColor('#64748b'))  # Gray text color
            info_text = ""
            if settings.store_address:
                info_text = settings.store_address
            if settings.store_phone:
                if info_text:
                    info_text += " | "
                info_text += f"Tel: {settings.store_phone}"
            
            if info_text:
                info_y = title_y - 5*mm
                canvas_obj.drawCentredString(page_center_x, info_y, info_text)
        
        # Modern footer with subtle design
        canvas_obj.setFillColor(colors.HexColor('#64748b'))
        canvas_obj.setFont('Helvetica', 7)
        footer_text = f"Yaratilgan: {format_datetime_uz(get_uzbekistan_now())}"
        canvas_obj.drawCentredString(page_center_x, 10*mm, footer_text)
        
        canvas_obj.restoreState()
    
    @staticmethod
    def generate_receipt(db: Session, sale_id: int) -> str:
        """Generate PDF receipt for a sale with clean design"""
        sale = SaleService.get_sale(db, sale_id)
        if not sale:
            raise ValueError(f"Sale {sale_id} not found")
        
        # Get settings
        settings = SettingsService.get_settings(db)
        
        PDFService._ensure_receipts_dir()
        filename = f"receipt_{sale_id}_{get_uzbekistan_now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(PDFService.RECEIPTS_DIR, filename)
        
        # Adjust top margin for modern header design
        has_logo = settings and settings.logo_url and settings.receipt_show_logo
        top_margin = 60*mm if has_logo else 15*mm
        
        # Create PDF
        doc = SimpleDocTemplate(
            filepath, 
            pagesize=A4,
            rightMargin=10*mm,
            leftMargin=10*mm,
            topMargin=top_margin,
            bottomMargin=15*mm
        )
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        
        # Store info is now in header, so we skip it here to avoid duplication
        # Add spacing instead
        elements.append(Spacer(1, 2*mm))
        
        receipt_num_style = ParagraphStyle(
            'ReceiptNum',
            parent=styles['Normal'],
            fontSize=16,
            textColor=colors.HexColor("#0b0909"),
            spaceAfter=6*mm,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            leading=20
        )
        
        info_label_style = ParagraphStyle(
            'InfoLabel',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#64748b'),
            fontName='Helvetica-Bold',
            leading=12
        )
        
        info_value_style = ParagraphStyle(
            'InfoValue',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica-Bold',
            leading=12
        )
        
        # Table cell styles
        table_cell_style = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica',
            leading=11
        )
        
        table_total_style = ParagraphStyle(
            'TableTotal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica-Bold',
            leading=12
        )
        
        # Receipt number
        elements.append(Paragraph(f"Chek № {sale.id}", receipt_num_style))
        elements.append(Spacer(1, 3*mm))
        
        # Sale information
        payment_method_map = {
            'cash': 'Naqd',
            'card': 'Bank kartasi',
            'bank_transfer': 'Bank hisob raqami'
        }
        payment_method = payment_method_map.get(sale.payment_method.value, sale.payment_method.value)
        sale_date = format_datetime_uz(sale.created_at, '%d.%m.%Y, %H:%M')
        
        payment_amount = sale.payment_amount or sale.total_amount
        excess = payment_amount - sale.total_amount
        
        payment_info_rows = [
            [Paragraph('Sana:', info_label_style), Paragraph(sale_date, info_value_style)],
            [Paragraph('Mijoz:', info_label_style), Paragraph((sale.customer.name if sale.customer else "O'chirilgan mijoz") or 'Noma\'lum', info_value_style)],
            [Paragraph('Sotuvchi:', info_label_style), Paragraph(sale.seller.name or 'Noma\'lum', info_value_style)],
            [Paragraph('To\'lov usuli:', info_label_style), Paragraph(payment_method, info_value_style)],
        ]
        
        info_table = Table(payment_info_rows, colWidths=[40*mm, 130*mm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 10*mm))
        
        # Items table header style - dark text instead of white
        header_num_style = ParagraphStyle(
            'HeaderNum',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica-Bold',
            alignment=TA_CENTER
        )
        
        header_left_style = ParagraphStyle(
            'HeaderLeft',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica-Bold',
            alignment=TA_LEFT
        )
        
        header_right_style = ParagraphStyle(
            'HeaderRight',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT
        )
        
        table_data = [[
            Paragraph('№', header_num_style),
            Paragraph('Mahsulot', header_left_style),
            Paragraph('Miqdor', header_num_style),
            Paragraph('Narx', header_num_style),
            Paragraph('Jami', header_right_style)
        ]]
        
        item_num = 1
        for item in sale.items:
            quantity_text = f"{item.requested_quantity} dona"
            unit_price = item.piece_price if item.piece_price > 0 else (
                item.subtotal / item.requested_quantity if item.requested_quantity > 0 else 0
            )
            price_text = f"{unit_price:,.0f}"
            subtotal_text = f"{item.subtotal:,.0f}"
            
            product_name = item.product.name
            if len(product_name) > 40:
                product_name = product_name[:37] + "..."
            
            table_data.append([
                Paragraph(str(item_num), table_cell_style),
                Paragraph(product_name, table_cell_style),
                Paragraph(quantity_text, table_cell_style),
                Paragraph(price_text, table_cell_style),
                Paragraph(subtotal_text, table_cell_style)
            ])
            item_num += 1
        
        # Calculate row positions
        num_items = len(table_data) - 1  # Exclude header
        separator_row = num_items + 1
        
        # Add separator (empty row)
        table_data.append([
            Paragraph('', table_cell_style),
            Paragraph('', table_cell_style),
            Paragraph('', table_cell_style),
            Paragraph('', table_cell_style),
            Paragraph('', table_cell_style)
        ])
        
        # Totals
        total_amount_text = f"{sale.total_amount:,.0f} so'm"
        payment_text = f"{payment_amount:,.0f} so'm"
        
        table_data.append([
            Paragraph('', table_total_style),
            Paragraph('JAMI:', table_total_style),
            Paragraph('', table_total_style),
            Paragraph('', table_total_style),
            Paragraph(total_amount_text, table_total_style)
        ])
        table_data.append([
            Paragraph('', table_total_style),
            Paragraph('TO\'LANGAN:', table_total_style),
            Paragraph('', table_total_style),
            Paragraph('', table_total_style),
            Paragraph(payment_text, table_total_style)
        ])
        
        if excess > 0:
            excess_action = sale.excess_action or 'return'
            if excess_action == 'debt':
                table_data.append([
                    Paragraph('', table_total_style),
                    Paragraph('QAYTIM (qarzga qo\'shildi):', table_total_style),
                    Paragraph('', table_total_style),
                    Paragraph('', table_total_style),
                    Paragraph(f'{excess:,.0f} so\'m', table_total_style)
                ])
            else:
                table_data.append([
                    Paragraph('', table_total_style),
                    Paragraph('QAYTIM:', table_total_style),
                    Paragraph('', table_total_style),
                    Paragraph('', table_total_style),
                    Paragraph(f'{excess:,.0f} so\'m', table_total_style)
                ])
        elif excess < 0:
            table_data.append([
                Paragraph('', table_total_style),
                Paragraph('QARZ:', table_total_style),
                Paragraph('', table_total_style),
                Paragraph('', table_total_style),
                Paragraph(f'{abs(excess):,.0f} so\'m', table_total_style)
            ])
        
        # Show customer's total debt balance if exists
        try:
            customer_debt = None
            if sale.customer:
                customer_debt = getattr(sale.customer, 'debt_balance', None)
                # Debug: Print customer debt info
                print(f"[PDF RECEIPT] Customer ID: {sale.customer.id}, Debt Balance: {customer_debt}")
            
            if customer_debt and customer_debt > 0:
                table_data.append([
                    Paragraph('', table_total_style),
                    Paragraph('MIJOZ QARZI:', table_total_style),
                    Paragraph('', table_total_style),
                    Paragraph('', table_total_style),
                    Paragraph(f'{customer_debt:,.0f} so\'m', table_total_style)
                ])
                print(f"[PDF RECEIPT] Customer debt row added: {customer_debt:,.0f} so'm")
            else:
                print(f"[PDF RECEIPT] Customer debt not shown - customer: {sale.customer is not None}, debt: {customer_debt}")
        except Exception as e:
            print(f"[PDF RECEIPT] Error showing customer debt: {e}")
            import traceback
            traceback.print_exc()
        
        total_start_row = separator_row + 1
        
        items_table = Table(table_data, colWidths=[12*mm, 85*mm, 28*mm, 32*mm, 33*mm])
        items_table.setStyle(TableStyle([
            # Header row (0) - Simple design without colored background
            ('BACKGROUND', (0, 0), (-1, 0), colors.white),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e293b')),  # Dark text instead of white
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('ALIGN', (2, 0), (2, 0), 'CENTER'),
            ('ALIGN', (3, 0), (3, 0), 'CENTER'),
            ('ALIGN', (4, 0), (4, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
            ('BOX', (0, 0), (-1, 0), 0, colors.HexColor('#cbd5e1')),  # Light border
            
            # Data rows (1 to separator_row-1) - Paragraph objects handle their own styling
            ('ALIGN', (0, 1), (0, separator_row-1), 'CENTER'),
            ('ALIGN', (1, 1), (1, separator_row-1), 'LEFT'),
            ('ALIGN', (2, 1), (2, separator_row-1), 'CENTER'),
            ('ALIGN', (3, 1), (3, separator_row-1), 'CENTER'),
            ('ALIGN', (4, 1), (4, separator_row-1), 'RIGHT'),
            ('VALIGN', (0, 1), (-1, separator_row-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 1), (-1, separator_row-1), 8),
            ('TOPPADDING', (0, 1), (-1, separator_row-1), 8),
            ('LEFTPADDING', (0, 1), (-1, separator_row-1), 6),
            ('RIGHTPADDING', (0, 1), (-1, separator_row-1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, separator_row-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('GRID', (0, 0), (-1, separator_row-1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0, 0), (-1, separator_row-1), 1, colors.HexColor('#cbd5e1')),  # Outer border
            
            # Separator row
            ('LINEBELOW', (0, separator_row), (-1, separator_row), 1.5, colors.HexColor('#cbd5e1')),
            ('VALIGN', (0, separator_row), (-1, separator_row), 'MIDDLE'),
            
            # Total rows - Paragraph objects handle their own styling
            ('BOTTOMPADDING', (0, total_start_row), (-1, -1), 10),
            ('TOPPADDING', (0, total_start_row), (-1, -1), 10),
            ('LEFTPADDING', (0, total_start_row), (-1, -1), 8),
            ('RIGHTPADDING', (0, total_start_row), (-1, -1), 8),
            ('ALIGN', (1, total_start_row), (1, -1), 'LEFT'),
            ('ALIGN', (4, total_start_row), (4, -1), 'RIGHT'),
            ('VALIGN', (0, total_start_row), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(items_table)
        
        # Thank you message with modern design
        elements.append(Spacer(1, 18*mm))
        
        # Add decorative spacing before thank you message
        elements.append(Spacer(1, 5*mm))
        
        thank_style = ParagraphStyle(
            'ThankYou',
            parent=styles['Normal'],
            fontSize=13,
            textColor=colors.HexColor("#050506"),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            leading=18,
            spaceBefore=3*mm,
            spaceAfter=5*mm
        )
        footer_text = settings.receipt_footer_text if settings and settings.receipt_footer_text else "Xaridingiz uchun rahmat!"
        elements.append(Paragraph(footer_text, thank_style))
        
        # Build PDF with settings
        def on_first_page(canvas_obj, doc):
            PDFService._header_footer(canvas_obj, doc, settings)
        
        def on_later_pages(canvas_obj, doc):
            PDFService._header_footer(canvas_obj, doc, settings)
        
        doc.build(elements, onFirstPage=on_first_page, onLaterPages=on_later_pages)
        
        return filepath
    
    @staticmethod
    def export_statistics(stats: dict, start_date: str = None, end_date: str = None) -> str:
        """Export statistics to PDF file"""
        PDFService._ensure_receipts_dir()
        
        filename = f"statistics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(PDFService.RECEIPTS_DIR, filename)
        
        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            topMargin=25*mm,
            bottomMargin=25*mm,
            leftMargin=20*mm,
            rightMargin=20*mm
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        )
        
        period_text = ""
        if start_date and end_date:
            period_text = f" ({start_date} dan {end_date} gacha)"
        elif start_date:
            period_text = f" ({start_date} dan)"
        elif end_date:
            period_text = f" ({end_date} gacha)"
            
        elements.append(Paragraph(f"STATISTIK HISOBOT{period_text}", title_style))
        elements.append(Spacer(1, 10*mm))
        
        # General Statistics
        general_data = [
            ["Ko'rsatkich", "Qiymat"]
        ]
        
        general_data.append(["Jami sotuvlar", f"{stats.get('total_amount', 0):,.0f} so'm"])
        general_data.append(["Sotuvlar soni", f"{stats.get('total_sales', 0)} ta"])
        general_data.append(["O'rtacha sotuv", f"{stats.get('average_sale', 0):,.0f} so'm"])
        general_data.append(["Daromad", f"{stats.get('total_profit', 0):,.0f} so'm"])
        general_data.append(["Jami qarz", f"{stats.get('total_debt', 0):,.0f} so'm"])
        
        general_table = Table(general_data, colWidths=[60*mm, 60*mm])
        general_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        
        elements.append(general_table)
        elements.append(Spacer(1, 10*mm))
        
        # Payment Methods
        if 'payment_methods' in stats and stats['payment_methods']:
            elements.append(Paragraph("TO'LOV TURLARI", styles['Heading2']))
            elements.append(Spacer(1, 5*mm))
            
            payment_data = [["To'lov turi", "Soni", "Summa"]]
            for method, data in stats['payment_methods'].items():
                method_name = {
                    'cash': 'Naqd',
                    'card': 'Karta',
                    'credit': 'Nasiya',
                    'bank_transfer': 'O\'tkazma'
                }.get(method, method.upper())
                payment_data.append([method_name, f"{data['count']} ta", f"{data['amount']:,.0f} so'm"])
            
            payment_table = Table(payment_data, colWidths=[40*mm, 30*mm, 50*mm])
            payment_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.green),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
            ]))
            
            elements.append(payment_table)
            elements.append(Spacer(1, 10*mm))
        
        # Top Products
        if 'top_products' in stats and stats['top_products']:
            elements.append(Paragraph("ENG KO'P SOTILGAN MAHSULOTLAR", styles['Heading2']))
            elements.append(Spacer(1, 5*mm))
            
            products_data = [["Mahsulot", "Miqdor", "Summa"]]
            for product in stats['top_products'][:10]:  # Top 10
                products_data.append([product['name'], f"{product['quantity']}", f"{product['amount']:,.0f} so'm"])
            
            products_table = Table(products_data, colWidths=[60*mm, 30*mm, 40*mm])
            products_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.orange),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightyellow),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
            ]))
            
            elements.append(products_table)
            elements.append(Spacer(1, 10*mm))
        
        # Top Customers
        if 'top_customers' in stats and stats['top_customers']:
            elements.append(Paragraph("ENG FAOL MIJOZLAR", styles['Heading2']))
            elements.append(Spacer(1, 5*mm))
            
            customers_data = [["Mijoz", "Xaridlar", "Summa"]]
            for customer in stats['top_customers'][:10]:  # Top 10
                customers_data.append([customer['name'], f"{customer['count']}", f"{customer['amount']:,.0f} so'm"])
            
            customers_table = Table(customers_data, colWidths=[60*mm, 30*mm, 40*mm])
            customers_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.purple),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lavender),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
            ]))
            
            elements.append(customers_table)
        
        # Build PDF
        doc.build(elements)
        
        return filepath
