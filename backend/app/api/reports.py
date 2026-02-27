"""
Report generation API endpoints.

POST /reports/generate  — Start report generation (background task)
GET  /reports           — List recent reports
GET  /reports/{id}      — Download PDF or check status
"""
import os
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db, AsyncSessionLocal
from app.models.variant import Variant
from app.schemas.report import (
    ReportRequest,
    ReportGenerateResponse,
    ReportStatusResponse,
    ReportListItem,
)
from app.services.report_service import (
    generate_report,
    set_report_status,
    get_report_status,
    get_report_history,
    REPORTS_DIR,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=ReportGenerateResponse)
async def generate_report_endpoint(
    request: ReportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Start report generation as a background task.

    Returns a report_id that can be used to poll status and download.
    """
    report_id = str(uuid.uuid4())[:8]

    # Quick validation: check that variants exist
    if request.variant_ids == "all":
        count_result = await db.execute(
            select(func.count()).select_from(Variant)
        )
        total = count_result.scalar_one()
        if total == 0:
            raise HTTPException(
                status_code=400,
                detail="No variants in the database. Upload a VCF file first.",
            )
    else:
        # Validate that provided IDs exist
        if isinstance(request.variant_ids, list) and len(request.variant_ids) == 0:
            raise HTTPException(status_code=400, detail="variant_ids list is empty.")

    # Mark as generating
    await set_report_status(
        report_id, "generating",
        report_type=request.report_type,
    )

    # Launch background task
    async def _generate():
        async with AsyncSessionLocal() as bg_db:
            try:
                # Count variants for metadata
                if request.variant_ids == "all":
                    cr = await bg_db.execute(
                        select(func.count()).select_from(Variant)
                    )
                    vcount = cr.scalar_one()
                else:
                    vcount = len(request.variant_ids) if isinstance(request.variant_ids, list) else 0

                await generate_report(
                    report_id=report_id,
                    db=bg_db,
                    variant_ids=request.variant_ids,
                    report_type=request.report_type,
                    include_sections=request.include_sections,
                    analyst_name=request.analyst_name,
                )

                await set_report_status(
                    report_id, "complete",
                    report_type=request.report_type,
                    variant_count=vcount,
                )
                logger.info(f"Report {report_id} completed successfully")

            except Exception as e:
                logger.error(f"Report {report_id} generation failed: {e}")
                await set_report_status(
                    report_id, "failed",
                    report_type=request.report_type,
                )

    background_tasks.add_task(_generate)

    return ReportGenerateResponse(report_id=report_id, status="generating")


@router.get("", response_model=list[ReportListItem])
async def list_reports():
    """List recently generated reports."""
    history = await get_report_history()
    return [
        ReportListItem(
            report_id=r["report_id"],
            status=r["status"],
            report_type=r.get("report_type") or "clinical",
            variant_count=r.get("variant_count") or 0,
            created_at=r.get("created_at") or "",
        )
        for r in history
    ]


@router.get("/{report_id}")
async def get_report(report_id: str):
    """
    Get report status or download the PDF.

    If the report is complete, returns the PDF file.
    Otherwise returns the current status.
    """
    status = await get_report_status(report_id)

    if status is None:
        raise HTTPException(status_code=404, detail="Report not found.")

    if status["status"] == "complete":
        pdf_path = os.path.join(REPORTS_DIR, f"{report_id}.pdf")
        if os.path.exists(pdf_path):
            return FileResponse(
                pdf_path,
                media_type="application/pdf",
                filename=f"GeneMapr_Report_{report_id}.pdf",
            )
        else:
            raise HTTPException(
                status_code=404,
                detail="Report file not found on disk.",
            )

    return ReportStatusResponse(
        report_id=status["report_id"],
        status=status["status"],
        report_type=status.get("report_type"),
        variant_count=status.get("variant_count"),
        created_at=status.get("created_at"),
    )
