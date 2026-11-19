import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import StatusChip from './components/StatusChip';
import SlaCountdown from './components/SlaCountdown';

afterEach(cleanup);

describe('Incident status and SLA displays', () => {
  it('uses the friendly status label and distinguishes withdrawn closure', () => {
    const { rerender } = render(<StatusChip status="PENDING_USER_INFO" friendly />);
    expect(screen.getByText('Waiting for Details')).toBeTruthy();
    rerender(<StatusChip status="CLOSED" closureReason="WITHDRAWN" friendly />);
    expect(screen.getByText('Withdrawn')).toBeTruthy();
    rerender(<StatusChip status="REOPENED" />);
    expect(screen.getByText('REOPENED')).toBeTruthy();
  });

  it('shows server-controlled paused and met SLA states', () => {
    const { rerender } = render(
      <SlaCountdown due={null} slaState="PAUSED" remainingSeconds={125} />
    );
    expect(screen.getByText('Paused, 2m 5s left')).toBeTruthy();
    rerender(<SlaCountdown due={null} slaState="MET" />);
    expect(screen.getByText('Met')).toBeTruthy();
  });

  it('shows overdue when a violated deadline is past', () => {
    render(<SlaCountdown due="2020-01-01T00:00:00Z" slaState="VIOLATED" />);
    expect(screen.getByText(/^Overdue /)).toBeTruthy();
  });
});
