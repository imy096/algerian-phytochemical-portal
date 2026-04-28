from fastapi import APIRouter, HTTPException
from typing import Dict, List, Tuple, Any
import csv
import io
import os
from pathlib import Path

from backend.database import get_db
from supabase import create_client
import openpyxl

router = APIRouter()


TEMPLATE_SPECS = {
    "publication_submission_template": {
        "required": ["doi", "title"],
        "optional": ["pubmed_id", "authors", "journal", "year", "url", "notes"],
    },
    "plant_evidence_submission_template": {
        "required": ["plant_name", "attribute_type", "evidence_text"],
        "optional": [
            "doi",
            "pubmed_id",
            "reference_title",
            "family",
            "genus",
            "species",
            "plant_part",
            "extraction_method",
            "therapeutic_concept",
            "notes",
        ],
    },
    "compound_submission_template": {
        "required": ["plant_name", "compound_name"],
        "optional": [
            "doi",
            "pubmed_id",
            "reference_title",
            "compound_class",
            "pubchem_cid",
            "chembl_id",
            "kegg_id",
            "smiles",
            "inchikey",
            "notes",
        ],
    },
    "missing_entities_template": {
        "required": ["entity_type", "entity_name", "issue_type"],
        "optional": [
            "plant_name",
            "compound_name",
            "doi",
            "pubmed_id",
            "reference_title",
            "suggested_correction",
            "notes",
        ],
    },
}


def get_storage_client():
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SERVICE_KEY")
    )

    if not supabase_url or not service_role_key:
        raise RuntimeError("Missing Supabase storage credentials.")

    return create_client(supabase_url, service_role_key)


def normalize_columns(columns: List[str]) -> List[str]:
    return [str(c).strip().lower() for c in columns if c is not None and str(c).strip() != ""]


def normalize_cell_value(value: Any) -> Any:
    if value is None:
        return ""
    return value


def detect_template_type(columns: List[str]) -> str | None:
    normalized = set(normalize_columns(columns))

    best_match = None
    best_score = -1

    for template_name, spec in TEMPLATE_SPECS.items():
        required = set(spec["required"])
        score = len(required.intersection(normalized))
        if score > best_score:
            best_score = score
            best_match = template_name

    if best_score <= 0:
        return None

    return best_match


def validate_rows(
    template_type: str,
    rows: List[Dict[str, Any]],
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    spec = TEMPLATE_SPECS[template_type]
    required = [c.lower() for c in spec["required"]]
    optional = [c.lower() for c in spec["optional"]]

    if not rows:
        return {
            "validation_status": "invalid",
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_rows": 0,
            "missing_required_columns": required,
            "extra_columns": [],
            "row_level_errors": [{"row": None, "errors": ["File contains no data rows."]}],
            "summary": {"message": "No rows found in file."},
        }, []

    columns = normalize_columns(list(rows[0].keys()))
    missing_required = [c for c in required if c not in columns]
    extra_columns = [c for c in columns if c not in required + optional]

    parsed_rows = []
    valid_rows = 0
    invalid_rows = 0
    row_level_errors = []

    for idx, row in enumerate(rows, start=2):
        normalized_row = {str(k).strip().lower(): normalize_cell_value(v) for k, v in row.items()}
        errors = []

        for col in required:
            value = normalized_row.get(col)
            if value is None or str(value).strip() == "":
                errors.append(f"Missing required value for '{col}'")

        is_valid = len(errors) == 0 and len(missing_required) == 0

        if is_valid:
            valid_rows += 1
        else:
            invalid_rows += 1
            row_level_errors.append({"row": idx, "errors": errors})

        parsed_rows.append({
            "row_number": idx,
            "raw_row": row,
            "normalized_row": normalized_row,
            "is_valid": is_valid,
            "validation_errors": errors,
        })

    validation_status = "valid"
    if missing_required or invalid_rows > 0:
        validation_status = "partially_valid" if valid_rows > 0 else "invalid"

    report = {
        "validation_status": validation_status,
        "total_rows": len(rows),
        "valid_rows": valid_rows,
        "invalid_rows": invalid_rows,
        "missing_required_columns": missing_required,
        "extra_columns": extra_columns,
        "row_level_errors": row_level_errors[:100],
        "summary": {
            "required_columns": required,
            "optional_columns": optional,
            "detected_columns": columns,
        },
    }

    return report, parsed_rows


def parse_csv_bytes(file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    text = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    columns = reader.fieldnames or []
    return columns, rows


def parse_excel_bytes(file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    workbook = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    sheet = workbook.active

    all_rows = list(sheet.iter_rows(values_only=True))
    if not all_rows:
        return [], []

    header_row = all_rows[0]
    columns = [str(cell).strip() if cell is not None else "" for cell in header_row]

    cleaned_columns = []
    for i, col in enumerate(columns):
        if col == "":
            cleaned_columns.append(f"unnamed_column_{i+1}")
        else:
            cleaned_columns.append(col)

    data_rows: List[Dict[str, Any]] = []

    for row in all_rows[1:]:
        if row is None:
            continue

        values = list(row)
        if all(v is None or str(v).strip() == "" for v in values):
            continue

        row_dict = {}
        for idx, column_name in enumerate(cleaned_columns):
            value = values[idx] if idx < len(values) else None
            row_dict[column_name] = normalize_cell_value(value)

        data_rows.append(row_dict)

    return cleaned_columns, data_rows


def parse_file_bytes(file_name: str, mime_type: str, file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]], str]:
    lower_name = file_name.lower()
    lower_mime = (mime_type or "").lower()

    if lower_name.endswith(".csv") or lower_mime == "text/csv":
        columns, rows = parse_csv_bytes(file_bytes)
        return columns, rows, "csv"

    if (
        lower_name.endswith(".xlsx")
        or lower_name.endswith(".xlsm")
        or "spreadsheetml" in lower_mime
        or "excel" in lower_mime
    ):
        columns, rows = parse_excel_bytes(file_bytes)
        return columns, rows, "excel"

    return [], [], "unsupported"


@router.post("/validate/{submission_id}")
async def validate_submission_files(submission_id: str):
    try:
        db = get_db()
        storage = get_storage_client()

        submission_result = (
            db.table("collaboration_submissions")
            .select("*")
            .eq("submission_id", submission_id)
            .limit(1)
            .execute()
        )

        if not submission_result.data:
            raise HTTPException(status_code=404, detail="Submission not found.")

        files_result = (
            db.table("submission_files")
            .select("*")
            .eq("submission_id", submission_id)
            .order("uploaded_at", desc=False)
            .execute()
        )

        files = files_result.data or []
        if not files:
            raise HTTPException(status_code=400, detail="No files linked to this submission.")

        created_reports = []

        for file_row in files:
            file_name = file_row["original_filename"]
            mime_type = file_row.get("mime_type") or ""

            downloaded = storage.storage.from_("collaboration-uploads").download(
                file_row["storage_path"]
            )

            file_bytes = downloaded
            if isinstance(downloaded, tuple):
                file_bytes = downloaded[1]

            columns, rows, detected_format = parse_file_bytes(file_name, mime_type, file_bytes)

            if detected_format == "unsupported":
                report_insert = db.table("submission_validation_reports").insert({
                    "submission_id": submission_id,
                    "file_id": file_row["file_id"],
                    "template_type": None,
                    "file_name": file_name,
                    "validation_status": "skipped",
                    "summary": {
                        "message": "Only CSV and XLSX validation are supported in this version."
                    },
                }).execute()

                if report_insert.data:
                    created_reports.append(report_insert.data[0])
                continue

            template_type = detect_template_type(columns)

            if not template_type:
                report = {
                    "validation_status": "invalid",
                    "total_rows": len(rows),
                    "valid_rows": 0,
                    "invalid_rows": len(rows),
                    "missing_required_columns": [],
                    "extra_columns": normalize_columns(columns),
                    "row_level_errors": [{"row": None, "errors": ["Could not detect template type."]}],
                    "summary": {
                        "detected_columns": normalize_columns(columns),
                        "detected_format": detected_format,
                    },
                }
                parsed_rows = []
            else:
                report, parsed_rows = validate_rows(template_type, rows)
                report["summary"]["detected_format"] = detected_format

            existing_reports = (
                db.table("submission_validation_reports")
                .select("report_id")
                .eq("submission_id", submission_id)
                .eq("file_id", file_row["file_id"])
                .execute()
            )

            for existing in existing_reports.data or []:
                db.table("submission_parsed_rows").delete().eq("report_id", existing["report_id"]).execute()

            db.table("submission_validation_reports").delete() \
                .eq("submission_id", submission_id) \
                .eq("file_id", file_row["file_id"]) \
                .execute()

            report_insert = db.table("submission_validation_reports").insert({
                "submission_id": submission_id,
                "file_id": file_row["file_id"],
                "template_type": template_type,
                "file_name": file_name,
                "validation_status": report["validation_status"],
                "total_rows": report["total_rows"],
                "valid_rows": report["valid_rows"],
                "invalid_rows": report["invalid_rows"],
                "missing_required_columns": report["missing_required_columns"],
                "extra_columns": report["extra_columns"],
                "row_level_errors": report["row_level_errors"],
                "summary": report["summary"],
            }).execute()

            if not report_insert.data:
                continue

            created_report = report_insert.data[0]
            created_reports.append(created_report)

            if parsed_rows:
                rows_to_insert = []
                for parsed in parsed_rows:
                    rows_to_insert.append({
                        "submission_id": submission_id,
                        "file_id": file_row["file_id"],
                        "report_id": created_report["report_id"],
                        "template_type": template_type,
                        "row_number": parsed["row_number"],
                        "raw_row": parsed["raw_row"],
                        "normalized_row": parsed["normalized_row"],
                        "is_valid": parsed["is_valid"],
                        "validation_errors": parsed["validation_errors"],
                    })

                if rows_to_insert:
                    db.table("submission_parsed_rows").insert(rows_to_insert).execute()

        return {
            "success": True,
            "submission_id": submission_id,
            "reports_created": len(created_reports),
            "data": created_reports,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))