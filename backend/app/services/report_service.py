from __future__ import annotations

import html
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions import ReportGenerationError
from ..schemas.reports import AnalysisResponse
from .analysis_service import AnalysisService
from .storage_service import StorageService


class ReportService:
    def __init__(self, session: AsyncSession, storage: StorageService) -> None:
        self.session = session
        self.storage = storage
        self.analysis_service = AnalysisService(session, storage)

    async def generate_html(self, analysis_id: str) -> tuple[str, bytes]:
        analysis = await self.analysis_service.get(analysis_id)
        response = await self.analysis_service.to_response(analysis)
        html_doc = self._render(response)
        try:
            from weasyprint import HTML  # type: ignore

            pdf_bytes = HTML(string=html_doc).write_pdf()
        except Exception:
            pdf_bytes = b""
        return html_doc, pdf_bytes

    async def generate_pdf(self, analysis_id: str) -> bytes:
        _, pdf = await self.generate_html(analysis_id)
        if not pdf:
            raise ReportGenerationError(message="PDF rendering backend (WeasyPrint) is not installed.")
        return pdf

    def _render(self, r: AnalysisResponse) -> str:
        verdict_color = {
            "authentic": "#2e7d32",
            "inconclusive": "#9e9e9e",
            "suspicious": "#f57f17",
            "manipulated": "#c62828",
        }.get(r.verdict, "#616161")

        signals_html = ""
        for s in r.signals:
            sig_color = {"high": "#c62828", "medium": "#f57f17", "low": "#2e7d32"}.get(s.severity, "#616161")
            signals_html += f"""
            <tr>
              <td>{html.escape(s.name)}</td>
              <td style="color:{sig_color}">{s.score if s.score is not None else 'n/a'} / 1.0</td>
              <td>{s.confidence if s.confidence is not None else 'n/a'}</td>
              <td>{html.escape(s.severity)}</td>
              <td>{html.escape(s.explanation)}</td>
            </tr>"""

        frames_html = ""
        for f in r.suspiciousFrames:
            frames_html += (
                f"<li>Frame {f.frame} @ {f.timestamp:.1f}s — score {f.score:.2f}: {html.escape(f.reason)}</li>"
            )
        segments_html = ""
        for seg in r.suspicious_segments:
            segments_html += (
                f"<li>{seg.start:.1f}s - {seg.end:.1f}s (score {seg.score:.2f})</li>"
            )

        ci = r.confidenceInterval or {}
        media = r.media or {}
        models = r.models or {}

        generated_at = datetime.now(UTC).isoformat()
        return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>AUTHENTIQ Forensic Report</title>
<style>
body {{ font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; color:#1f2937; }}
h1 {{ color:#0f172a; }} h2 {{ color:#334155; border-bottom:1px solid #e2e8f0; padding-bottom:.3rem; }}
table {{ border-collapse: collapse; width:100%; margin:.5rem 0; }}
th,td {{ border:1px solid #e2e8f0; padding:.4rem .6rem; text-align:left; font-size:.85rem; }}
th {{ background:#f8fafc; }}
.verdict {{ font-size:1.4rem; font-weight:700; padding:.5rem .8rem; color:#fff; border-radius:.4rem; display:inline-block; }}
.muted {{ color:#64748b; font-size:.85rem; }}
.grid {{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; }}
</style></head><body>
<h1>AUTHENTIQ Forensic Report</h1>
<p class="muted">Case ID: <b>{html.escape(r.id)}</b> · Generated: {html.escape(generated_at)}</p>
<div class="verdict" style="background:{verdict_color}">{html.escape(r.verdict.upper())}</div>
<p>Calibrated manipulation probability: <b>{r.confidence:.2f}</b>
 CI [{ci.get('lower', 'n/a')}, {ci.get('upper', 'n/a')}]</p>
<p>{html.escape(r.explanation)}</p>

<h2>Media</h2>
<table>
<tr><th>Filename</th><th>Type</th><th>SHA-256</th><th>Duration</th></tr>
<tr><td>{html.escape(media.get('filename',''))}</td>
<td>{html.escape(r.mediaType)}</td>
<td><code>{html.escape(media.get('sha256','') or 'n/a')}</code></td>
<td>{media.get('duration') or 'n/a'}</td></tr>
</table>

<h2>Signal Breakdown</h2>
<table>
<tr><th>Signal</th><th>Score</th><th>Confidence</th><th>Severity</th><th>Explanation</th></tr>
{signals_html}
</table>

<h2>Suspicious Frames</h2>
<ul>{frames_html or "<li>None flagged</li>"}</ul>

<h2>Suspicious Segments</h2>
<ul>{segments_html or "<li>None flagged</li>"}</ul>

<h2>Artifacts</h2>
<table>
<tr><th>Artifact</th><th>URI</th></tr>
{self._artifact_rows(r)}
</table>

<h2>Models</h2>
<table><tr><th>Component</th><th>Version</th></tr>
{''.join(f'<tr><td>{html.escape(k)}</td><td>{html.escape(str(v))}</td></tr>' for k, v in models.items())}
</table>

<h2>Methodology & Limitations</h2>
<ul>
<li>Independent forensic signals are fused with a meta-classifier and calibrated to a confidence scale.</li>
<li>{html.escape(' '.join(r.limitations))}</li>
</ul>
<p class="muted">This report is a probabilistic forensic assessment, not a determination of absolute truth.</p>
</body></html>"""

    def _artifact_rows(self, r: AnalysisResponse) -> str:
        rows = ""
        for name, uri in r.artifacts.items():
            if uri:
                rows += f'<tr><td>{html.escape(name)}</td><td><a href="{html.escape(uri)}">{html.escape(uri)}</a></td></tr>'
        return rows or "<tr><td colspan=2>None</td></tr>"
