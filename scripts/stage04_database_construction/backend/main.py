from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from dotenv import load_dotenv
from backend.api import curation
from backend.api.graph import router as graph_router

from backend.api import (
    plants,
    compounds,
    genes,
    pathways,
    diseases,
    search,
    admin,
    analytics,
    graph,
    signatures,
    publications,
    therapeutics,
    collaboration,
    admin_collaboration,
    targets,
    submission_validation,
)

from pydantic import BaseModel
import requests
from openai import OpenAI
import json
import re
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

app = FastAPI(
    title="Algerian Chemogenomic Phytochemical Database API",
    description="API for the National Algerian Chemogenomic Phytochemical Database",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plants.router, prefix="/api/plants", tags=["Plants"])
app.include_router(compounds.router, prefix="/api/compounds", tags=["Compounds"])
app.include_router(genes.router, prefix="/api/genes", tags=["Genes"])
app.include_router(pathways.router, prefix="/api/pathways", tags=["Pathways"])
app.include_router(diseases.router, prefix="/api/diseases", tags=["Diseases"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(graph.router, prefix="/api/graph", tags=["Knowledge Graph"])
app.include_router(signatures.router, prefix="/api/signatures", tags=["Transcriptomic Signatures"])
app.include_router(publications.router, prefix="/api/publications", tags=["Publications"])
app.include_router(therapeutics.router, prefix="/api/therapeutics", tags=["Therapeutics"])
app.include_router(collaboration.router, prefix="/api/collaboration", tags=["Collaboration"])
app.include_router(graph_router, prefix="/api", tags=["graph"])
app.include_router(targets.router, prefix="/api/targets", tags=["Targets"])
app.include_router(
    curation.router,
    prefix="/api/curation",
    tags=["Curation"],
)
app.include_router(
    admin_collaboration.router,
    prefix="/api/admin-collaboration",
    tags=["Admin Collaboration"],
)
app.include_router(
    submission_validation.router,
    prefix="/api/submission-validation",
    tags=["Submission Validation"],
)

# -------------------------
# HEALTH
# -------------------------
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Algerian Chemogenomic Database API",
    }


@app.get("/")
async def root():
    return {
        "message": "Algerian Chemogenomic Phytochemical Database API",
        "docs": "/api/docs",
        "version": "1.0.0",
    }


# =========================
# 🤖 SMART CHATBOT
# =========================

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


def _safe_get(url: str, params: Optional[Dict[str, Any]] = None) -> Any:
    try:
        r = requests.get(url, params=params, timeout=12)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {
            "error": str(e),
            "url": url,
            "params": params or {},
        }


def _clip(obj: Any, limit: int = 8000) -> str:
    text = json.dumps(obj, ensure_ascii=False, indent=2)
    if len(text) > limit:
        return text[:limit] + "\n... [truncated]"
    return text


def _extract_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except Exception:
        return {}


def _planner(message: str) -> Dict[str, Any]:
    planning_prompt = f"""
You are an intent planner for a scientific portal assistant.
Return ONLY valid JSON with this exact schema:

{{
  "intent": "overview|compound_lookup|target_lookup|plant_lookup|navigation|explanation|unknown",
  "entity_type": "compound|target|plant|none",
  "query": "short search phrase or empty string",
  "needs_multiple": true
}}

Rules:
- If the user is asking about a compound or molecule, entity_type = compound.
- If the user is asking about a target or gene, entity_type = target.
- If the user is asking about a plant, entity_type = plant.
- If the user asks how to use the portal or what data exists, use explanation or navigation.
- "query" should contain the likely entity name if present.
- "needs_multiple" should be true only when the user asks for a list, examples, or broad overview.

User message:
{message}
"""
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": "Return only valid JSON."},
                {"role": "user", "content": planning_prompt},
            ],
        )
        raw = resp.choices[0].message.content or "{}"
        parsed = _extract_json(raw)
        return {
            "intent": parsed.get("intent", "unknown"),
            "entity_type": parsed.get("entity_type", "none"),
            "query": parsed.get("query", ""),
            "needs_multiple": bool(parsed.get("needs_multiple", False)),
        }
    except Exception:
        return {
            "intent": "unknown",
            "entity_type": "none",
            "query": "",
            "needs_multiple": False,
        }


def _fetch_context(plan: Dict[str, Any]) -> Dict[str, Any]:
    base = "http://127.0.0.1:8000"
    intent = plan.get("intent", "unknown")
    entity_type = plan.get("entity_type", "none")
    query = (plan.get("query") or "").strip()
    needs_multiple = plan.get("needs_multiple", False)

    context: Dict[str, Any] = {
        "plan": plan,
        "sources": {},
    }

    if intent == "explanation":
        context["sources"]["portal_overview"] = {
            "available_modules": [
                "plants",
                "compounds",
                "targets",
                "signatures",
                "publications",
                "graph",
                "lab",
                "data access",
            ],
            "core_evidence_types": [
                "plant-compound associations",
                "compound metadata",
                "ChEMBL bioactivity",
                "LINCS evidence",
                "GEO-linked evidence",
                "graph-ready relationships",
            ],
        }
        return context

    if entity_type == "compound":
        params = {"limit": 5, "skip": 0}
        if query:
            params["q"] = query
        listing = _safe_get(f"{base}/api/compounds", params=params)
        context["sources"]["compound_search"] = listing

        rows = listing.get("data", []) if isinstance(listing, dict) else []
        if rows:
            chosen = rows[0]
            compound_id = chosen.get("compound_id")
            context["chosen_compound"] = chosen

            context["sources"]["compound_detail"] = _safe_get(
                f"{base}/api/compounds/{compound_id}"
            )
            context["sources"]["compound_chembl"] = _safe_get(
                f"{base}/api/compounds/{compound_id}/chembl"
            )
            context["sources"]["compound_targets"] = _safe_get(
                f"{base}/api/compounds/{compound_id}/targets"
            )
            context["sources"]["compound_lincs"] = _safe_get(
                f"{base}/api/compounds/{compound_id}/lincs"
            )
            context["sources"]["compound_geo"] = _safe_get(
                f"{base}/api/compounds/{compound_id}/geo"
            )

    elif entity_type == "target":
        params = {"limit": 5, "skip": 0}
        if query:
            params["q"] = query
        listing = _safe_get(f"{base}/api/targets", params=params)
        context["sources"]["target_search"] = listing

        rows = listing.get("data", []) if isinstance(listing, dict) else []
        if rows:
            chosen = rows[0]
            target_key = chosen.get("target_key")
            context["chosen_target"] = chosen
            context["sources"]["target_detail"] = _safe_get(
                f"{base}/api/targets/{target_key}"
            )

    elif entity_type == "plant":
        params = {"limit": 5, "skip": 0}
        if query:
            params["q"] = query
        listing = _safe_get(f"{base}/api/plants", params=params)
        context["sources"]["plant_search"] = listing

        rows = listing.get("data", []) if isinstance(listing, dict) else []
        if rows:
            chosen = rows[0]
            plant_id = chosen.get("plant_id")
            context["chosen_plant"] = chosen
            context["sources"]["plant_detail"] = _safe_get(
                f"{base}/api/plants/{plant_id}"
            )

    elif intent in {"overview", "navigation", "unknown"} or needs_multiple:
        context["sources"]["compounds"] = _safe_get(
            f"{base}/api/compounds", params={"limit": 5, "skip": 0}
        )
        context["sources"]["targets"] = _safe_get(
            f"{base}/api/targets", params={"limit": 5, "skip": 0}
        )
        context["sources"]["plants"] = _safe_get(
            f"{base}/api/plants", params={"limit": 5, "skip": 0}
        )

    return context


@app.post("/api/chat")
def chat(req: ChatRequest):
    plan = _planner(req.message)
    context = _fetch_context(plan)

    answer_prompt = f"""
You are the AI Research Assistant for the Algerian Chemogenomic Phytochemical Portal.

Your role:
- answer clearly, helpfully, and scientifically
- stay grounded in the provided portal data
- do not invent unavailable facts
- if data is missing, say so plainly
- give short navigation advice when useful
- do not duplicate the Lab page's deep matrix analysis
- instead provide quick interpretation, quick summary, and portal guidance

Preferred answer structure:
1. Direct answer
2. What portal data supports it
3. Suggested next page or action, if useful

User question:
{req.message}

Structured portal context:
{_clip(context, 12000)}
"""

    history_messages: List[Dict[str, str]] = []
    if req.history:
        for item in req.history[-6:]:
            role = item.get("role", "user")
            content = item.get("content", "")
            if role in {"user", "assistant"} and content:
                history_messages.append({"role": role, "content": content})

    messages = [
        {
            "role": "system",
            "content": "You are a grounded scientific portal assistant. Never fabricate portal data.",
        },
        *history_messages,
        {
            "role": "user",
            "content": answer_prompt,
        },
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.3,
        messages=messages,
    )

    answer = response.choices[0].message.content or "I could not generate a response."

    return {
        "answer": answer,
        "plan": plan,
        "context_preview": {
            "keys": list(context.keys()),
            "source_keys": list(context.get("sources", {}).keys()),
        },
    }


# -------------------------
# RUN
# -------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000)),
        reload=True,
    )