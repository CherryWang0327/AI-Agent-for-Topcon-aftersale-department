import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const reportPayload = {
  table_name: 'info_record',
  row_count: 18,
  column_count: 9,
  sample_rows_used: 12,
  sample_rows_truncated: false,
  generated_at: '2026-03-23T12:00:00+00:00',
  report_markdown: '# Report',
  analysis: {
    data_status: 'usable',
    executive_summary: 'This is a strategic summary for internal review.',
    growth_opportunities: ['Opportunity A', 'Opportunity B'],
    operational_insights: ['Insight A', 'Insight B'],
    customer_signals: ['Signal A', 'Signal B'],
    risk_alerts: ['Risk A', 'Risk B'],
    recommended_actions: ['Action A', 'Action B'],
    data_gaps: ['Gap A', 'Gap B'],
    dashboard_kpis: ['KPI A', 'KPI B'],
    follow_up_questions: ['Question A', 'Question B'],
  },
};

describe('App', () => {
  beforeEach(() => {
    window.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { name: 'info_record', label: 'Info Record', row_count: 18, column_count: 9 },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => reportPayload,
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads table options and renders the generated report', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('option', { name: /Info Record/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate Report' }));

    expect(await screen.findByText('Ready for Analysis')).toBeInTheDocument();
    expect(screen.getByText('Opportunity A')).toBeInTheDocument();
    expect(screen.getByText('Web Report')).toBeInTheDocument();
  });

  it('shows a table loading error when the whitelist endpoint fails', async () => {
    window.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'No allowed report tables are currently available' }),
    });

    render(<App />);

    expect(await screen.findByText('Unable to load tables')).toBeInTheDocument();
    expect(screen.getByText('No allowed report tables are currently available')).toBeInTheDocument();
  });
});
