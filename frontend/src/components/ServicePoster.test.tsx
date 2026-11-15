import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ServicePoster from './ServicePoster';

afterEach(cleanup);
describe('Interactive service journey', () => {
  it('changes the screen and announcement when a stage is chosen', () => {
    render(<ServicePoster />);
    fireEvent.click(screen.getByRole('button', { name: /03 Audit/ }));
    expect(screen.getByText('Every action leaves a trace.')).toBeDefined();
    expect(screen.getByRole('button', { name: /03 Audit/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /01 Report/ }).getAttribute('aria-pressed')).toBe('false');
  });
  it('supports a full keyboard cycle in either direction', () => {
    render(<ServicePoster />);
    const art = screen.getByRole('group', { name: /Interactive service illustration/ });
    fireEvent.keyDown(art, { key: 'ArrowLeft' });
    expect(screen.getByText('Every action leaves a trace.')).toBeDefined();
    fireEvent.keyDown(art, { key: 'ArrowRight' });
    expect(screen.getByText('A small signal. A clear starting point.')).toBeDefined();
    fireEvent.keyDown(art, { key: 'ArrowRight' });
    expect(screen.getByText('The right hands. The next good fix.')).toBeDefined();
  });
});
