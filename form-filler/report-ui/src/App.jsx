import { startTransition, useEffect, useState } from 'react';

const DEFAULT_QUESTION =
  'Focus on growth opportunities, operational risks, KPI design, and the next set of actions.';

const REPORT_SECTIONS = [
  { key: 'growth_opportunities', label: 'Growth Opportunities', tone: 'emerald' },
  { key: 'operational_insights', label: 'Operational Insights', tone: 'blue' },
  { key: 'customer_signals', label: 'Customer Signals', tone: 'gold' },
  { key: 'risk_alerts', label: 'Risk Alerts', tone: 'rose' },
  { key: 'recommended_actions', label: 'Recommended Actions', tone: 'slate' },
  { key: 'data_gaps', label: 'Data Gaps', tone: 'amber' },
  { key: 'dashboard_kpis', label: 'Suggested KPIs', tone: 'violet' },
  { key: 'follow_up_questions', label: 'Follow-up Questions', tone: 'teal' },
];

const STATUS_LABELS = {
  empty: 'No Data Yet',
  insufficient: 'Limited Sample',
  usable: 'Ready for Analysis',
};

const STATUS_COPY = {
  empty: 'This table does not contain enough records yet, so the report should be read as a setup and data-collection guide.',
  insufficient:
    'Useful sample rows exist, but conclusions are still directional. Pair the report with SQL aggregates before making operating decisions.',
  usable:
    'The current sample is large enough for an initial strategic readout and action planning discussion.',
};

function statusLabel(value) {
  return STATUS_LABELS[value] || 'Unknown Status';
}

function statusCopy(value) {
  return STATUS_COPY[value] || 'Review the report together with raw data and business context.';
}

function formatDateTime(value) {
  if (!value) {
    return 'Not generated';
  }
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function readErrorMessage(response) {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === 'string' && payload.detail.trim()) {
      return payload.detail;
    }
  } catch {
    return `Request failed (${response.status})`;
  }
  return `Request failed (${response.status})`;
}

function downloadMarkdown(report) {
  if (!report?.report_markdown) {
    return;
  }
  const blob = new Blob([report.report_markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${report.table_name || 'report'}-analysis.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={`tab-button${active ? ' active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="metric-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionCard({ title, items, tone }) {
  return (
    <article className={`section-card tone-${tone}`}>
      <header>
        <span className="section-eyebrow">Section</span>
        <h3>{title}</h3>
      </header>
      {items?.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">No items returned.</p>
      )}
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="loading-skeleton" aria-live="polite" aria-busy="true">
      <div className="skeleton hero" />
      <div className="skeleton row" />
      <div className="skeleton row short" />
      <div className="skeleton-grid">
        <div className="skeleton card" />
        <div className="skeleton card" />
        <div className="skeleton card" />
        <div className="skeleton card" />
      </div>
    </div>
  );
}

export default function App() {
  const [tables, setTables] = useState([]);
  const [tablesError, setTablesError] = useState('');
  const [loadingTables, setLoadingTables] = useState(true);
  const [selectedTable, setSelectedTable] = useState('');
  const [maxRows, setMaxRows] = useState(30);
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState('structured');

  useEffect(() => {
    let active = true;

    async function loadTables() {
      setLoadingTables(true);
      setTablesError('');
      try {
        const response = await fetch('/api/report/tables');
        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }
        const payload = await response.json();
        if (!active) {
          return;
        }
        startTransition(() => {
          setTables(payload);
          setSelectedTable((current) => current || payload[0]?.name || '');
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setTablesError(
          error instanceof Error ? error.message : 'Unable to load reportable tables.'
        );
      } finally {
        if (active) {
          setLoadingTables(false);
        }
      }
    }

    loadTables();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedTable) {
      setReportError('Please select a reportable table.');
      return;
    }

    setLoadingReport(true);
    setReportError('');
    try {
      const response = await fetch('/api/reports/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_name: selectedTable,
          max_rows: Number(maxRows),
          question,
        }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const payload = await response.json();
      startTransition(() => {
        setReport(payload);
        setActiveTab('structured');
      });
    } catch (error) {
      setReportError(
        error instanceof Error ? error.message : 'Report generation failed.'
      );
    } finally {
      setLoadingReport(false);
    }
  }

  const selectedTableMeta = tables.find((item) => item.name === selectedTable);
  const canExport = Boolean(report?.report_markdown);

  return (
    <div className="page-shell">
      <div className="backdrop backdrop-one" />
      <div className="backdrop backdrop-two" />

      <header className="hero-banner">
        <div className="hero-copy">
          <div className="eyebrow-row">
            <span className="eyebrow">Metagents Report Desk</span>
            <span className="eyebrow muted">Private Cloudflare Access Workspace</span>
          </div>
          <h1>Turn database samples into reports.</h1>
          <p>
            Configure the analysis brief on the left and read the executive report on the right. The
            workspace is designed for internal use only and allows report generation only from approved
            business tables.
          </p>
        </div>
      </header>

      <main className="workspace">
        <section className="control-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Report Inputs</span>
              <h2>Generation Inputs</h2>
            </div>
          </div>

          <form className="control-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Analysis table</span>
              <select
                value={selectedTable}
                onChange={(event) => setSelectedTable(event.target.value)}
                disabled={loadingTables || !tables.length}
                aria-label="Analysis table"
              >
                {loadingTables ? <option>Loading tables...</option> : null}
                {!loadingTables && !tables.length ? <option>No tables available</option> : null}
                {tables.map((table) => (
                  <option key={table.name} value={table.name}>
                    {table.label} ({table.row_count} rows)
                  </option>
                ))}
              </select>
            </label>

            <div className="field-grid">
              <label className="field">
                <span>Sample size</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={maxRows}
                  onChange={(event) => setMaxRows(Number(event.target.value))}
                  aria-label="Sample size"
                />
              </label>
              <label className="field compact">
                <span>Rows</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxRows}
                  onChange={(event) => setMaxRows(Number(event.target.value))}
                  aria-label="Sample size rows"
                />
              </label>
            </div>

            <label className="field">
              <span>Analysis brief</span>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows="6"
                aria-label="Analysis brief"
              />
            </label>

            <div className="button-row">
              <button
                type="submit"
                className="primary-button"
                disabled={loadingReport || loadingTables || !selectedTable}
              >
                {loadingReport ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => window.print()}
                disabled={!canExport}
              >
                Print / PDF
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => downloadMarkdown(report)}
                disabled={!canExport}
              >
                Download Markdown
              </button>
            </div>
          </form>

          {tablesError ? (
            <div className="feedback-card error" role="alert">
              <strong>Unable to load tables</strong>
              <p>{tablesError}</p>
            </div>
          ) : null}

          {reportError ? (
            <div className="feedback-card error" role="alert">
              <strong>Report generation failed</strong>
              <p>{reportError}</p>
            </div>
          ) : null}

          <div className="side-metrics">
            <MetricPill label="Default focus" value="Growth / Risk / KPI / Action" />
            <MetricPill label="Access model" value="Cloudflare Access" />
            <MetricPill
              label="Current table"
              value={
                selectedTableMeta
                  ? `${selectedTableMeta.row_count} rows / ${selectedTableMeta.column_count} cols`
                  : 'Waiting for selection'
              }
            />
          </div>
        </section>

        <section className="report-panel">
          <div className="report-toolbar">
            <div>
              <span className="panel-kicker">Executive Output</span>
              <h2>Web Report</h2>
            </div>
            <div className="tab-row" role="tablist" aria-label="Report view">
              <TabButton active={activeTab === 'structured'} onClick={() => setActiveTab('structured')}>
                Structured View
              </TabButton>
              <TabButton active={activeTab === 'markdown'} onClick={() => setActiveTab('markdown')}>
                Raw Markdown
              </TabButton>
            </div>
          </div>

          {loadingReport ? <LoadingSkeleton /> : null}

          {!loadingReport && !report ? (
            <div className="empty-state">
              <span className="empty-badge">Ready</span>
              <h3>Generate your first report</h3>
              <p>
                Select an approved table, adjust the sample size, and define the analysis brief.
                The right panel will render the report in a format suitable for review and printing.
              </p>
            </div>
          ) : null}

          {!loadingReport && report ? (
            <article className="report-content">
              <header className="summary-hero">
                <div>
                  <span className="summary-label">Table name</span>
                  <h3>{report.table_name}</h3>
                </div>
                <div className={`status-chip status-${report.analysis?.data_status || 'unknown'}`}>
                  <span>{statusLabel(report.analysis?.data_status)}</span>
                </div>
              </header>

              <div className="summary-panel">
                <p className="summary-copy">
                  {report.analysis?.executive_summary || 'No executive summary was returned.'}
                </p>
                <p className="summary-subcopy">{statusCopy(report.analysis?.data_status)}</p>
              </div>

              <div className="metric-strip">
                <MetricPill label="Row count" value={report.row_count} />
                <MetricPill label="Columns" value={report.column_count} />
                <MetricPill label="Rows sampled" value={report.sample_rows_used} />
                <MetricPill label="Generated at" value={formatDateTime(report.generated_at)} />
              </div>

              {report.sample_rows_truncated ? (
                <div className="feedback-card warning">
                  <strong>Sample was truncated</strong>
                  <p>
                    This report was generated from a shortened sample. It is useful for directional
                    discussion, but operating decisions should still be checked against full-table SQL
                    aggregates.
                  </p>
                </div>
              ) : null}

              {activeTab === 'structured' ? (
                <div className="section-grid">
                  {REPORT_SECTIONS.map((section) => (
                    <SectionCard
                      key={section.key}
                      title={section.label}
                      tone={section.tone}
                      items={report.analysis?.[section.key] || []}
                    />
                  ))}
                </div>
              ) : (
                <pre className="markdown-panel">{report.report_markdown}</pre>
              )}
            </article>
          ) : null}
        </section>
      </main>
    </div>
  );
}
