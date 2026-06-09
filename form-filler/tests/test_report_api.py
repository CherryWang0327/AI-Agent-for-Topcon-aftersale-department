from contextlib import AbstractContextManager

from fastapi.testclient import TestClient

import app as app_module


class DummyConnection(AbstractContextManager):
    def __exit__(self, exc_type, exc, tb):
        return False


def test_report_tables_returns_allowed_table_metadata(monkeypatch):
    monkeypatch.setenv("REPORT_ALLOWED_TABLES", "info_record,n8n_info_record")
    monkeypatch.setenv("REPORT_DEFAULT_TABLE", "info_record")
    monkeypatch.setattr(app_module, "_connect_postgres", lambda: DummyConnection())
    monkeypatch.setattr(
        app_module,
        "_list_table_columns",
        lambda _connection, table_name: [{"column_name": "id"}]
        if table_name == "info_record"
        else [{"column_name": "id"}, {"column_name": "customer_name"}],
    )
    monkeypatch.setattr(
        app_module,
        "_count_table_rows",
        lambda _connection, table_name: 12 if table_name == "info_record" else 5,
    )

    client = TestClient(app_module.app)
    response = client.get("/api/report/tables")

    assert response.status_code == 200
    assert response.json() == [
        {"name": "info_record", "label": "Info Record", "row_count": 12, "column_count": 1},
        {"name": "n8n_info_record", "label": "N8N Info Record", "row_count": 5, "column_count": 2},
    ]


def test_report_analyze_rejects_non_whitelisted_tables(monkeypatch):
    monkeypatch.setenv("REPORT_ALLOWED_TABLES", "info_record")
    client = TestClient(app_module.app)

    response = client.post(
        "/api/reports/analyze",
        json={"table_name": "other_table", "max_rows": 30, "question": "Focus on risks"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "table_name is not allowed for the report UI"


def test_report_analyze_validates_max_rows(monkeypatch):
    monkeypatch.setenv("REPORT_ALLOWED_TABLES", "info_record")
    client = TestClient(app_module.app)

    response = client.post(
        "/api/reports/analyze",
        json={"table_name": "info_record", "max_rows": 101, "question": "Focus on risks"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "max_rows must be between 1 and 100"


def test_report_alias_reuses_analysis_response_logic(monkeypatch):
    payload = {
        "table_name": "info_record",
        "row_count": 10,
        "column_count": 3,
        "sample_rows_used": 5,
        "sample_rows_truncated": False,
        "analysis_question": "Focus on actions",
        "analysis": {
            "data_status": "usable",
            "executive_summary": "Summary",
            "growth_opportunities": ["A", "B"],
            "operational_insights": ["A", "B"],
            "customer_signals": ["A", "B"],
            "risk_alerts": ["A", "B"],
            "recommended_actions": ["A", "B"],
            "data_gaps": ["A", "B"],
            "dashboard_kpis": ["A", "B"],
            "follow_up_questions": ["A", "B"],
        },
        "report_markdown": "# Summary",
        "generated_at": "2026-03-23T12:00:00+00:00",
    }

    def fake_build_analysis_response(request_payload, *, default_table_name, restrict_to_report_tables):
        assert default_table_name in {"info_record", app_module._report_default_table()}
        assert isinstance(restrict_to_report_tables, bool)
        return payload

    monkeypatch.setenv("REPORT_ALLOWED_TABLES", "info_record")
    monkeypatch.setenv("REPORT_DEFAULT_TABLE", "info_record")
    monkeypatch.setattr(app_module, "_build_analysis_response", fake_build_analysis_response)

    client = TestClient(app_module.app)
    original = client.post("/analyze/info-record", json={"table_name": "info_record"})
    alias = client.post("/api/reports/analyze", json={"table_name": "info_record"})

    assert original.status_code == 200
    assert alias.status_code == 200
    assert original.json() == alias.json() == payload
