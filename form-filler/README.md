# form-filler

Small FastAPI service used by n8n.

## Endpoints

- `POST /fill/support-request`
- `POST /fill/maintenance-form/from-record`
- `POST /sync/maintenance-form/reply`
- `POST /analyze/info-record`
- `GET /api/report/tables`
- `POST /api/reports/analyze`
- `GET /mapping/support-request`
- `GET /mapping/maintenance-form`
- `GET /healthz`
- `GET /` report UI

## Maintenance export flow

`POST /fill/maintenance-form/from-record` reads one row from the `table_name` passed by n8n, fills `template.xlsx`, and returns a generated workbook.

Request body:

```json
{
  "record_id": 1,
  "table_name": "n8n_info_record"
}
```

If `record_id` is omitted, the latest row ordered by `id desc` is used. `table_name` is required.

Export behavior:

1. Normal maintenance fields are written into their target cells.
2. Short fields that need English output are translated with Ollama using `FORM_FILLER_OLLAMA_MODEL`.
3. `request_details` and `current_condition` are exported into `B6` and `B7` as:

```text
[EN]
...

[JA]
...

[TH]
...
```

4. A hidden sheet `_reply_meta` is added. Cell `A1` stores a single JSON document with:
   - `version=maintenance_reply_v1`
   - `record_id`
   - `table_name`
   - source sheet name
   - visible field cell mapping
   - original normal field values
   - multilingual source text, blocks, and hashes
5. The output file is saved to `/outputs/<CustomerName>_Maintenance.xlsx` and returned as an attachment.

The hidden metadata sheet is required for safe write-back. Old workbooks without `_reply_meta` are rejected by the import endpoint.

## Info record analysis flow

`POST /analyze/info-record` reads `info_record` (or another table passed in `table_name`), samples rows, calls the DeepSeek Chat Completions API, and returns a strategic analysis report in JSON. Maintenance export/import translation flows continue to use Ollama.

Request body:

```json
{
  "table_name": "info_record",
  "max_rows": 30,
  "question": "Focus on growth opportunities, risks, KPI design, and next-step actions"
}
```

Response shape:

```json
{
  "table_name": "info_record",
  "row_count": 0,
  "column_count": 12,
  "sample_rows_used": 0,
  "sample_rows_truncated": false,
  "analysis_question": "...",
  "analysis": {
    "data_status": "empty",
    "executive_summary": "...",
    "growth_opportunities": ["..."],
    "operational_insights": ["..."],
    "customer_signals": ["..."],
    "risk_alerts": ["..."],
    "recommended_actions": ["..."],
    "data_gaps": ["..."],
    "dashboard_kpis": ["..."],
    "follow_up_questions": ["..."]
  },
  "report_markdown": "# ...",
  "generated_at": "2026-03-09T00:00:00+00:00"
}
```

If the table is empty, the tool still returns a useful report. The LLM will focus on data collection priorities, KPI design, and next-step actions instead of inventing trends.

## Report UI flow

The service now also serves a private report workspace at `/`.

- The UI is intended for a Cloudflare-protected hostname such as `reports.metagents6.xyz`.
- It calls same-origin APIs, so no CORS configuration is required.
- Reports are generated on demand and are not stored as history records.
- Users can review the structured report in the browser, download Markdown, or print the page to PDF.

### Report UI APIs

`GET /api/report/tables` returns the whitelist of reportable tables:

```json
[
  {
    "name": "info_record",
    "label": "Info Record",
    "row_count": 12,
    "column_count": 9
  }
]
```

Only tables listed in `REPORT_ALLOWED_TABLES` are exposed here.

`POST /api/reports/analyze` is the frontend-facing alias for report generation. It keeps the same request and response shape as `POST /analyze/info-record`, but it enforces the report-table allowlist.

## Maintenance import flow

`POST /sync/maintenance-form/reply` accepts a returned workbook, writes changes directly back to PostgreSQL, then returns a regenerated `.xlsx` file.

Request format:

- `multipart/form-data`
- required file field: `file`
- optional text fields:
  - `sender_email`
  - `message_id`

Import behavior:

1. Validates that `_reply_meta` exists and `version=maintenance_reply_v1`.
2. Reads visible cells and compares them with exported metadata.
3. For ordinary fields, writes the new visible value directly to the mapped DB column.
4. Rebuilds `appointment_start` / `appointment_end` from the visible date and time cells.
5. Parses multilingual cells only when they preserve the labeled `[EN] / [JA] / [TH]` structure.
6. Detects which language block changed:
   - one changed block: that block becomes canonical
   - multiple changed blocks: priority is `en > ja > th`
   - lower-priority changed blocks are ignored and returned in `warnings`
7. Writes canonical text back to `request_details` / `current_condition`, stores `*_source_lang`, regenerates `*_en/*_ja/*_th`, and updates all columns in one DB transaction.
8. Rebuilds the workbook from the latest DB state and returns the new `.xlsx` attachment.

Response format:

- binary `.xlsx` attachment
- filename: `<table_name>.xlsx`
- useful headers:
  - `X-Import-Record-Id`
  - `X-Import-Table-Name`
  - `X-Updated-Fields`
  - `X-Warnings-Count`

## Required environment variables

- `POSTGRES_DATABASE`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

Defaults already configured in `docker-compose.yml`:

- `POSTGRES_HOST=host.docker.internal`
- `POSTGRES_PORT=5432`
- `POSTGRES_TABLE=n8n_info_record`
- `OLLAMA_BASE_URL=http://ollama:11434`
- `OLLAMA_MODEL=kamekichi128/qwen3-4b-instruct-2507:latest`
- `OLLAMA_THINK=false`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-chat`
- `MAINTENANCE_TEMPLATE_PATH=/templates/template.xlsx`
- `OUTPUT_DIR=/outputs`
- `REPORT_ALLOWED_TABLES=info_record,n8n_info_record`
- `REPORT_DEFAULT_TABLE=info_record`

## Maintenance field behavior

- `appointment_start` -> `customer_appointment_date` + `customer_appointment_time`
- `appointment_end` -> `end_date` + `end_time`
- `service_address` -> `address`
- `current_condition` is the canonical DB field, but the visible worksheet cell still uses the existing template location `B7`
- output filename defaults to `<table_name>.xlsx`

## n8n usage

### Export workflow

1. `Code` or `Set` node outputs:

```javascript
return [{ json: { record_id: $json.id, table_name: $json.table_name } }];
```

2. `HTTP Request` node:
   - Method: `POST`
   - URL: `http://form-filler:8000/fill/maintenance-form/from-record`
   - Body Content Type: `JSON`
   - JSON Body: `={{ { record_id: $json.record_id, table_name: $json.table_name } }}`
   - Response Format: `File`
   - Binary Property: `data`

3. `Send Email` node attaches binary field `data`.

### Reply import workflow

1. Use your email trigger / IMAP node to read the returned attachment.
2. Pass the attachment binary into an `HTTP Request` node configured as:
   - Method: `POST`
   - URL: `http://form-filler:8000/sync/maintenance-form/reply`
   - Send Body: `multipart/form-data`
   - Add one binary field named `file`
   - Binary Property: the attachment binary from the email node
   - Optional text fields:
     - `sender_email`
     - `message_id`
   - Response Format: `File`
   - Binary Property: `data`
3. Configure the response as `File`, because the endpoint now returns a regenerated workbook.
4. Optional: if you enable response headers in n8n, you can read `X-Import-Record-Id`, `X-Import-Table-Name`, `X-Updated-Fields`, and `X-Warnings-Count` for logging.
5. Use the returned binary file in later nodes, for example to archive it or send it back by email.

### Info record analysis workflow

1. Use a `Set` or `Code` node to prepare the request body:

```javascript
return [{
  json: {
    table_name: 'info_record',
    max_rows: 30,
    question: 'Focus on growth opportunities, risks, KPI design, and next-step actions',
  },
}];
```

2. `HTTP Request` node:
   - Method: `POST`
   - URL: `http://form-filler:8000/analyze/info-record`
   - Body Content Type: `JSON`
   - JSON Body: `={{$json}}`
   - Response Format: `JSON`

3. Use `{{$json.report_markdown}}` in a Slack, Email, Notion, or Markdown node, or use the structured fields inside `{{$json.analysis}}` for branching and notifications.

## Deployment note

The Docker image now builds the report UI and serves it from the same FastAPI container as the APIs. To publish the UI externally, add a Cloudflare Tunnel public hostname such as `reports.metagents6.xyz` and point it to `http://form-filler:8000`. The current `cloudflared` service in `docker-compose.yml` stays token-based; the hostname mapping itself is configured in the Cloudflare dashboard rather than in this repository.
