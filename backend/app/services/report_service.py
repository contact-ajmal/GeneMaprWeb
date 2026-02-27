"""
Clinical genomics PDF report generator using reportlab.

Produces professional reports with cover page, AI summaries,
variant tables, charts, and methodology sections.
"""
import os
import uuid
import json
import math
import logging
from datetime import datetime
from collections import Counter

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
    KeepTogether,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.variant import Variant
from app.services.ai_summary_service import call_llm
from app.core.config import settings
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

REPORTS_DIR = "/tmp/reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

# Color palette matching GeneMapr theme
DARK_BG = colors.HexColor("#0a0e1a")
PANEL_BG = colors.HexColor("#141b2d")
CYAN = colors.HexColor("#00d4ff")
MAGENTA = colors.HexColor("#ff3366")
GREEN = colors.HexColor("#00ff88")
AMBER = colors.HexColor("#ffaa00")
TEXT_PRIMARY = colors.HexColor("#1a1a2e")
TEXT_SECONDARY = colors.HexColor("#4a5568")
LIGHT_GRAY = colors.HexColor("#f7fafc")
BORDER_COLOR = colors.HexColor("#e2e8f0")
HEADER_BG = colors.HexColor("#1a1a2e")
ROW_ALT = colors.HexColor("#f0f4f8")


def _get_styles():
    """Build custom paragraph styles for the report."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=28,
        textColor=HEADER_BG,
        alignment=TA_CENTER,
        spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="CoverSubtitle",
        fontName="Helvetica",
        fontSize=14,
        textColor=TEXT_SECONDARY,
        alignment=TA_CENTER,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="CoverDetail",
        fontName="Helvetica",
        fontSize=11,
        textColor=TEXT_SECONDARY,
        alignment=TA_CENTER,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="SectionTitle",
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=HEADER_BG,
        spaceBefore=20,
        spaceAfter=10,
        borderWidth=0,
        borderPadding=0,
    ))
    styles.add(ParagraphStyle(
        name="SubsectionTitle",
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=TEXT_PRIMARY,
        spaceBefore=12,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="BodyText_Custom",
        fontName="Helvetica",
        fontSize=10,
        textColor=TEXT_PRIMARY,
        alignment=TA_JUSTIFY,
        spaceBefore=4,
        spaceAfter=4,
        leading=14,
    ))
    styles.add(ParagraphStyle(
        name="BodyText_Patient",
        fontName="Helvetica",
        fontSize=12,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=6,
        spaceAfter=6,
        leading=18,
    ))
    styles.add(ParagraphStyle(
        name="Disclaimer",
        fontName="Helvetica-Oblique",
        fontSize=8,
        textColor=TEXT_SECONDARY,
        alignment=TA_CENTER,
        spaceBefore=12,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="TableHeader",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=colors.white,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="TableCell",
        fontName="Helvetica",
        fontSize=7,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        leading=9,
    ))
    styles.add(ParagraphStyle(
        name="TableCellCenter",
        fontName="Helvetica",
        fontSize=7,
        textColor=TEXT_PRIMARY,
        alignment=TA_CENTER,
        leading=9,
    ))
    return styles


def _header_footer(canvas, doc):
    """Draw header and footer on each page (except page 1 cover)."""
    canvas.saveState()
    page_num = doc.page

    if page_num > 1:
        # Header line
        canvas.setStrokeColor(CYAN)
        canvas.setLineWidth(1.5)
        canvas.line(
            doc.leftMargin,
            doc.height + doc.topMargin + 10,
            doc.width + doc.leftMargin,
            doc.height + doc.topMargin + 10,
        )
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(TEXT_SECONDARY)
        canvas.drawString(
            doc.leftMargin,
            doc.height + doc.topMargin + 16,
            "GeneMapr Genomic Analysis Report",
        )

        # Footer
        canvas.setStrokeColor(BORDER_COLOR)
        canvas.setLineWidth(0.5)
        canvas.line(
            doc.leftMargin,
            doc.bottomMargin - 15,
            doc.width + doc.leftMargin,
            doc.bottomMargin - 15,
        )
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(TEXT_SECONDARY)
        canvas.drawString(
            doc.leftMargin,
            doc.bottomMargin - 28,
            "For research use only. Not a diagnostic report.",
        )
        canvas.drawRightString(
            doc.width + doc.leftMargin,
            doc.bottomMargin - 28,
            f"Page {page_num}",
        )

    canvas.restoreState()


def _build_section_divider(color=CYAN):
    """Return a colored horizontal rule."""
    return HRFlowable(
        width="100%",
        thickness=2,
        color=color,
        spaceBefore=4,
        spaceAfter=10,
    )


def _clinvar_color(sig: str | None) -> colors.Color:
    """Return a color for ClinVar significance."""
    if not sig:
        return TEXT_SECONDARY
    sig_lower = sig.lower()
    if "pathogenic" in sig_lower and "likely" not in sig_lower:
        return MAGENTA
    if "likely pathogenic" in sig_lower:
        return AMBER
    if "uncertain" in sig_lower:
        return colors.HexColor("#6b7280")
    if "benign" in sig_lower:
        return GREEN
    return TEXT_SECONDARY


def _risk_label(score: int | None) -> str:
    if score is None:
        return "N/A"
    if score >= 8:
        return f"{score} (High)"
    if score >= 4:
        return f"{score} (Moderate)"
    return f"{score} (Low)"


def _truncate(text: str | None, max_len: int = 40) -> str:
    if not text:
        return "—"
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


# ── Cover Page ────────────────────────────────────────────────────────────


def _build_cover_page(
    styles,
    report_type: str,
    analyst_name: str | None,
    filename: str | None,
    variant_count: int,
    report_id: str,
):
    """Build the cover page flowables."""
    elements = []
    elements.append(Spacer(1, 1.8 * inch))

    # Logo placeholder
    elements.append(Paragraph("G E N E M A P R", styles["CoverTitle"]))
    elements.append(Spacer(1, 0.15 * inch))

    # Colored accent bar
    d = Drawing(400, 4)
    d.add(Rect(0, 0, 400, 4, fillColor=CYAN, strokeColor=None))
    elements.append(d)
    elements.append(Spacer(1, 0.3 * inch))

    type_labels = {
        "clinical": "Clinical Genomic Variant Analysis Report",
        "research": "Research Genomic Variant Analysis Report",
        "patient": "Patient Genomic Analysis Summary",
    }
    elements.append(Paragraph(
        type_labels.get(report_type, "Genomic Variant Analysis Report"),
        styles["CoverSubtitle"],
    ))
    elements.append(Spacer(1, 0.5 * inch))

    elements.append(Paragraph(
        f"Date Generated: {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}",
        styles["CoverDetail"],
    ))
    elements.append(Paragraph(
        f"Variants Analyzed: {variant_count:,}",
        styles["CoverDetail"],
    ))
    if filename:
        elements.append(Paragraph(f"Source: {filename}", styles["CoverDetail"]))
    if analyst_name:
        elements.append(Paragraph(f"Analyst: {analyst_name}", styles["CoverDetail"]))
    elements.append(Paragraph(f"Report ID: {report_id}", styles["CoverDetail"]))

    elements.append(Spacer(1, 1.5 * inch))

    # Confidentiality notice
    elements.append(Paragraph(
        "CONFIDENTIAL — This report contains sensitive genomic information. "
        "Distribution should be limited to authorized personnel only.",
        styles["Disclaimer"],
    ))

    elements.append(PageBreak())
    return elements


# ── Executive Summary ─────────────────────────────────────────────────────


async def _build_executive_summary(
    styles,
    variants: list[Variant],
    report_type: str,
) -> list:
    """Build executive summary section with AI-generated overview."""
    elements = []
    elements.append(Paragraph("1. Executive Summary", styles["SectionTitle"]))
    elements.append(_build_section_divider())

    # Compute quick stats for the prompt
    total = len(variants)
    pathogenic = [v for v in variants if v.clinvar_significance and "pathogenic" in v.clinvar_significance.lower() and "benign" not in v.clinvar_significance.lower()]
    likely_path = [v for v in variants if v.clinvar_significance and "likely pathogenic" in v.clinvar_significance.lower()]
    vus = [v for v in variants if v.clinvar_significance and "uncertain" in v.clinvar_significance.lower()]
    high_risk = [v for v in variants if v.risk_score is not None and v.risk_score >= 8]

    top_findings = []
    for v in sorted(pathogenic + likely_path, key=lambda x: x.risk_score or 0, reverse=True)[:5]:
        top_findings.append(
            f"{v.gene_symbol or 'Unknown'} {v.chrom}:{v.pos} {v.ref}>{v.alt} "
            f"(ClinVar: {v.clinvar_significance}, Risk: {v.risk_score})"
        )

    style_instruction = {
        "clinical": "Write in formal clinical genetics report style for healthcare professionals.",
        "research": "Write in detailed scientific style suitable for a research publication.",
        "patient": "Write in plain, reassuring language that a patient with no genetics background can understand. Avoid jargon.",
    }

    prompt = (
        f"Summarize the following genomic analysis results for a {report_type} report. "
        f"Include: number of variants analyzed, key pathogenic findings, actionable results, "
        f"and recommended follow-up.\n\n"
        f"Dataset: {total} total variants, {len(pathogenic)} pathogenic, "
        f"{len(likely_path)} likely pathogenic, {len(vus)} VUS, "
        f"{len(high_risk)} high-risk (score >= 8).\n\n"
        f"Top findings:\n" + "\n".join(top_findings[:5]) + "\n\n"
        f"{style_instruction.get(report_type, style_instruction['clinical'])}\n"
        f"Write 2-3 paragraphs."
    )

    body_style = "BodyText_Patient" if report_type == "patient" else "BodyText_Custom"

    # Try LLM, fall back to template
    summary = None
    if settings.llm_api_key and settings.llm_api_key != "stub":
        summary = await call_llm(prompt)

    if summary:
        for para in summary.split("\n\n"):
            para = para.strip()
            if para:
                elements.append(Paragraph(para, styles[body_style]))
    else:
        # Template fallback
        elements.append(Paragraph(
            f"This report presents the analysis of <b>{total:,}</b> genomic variants. "
            f"Among these, <b>{len(pathogenic)}</b> were classified as pathogenic, "
            f"<b>{len(likely_path)}</b> as likely pathogenic, and <b>{len(vus)}</b> "
            f"as variants of uncertain significance (VUS). A total of "
            f"<b>{len(high_risk)}</b> variants were flagged as high-risk "
            f"(risk score ≥ 8 out of 16).",
            styles[body_style],
        ))
        if pathogenic:
            genes = ", ".join(set(v.gene_symbol for v in pathogenic if v.gene_symbol)[:5])
            elements.append(Paragraph(
                f"Key pathogenic findings involve the following gene(s): <b>{genes or 'Unknown'}</b>. "
                f"These variants warrant clinical review and may inform diagnostic or "
                f"therapeutic decisions. Genetic counseling is recommended for confirmed "
                f"pathogenic variants.",
                styles[body_style],
            ))
        elements.append(Paragraph(
            "This summary is auto-generated. All findings should be interpreted "
            "in the context of the patient's clinical presentation and family history.",
            styles[body_style],
        ))

    return elements


# ── Methodology ───────────────────────────────────────────────────────────


def _build_methodology(styles, report_type: str) -> list:
    """Build methodology section."""
    elements = []
    elements.append(Paragraph("2. Methodology", styles["SectionTitle"]))
    elements.append(_build_section_divider())

    body = "BodyText_Patient" if report_type == "patient" else "BodyText_Custom"

    elements.append(Paragraph("<b>Variant Source</b>", styles["SubsectionTitle"]))
    elements.append(Paragraph(
        "Genomic variants were extracted from a Variant Call Format (VCF) file "
        "using the pysam library. Variants were normalized and deduplicated "
        "before annotation.",
        styles[body],
    ))

    elements.append(Paragraph("<b>Annotation Sources</b>", styles["SubsectionTitle"]))

    anno_data = [
        ["Source", "Description", "Data Accessed"],
        ["Ensembl REST API", "Gene symbol, transcript, consequence, protein change", "Real-time query"],
        ["NCBI ClinVar", "Clinical significance, review status, associated conditions", "Real-time query via E-utilities"],
        ["gnomAD", "Population allele frequency (AF, AC, AN)", "Real-time query"],
    ]
    anno_table = Table(anno_data, colWidths=[1.5 * inch, 3.2 * inch, 1.5 * inch])
    anno_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(anno_table)
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("<b>Risk Scoring</b>", styles["SubsectionTitle"]))
    elements.append(Paragraph(
        "Each variant receives a composite risk score (0–16) based on: "
        "ClinVar pathogenicity classification (up to +5), population rarity "
        "in gnomAD (up to +3), and predicted functional consequence severity "
        "(up to +4 for loss-of-function, +2 for missense). Higher scores "
        "indicate greater clinical concern.",
        styles[body],
    ))

    elements.append(Paragraph("<b>Limitations</b>", styles["SubsectionTitle"]))
    elements.append(Paragraph(
        "This analysis is dependent on the quality and completeness of the input VCF "
        "data and the current state of public annotation databases. Variants not "
        "represented in ClinVar or gnomAD may lack classification or frequency data. "
        "Novel variants or those in poorly characterized genes may have limited "
        "interpretation. This report is intended for research use and should not be "
        "used as the sole basis for clinical decisions without additional validation.",
        styles[body],
    ))

    return elements


# ── Results Summary ───────────────────────────────────────────────────────


def _build_results_summary(styles, variants: list[Variant], report_type: str) -> list:
    """Build results summary with statistics table and charts."""
    elements = []
    elements.append(Paragraph("3. Results Summary", styles["SectionTitle"]))
    elements.append(_build_section_divider())

    body = "BodyText_Patient" if report_type == "patient" else "BodyText_Custom"

    # Classification counts
    sig_counter = Counter()
    consequence_counter = Counter()
    risk_buckets = {"0–2": 0, "3–5": 0, "6–8": 0, "9+": 0}

    for v in variants:
        sig = v.clinvar_significance or "Not available"
        sig_counter[sig] += 1

        cons = v.consequence or "Unknown"
        consequence_counter[cons] += 1

        rs = v.risk_score
        if rs is not None:
            if rs <= 2:
                risk_buckets["0–2"] += 1
            elif rs <= 5:
                risk_buckets["3–5"] += 1
            elif rs <= 8:
                risk_buckets["6–8"] += 1
            else:
                risk_buckets["9+"] += 1

    # Statistics table
    elements.append(Paragraph("<b>Variant Statistics</b>", styles["SubsectionTitle"]))

    stat_rows = [["Category", "Count", "Percentage"]]
    total = len(variants)
    for sig_name, count in sig_counter.most_common(10):
        pct = f"{count / total * 100:.1f}%" if total > 0 else "0%"
        stat_rows.append([_truncate(sig_name, 50), str(count), pct])

    stat_table = Table(stat_rows, colWidths=[3.2 * inch, 1.2 * inch, 1.2 * inch])
    stat_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(stat_table)
    elements.append(Spacer(1, 14))

    # ── Pie Chart: ClinVar Distribution ──
    top_sigs = sig_counter.most_common(6)
    if top_sigs:
        elements.append(Paragraph(
            "<b>ClinVar Classification Distribution</b>",
            styles["SubsectionTitle"],
        ))

        pie_drawing = Drawing(360, 200)
        pie = Pie()
        pie.x = 80
        pie.y = 10
        pie.width = 160
        pie.height = 160
        pie.data = [c for _, c in top_sigs]
        pie.labels = [_truncate(n, 20) for n, _ in top_sigs]

        chart_colors = [
            colors.HexColor("#ff3366"),
            colors.HexColor("#ffaa00"),
            colors.HexColor("#6b7280"),
            colors.HexColor("#00ff88"),
            colors.HexColor("#00d4ff"),
            colors.HexColor("#a78bfa"),
        ]
        for i in range(len(top_sigs)):
            pie.slices[i].fillColor = chart_colors[i % len(chart_colors)]
            pie.slices[i].strokeColor = colors.white
            pie.slices[i].strokeWidth = 1

        pie.sideLabels = True
        pie.slices.fontName = "Helvetica"
        pie.slices.fontSize = 7
        pie_drawing.add(pie)
        elements.append(pie_drawing)
        elements.append(Spacer(1, 14))

    # ── Bar Chart: Risk Score Distribution ──
    risk_vals = [risk_buckets[k] for k in ["0–2", "3–5", "6–8", "9+"]]
    if any(v > 0 for v in risk_vals):
        elements.append(Paragraph(
            "<b>Risk Score Distribution</b>",
            styles["SubsectionTitle"],
        ))

        bar_drawing = Drawing(400, 180)
        bc = VerticalBarChart()
        bc.x = 60
        bc.y = 30
        bc.width = 280
        bc.height = 120
        bc.data = [risk_vals]
        bc.categoryAxis.categoryNames = ["0–2", "3–5", "6–8", "9+"]
        bc.categoryAxis.labels.fontName = "Helvetica"
        bc.categoryAxis.labels.fontSize = 8
        bc.valueAxis.valueMin = 0
        bc.valueAxis.valueMax = max(risk_vals) * 1.2 if max(risk_vals) > 0 else 10
        bc.valueAxis.valueStep = max(1, int(math.ceil(max(risk_vals) / 5))) if max(risk_vals) > 0 else 2
        bc.valueAxis.labels.fontName = "Helvetica"
        bc.valueAxis.labels.fontSize = 8
        bc.bars[0].fillColor = CYAN
        bc.bars[0].strokeColor = None
        bc.barWidth = 36

        bar_drawing.add(bc)
        elements.append(bar_drawing)
        elements.append(Spacer(1, 10))

    # Consequence breakdown
    if consequence_counter and report_type != "patient":
        elements.append(Paragraph(
            "<b>Consequence Types</b>",
            styles["SubsectionTitle"],
        ))
        cons_rows = [["Consequence", "Count"]]
        for cname, ccount in consequence_counter.most_common(10):
            cons_rows.append([cname, str(ccount)])
        cons_table = Table(cons_rows, colWidths=[4 * inch, 1.2 * inch])
        cons_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(cons_table)

    return elements


# ── Variant Detail Tables ─────────────────────────────────────────────────


def _build_variant_table(
    styles,
    title: str,
    section_num: str,
    variants: list[Variant],
    report_type: str,
    include_ai: bool = True,
    note: str | None = None,
) -> list:
    """Build a detailed variant table section."""
    elements = []
    elements.append(Paragraph(f"{section_num}. {title}", styles["SectionTitle"]))
    elements.append(_build_section_divider())

    body = "BodyText_Patient" if report_type == "patient" else "BodyText_Custom"

    if not variants:
        elements.append(Paragraph(
            f"No {title.lower()} were identified in this dataset.",
            styles[body],
        ))
        return elements

    elements.append(Paragraph(
        f"<b>{len(variants)}</b> variant(s) identified.",
        styles[body],
    ))

    if note:
        elements.append(Paragraph(f"<i>{note}</i>", styles[body]))
    elements.append(Spacer(1, 6))

    # Table header
    header = ["Gene", "Variant", "Consequence", "ClinVar", "AF", "Risk", "Condition"]
    col_widths = [0.7 * inch, 1.1 * inch, 1.0 * inch, 0.9 * inch, 0.6 * inch, 0.5 * inch, 1.4 * inch]

    rows = [header]
    for v in variants[:100]:  # Cap at 100 rows per section
        variant_str = f"{v.chrom}:{v.pos} {v.ref}>{v.alt}"
        af_str = f"{v.gnomad_af:.4f}" if v.gnomad_af is not None else "—"
        rows.append([
            v.gene_symbol or "—",
            _truncate(variant_str, 22),
            _truncate(v.consequence, 18),
            _truncate(v.clinvar_significance, 16),
            af_str,
            _risk_label(v.risk_score) if report_type != "patient" else ("High" if (v.risk_score or 0) >= 8 else "Moderate" if (v.risk_score or 0) >= 4 else "Low"),
            _truncate(v.clinvar_condition, 28),
        ])

    table = Table(rows, colWidths=col_widths, repeatRows=1)

    table_style_commands = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("ALIGN", (4, 0), (5, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]

    # Color-code rows by ClinVar significance
    for i, v in enumerate(variants[:100], start=1):
        sig = v.clinvar_significance
        if sig:
            sig_lower = sig.lower()
            if "pathogenic" in sig_lower and "likely" not in sig_lower and "benign" not in sig_lower:
                table_style_commands.append(("TEXTCOLOR", (3, i), (3, i), MAGENTA))
            elif "likely pathogenic" in sig_lower:
                table_style_commands.append(("TEXTCOLOR", (3, i), (3, i), AMBER))
            elif "benign" in sig_lower:
                table_style_commands.append(("TEXTCOLOR", (3, i), (3, i), GREEN))

    table.setStyle(TableStyle(table_style_commands))
    elements.append(table)

    # AI interpretation per variant (top 10 only)
    if include_ai and report_type != "patient":
        top_variants = sorted(variants, key=lambda x: x.risk_score or 0, reverse=True)[:10]
        ai_variants = [v for v in top_variants if v.ai_summary]
        if ai_variants:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph(
                "<b>AI-Generated Interpretations (Top Variants)</b>",
                styles["SubsectionTitle"],
            ))
            for v in ai_variants:
                gene = v.gene_symbol or "Unknown"
                var_str = f"{v.chrom}:{v.pos}"
                # Strip markdown bold markers for PDF
                clean_summary = (v.ai_summary or "").replace("**", "").replace("*", "")
                elements.append(Paragraph(
                    f"<b>{gene} ({var_str})</b>: {_truncate(clean_summary, 500)}",
                    styles["BodyText_Custom"],
                ))

    return elements


# ── Pharmacogenomic Findings ──────────────────────────────────────────────


def _build_pharmacogenomic(
    styles, variants: list[Variant], report_type: str
) -> list:
    """Build pharmacogenomic findings section."""
    elements = []
    elements.append(Paragraph("6. Pharmacogenomic Findings", styles["SectionTitle"]))
    elements.append(_build_section_divider())

    body = "BodyText_Patient" if report_type == "patient" else "BodyText_Custom"

    # Known pharmacogenes (simplified list)
    pgx_genes = {
        "CYP2D6", "CYP2C19", "CYP2C9", "CYP3A5", "CYP1A2",
        "DPYD", "TPMT", "UGT1A1", "VKORC1", "SLCO1B1",
        "ABCB1", "CYP2B6", "NAT2", "G6PD", "IFNL3",
    }

    pgx_variants = [v for v in variants if v.gene_symbol and v.gene_symbol.upper() in pgx_genes]

    if not pgx_variants:
        elements.append(Paragraph(
            "No variants in established pharmacogenes were identified in this dataset. "
            "This does not exclude the possibility of pharmacogenomic interactions "
            "with variants in other genes.",
            styles[body],
        ))
        return elements

    elements.append(Paragraph(
        f"<b>{len(pgx_variants)}</b> variant(s) were identified in pharmacogenomically "
        f"relevant genes.",
        styles[body],
    ))

    header = ["Gene", "Variant", "Consequence", "ClinVar", "Potential Implication"]
    col_widths = [0.8 * inch, 1.2 * inch, 1.0 * inch, 1.0 * inch, 2.2 * inch]
    rows = [header]

    for v in pgx_variants[:20]:
        variant_str = f"{v.chrom}:{v.pos} {v.ref}>{v.alt}"
        implication = "May affect drug metabolism" if v.consequence and "missense" in v.consequence.lower() else "Review recommended"
        rows.append([
            v.gene_symbol or "—",
            _truncate(variant_str, 22),
            _truncate(v.consequence, 18),
            _truncate(v.clinvar_significance, 16),
            implication,
        ])

    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)

    return elements


# ── Full Variant List (Compact) ───────────────────────────────────────────


def _build_full_variant_list(
    styles, variants: list[Variant], report_type: str
) -> list:
    """Build compact full variant list."""
    elements = []
    elements.append(Paragraph("7. Full Variant List", styles["SectionTitle"]))
    elements.append(_build_section_divider())

    body = "BodyText_Patient" if report_type == "patient" else "BodyText_Custom"
    elements.append(Paragraph(
        f"Complete listing of all <b>{len(variants):,}</b> variant(s) analyzed.",
        styles[body],
    ))
    elements.append(Spacer(1, 6))

    header = ["#", "Chr", "Pos", "Ref", "Alt", "Gene", "ClinVar", "Risk"]
    col_widths = [0.35 * inch, 0.45 * inch, 0.8 * inch, 0.5 * inch, 0.5 * inch, 0.7 * inch, 1.4 * inch, 0.5 * inch]

    # Process in chunks of 100 for large datasets
    chunk_size = 100
    for chunk_start in range(0, len(variants), chunk_size):
        chunk = variants[chunk_start : chunk_start + chunk_size]
        rows = [header]
        for idx, v in enumerate(chunk, start=chunk_start + 1):
            rows.append([
                str(idx),
                v.chrom,
                str(v.pos),
                _truncate(v.ref, 8),
                _truncate(v.alt, 8),
                v.gene_symbol or "—",
                _truncate(v.clinvar_significance, 22),
                str(v.risk_score) if v.risk_score is not None else "—",
            ])

        table = Table(rows, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 6),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ALIGN", (5, 0), (6, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(table)

        if chunk_start + chunk_size < len(variants):
            elements.append(Spacer(1, 6))

    return elements


# ── Main Generation Entry Point ───────────────────────────────────────────


async def generate_report(
    report_id: str,
    db: AsyncSession,
    variant_ids: list[str] | str = "all",
    report_type: str = "clinical",
    include_sections: list[str] | None = None,
    analyst_name: str | None = None,
) -> str:
    """
    Generate a PDF clinical report and save to disk.

    Returns the file path of the generated PDF.
    """
    if include_sections is None:
        include_sections = [
            "executive_summary", "methodology", "results_summary",
            "pathogenic_variants", "vus_variants", "pharmacogenomic",
            "full_variant_list",
        ]

    styles = _get_styles()

    # Fetch variants
    if variant_ids == "all":
        result = await db.execute(
            select(Variant).order_by(Variant.risk_score.desc().nullslast())
        )
        variants = list(result.scalars().all())
    else:
        from uuid import UUID as PyUUID
        uuids = [PyUUID(vid) for vid in variant_ids]
        result = await db.execute(
            select(Variant)
            .where(Variant.id.in_(uuids))
            .order_by(Variant.risk_score.desc().nullslast())
        )
        variants = list(result.scalars().all())

    if not variants:
        raise ValueError("No variants found for report generation.")

    # Determine upload filename (best guess from first variant's upload_id)
    filename = variants[0].upload_id if variants else None

    # Build PDF
    pdf_path = os.path.join(REPORTS_DIR, f"{report_id}.pdf")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        title=f"GeneMapr Report — {report_id}",
        author="GeneMapr",
    )

    elements = []

    # Cover page
    elements.extend(_build_cover_page(
        styles, report_type, analyst_name, filename, len(variants), report_id,
    ))

    # Executive Summary
    if "executive_summary" in include_sections:
        elements.extend(await _build_executive_summary(styles, variants, report_type))
        elements.append(PageBreak())

    # Methodology
    if "methodology" in include_sections:
        elements.extend(_build_methodology(styles, report_type))
        elements.append(PageBreak())

    # Results Summary
    if "results_summary" in include_sections:
        elements.extend(_build_results_summary(styles, variants, report_type))
        elements.append(PageBreak())

    # Pathogenic & Likely Pathogenic Variants
    if "pathogenic_variants" in include_sections:
        pathogenic = [
            v for v in variants
            if v.clinvar_significance
            and "pathogenic" in v.clinvar_significance.lower()
            and "benign" not in v.clinvar_significance.lower()
        ]
        elements.extend(_build_variant_table(
            styles,
            "Pathogenic & Likely Pathogenic Variants",
            "4",
            sorted(pathogenic, key=lambda x: x.risk_score or 0, reverse=True),
            report_type,
            include_ai=True,
        ))
        elements.append(PageBreak())

    # VUS
    if "vus_variants" in include_sections:
        vus = [
            v for v in variants
            if v.clinvar_significance
            and "uncertain" in v.clinvar_significance.lower()
        ]
        elements.extend(_build_variant_table(
            styles,
            "Variants of Uncertain Significance",
            "5",
            sorted(vus, key=lambda x: x.risk_score or 0, reverse=True),
            report_type,
            include_ai=False,
            note="These variants may warrant further investigation based on evolving evidence.",
        ))
        elements.append(PageBreak())

    # Pharmacogenomic
    if "pharmacogenomic" in include_sections:
        elements.extend(_build_pharmacogenomic(styles, variants, report_type))
        elements.append(PageBreak())

    # Full Variant List
    if "full_variant_list" in include_sections:
        elements.extend(_build_full_variant_list(styles, variants, report_type))

    # Build the PDF
    doc.build(elements, onFirstPage=_header_footer, onLaterPages=_header_footer)

    logger.info(f"Report {report_id} generated at {pdf_path} ({len(variants)} variants)")
    return pdf_path


async def set_report_status(
    report_id: str,
    status: str,
    report_type: str | None = None,
    variant_count: int | None = None,
):
    """Store report status and metadata in Redis."""
    redis = await get_redis()
    if redis is None:
        logger.warning("Redis unavailable, cannot store report status")
        return

    key = f"report:{report_id}"

    # Check if this is a new report (not yet in Redis)
    is_new = not await redis.exists(key)

    data = {
        "status": status,
        "created_at": datetime.utcnow().isoformat(),
    }
    if report_type:
        data["report_type"] = report_type
    if variant_count is not None:
        data["variant_count"] = str(variant_count)

    await redis.hset(key, mapping=data)
    await redis.expire(key, 86400)  # 24hr TTL

    # Only add to history list for new reports
    if is_new:
        await redis.lpush("report:history", report_id)
        await redis.ltrim("report:history", 0, 49)  # Keep last 50
        await redis.expire("report:history", 86400)


async def get_report_status(report_id: str) -> dict | None:
    """Get report status from Redis."""
    redis = await get_redis()
    if redis is None:
        return None

    key = f"report:{report_id}"
    data = await redis.hgetall(key)
    if not data:
        return None

    return {
        "report_id": report_id,
        "status": data.get("status", "unknown"),
        "report_type": data.get("report_type"),
        "variant_count": int(data["variant_count"]) if data.get("variant_count") else None,
        "created_at": data.get("created_at"),
    }


async def get_report_history() -> list[dict]:
    """Get list of recent reports from Redis."""
    redis = await get_redis()
    if redis is None:
        return []

    report_ids = await redis.lrange("report:history", 0, 49)
    reports = []
    for rid in report_ids:
        rid_str = rid if isinstance(rid, str) else rid.decode("utf-8")
        status = await get_report_status(rid_str)
        if status:
            reports.append(status)

    return reports
