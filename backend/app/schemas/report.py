from pydantic import BaseModel, Field
from datetime import datetime


class ReportRequest(BaseModel):
    variant_ids: list[str] | str = Field(
        default="all",
        description="List of variant UUIDs or 'all' for entire dataset"
    )
    report_type: str = Field(
        default="clinical",
        description="Report type: 'clinical', 'research', or 'patient'"
    )
    include_sections: list[str] = Field(
        default=[
            "executive_summary",
            "methodology",
            "results_summary",
            "pathogenic_variants",
            "vus_variants",
            "pharmacogenomic",
            "full_variant_list",
        ],
        description="Sections to include in the report"
    )
    analyst_name: str | None = Field(
        default=None,
        description="Name of the analyst generating the report"
    )


class ReportGenerateResponse(BaseModel):
    report_id: str
    status: str = "generating"


class ReportStatusResponse(BaseModel):
    report_id: str
    status: str
    report_type: str | None = None
    variant_count: int | None = None
    created_at: str | None = None
    download_url: str | None = None


class ReportListItem(BaseModel):
    report_id: str
    status: str
    report_type: str
    variant_count: int
    created_at: str
