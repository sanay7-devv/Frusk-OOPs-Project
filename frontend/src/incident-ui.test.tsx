import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import StatusChip from './components/StatusChip';
import SlaCountdown from './components/SlaCountdown';
import { slaStateColor } from './theme/theme';

afterEach(cleanup);

describe('Incident status and SLA displays', () => {
  it('uses the friendly status label and distinguishes withdrawn closure', () => {
    const { rerender } = render(<StatusChip status="PENDING_USER_INFO" friendly />);
    expect(screen.getByText('Waiting for details')).toBeTruthy();
    rerender(<StatusChip status="CLOSED" closureReason="WITHDRAWN" friendly />);
    expect(screen.getByText('Withdrawn')).toBeTruthy();
    rerender(<StatusChip status="REOPENED" />);
    expect(screen.getByText('Reopened')).toBeTruthy();
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

  it('uses the server SLA state colour for every countdown state', () => {
    const { container, rerender } = render(<SlaCountdown due="2099-01-01T00:00:00Z" slaState="OK" />);
    const colors = {
      OK: slaStateColor.OK,
      WARNING: slaStateColor.WARNING,
      AT_RISK: slaStateColor.AT_RISK,
      VIOLATED: slaStateColor.VIOLATED,
      PAUSED: slaStateColor.PAUSED,
      MET: slaStateColor.MET,
    } as const;
    const toRgb = (hex: string) => {
      const value = hex.slice(1);
      return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
    };

    for (const [state, color] of Object.entries(colors) as [keyof typeof colors, string][]) {
      rerender(<SlaCountdown due="2099-01-01T00:00:00Z" slaState={state} remainingSeconds={120} />);
      expect(getComputedStyle(container.firstElementChild as HTMLElement).color).toBe(toRgb(color));
    }
  });
});
