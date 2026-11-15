/** Clearly labelled illustrative events; incident data comes from the shared API store. */
export const DEMO_HISTORY = [
  { id: 1, action: 'INCIDENT_CREATED', description: 'An employee reported a sign-in verification issue.', actor: { name: 'Demo employee' }, createdAt: '2026-11-14T14:20:00Z' },
  { id: 2, action: 'CLASSIFIED', description: 'Categorised under Authentication.', actor: null, createdAt: '2026-11-14T14:20:01Z' },
  { id: 3, action: 'ASSIGNED', description: 'Routed to Security support.', actor: null, createdAt: '2026-11-14T14:20:02Z' },
  { id: 4, action: 'ACKNOWLEDGED', description: 'The assigned technician acknowledged the issue.', actor: { name: 'Security support' }, createdAt: '2026-11-14T14:22:00Z' },
  { id: 5, action: 'WORK_STARTED', description: 'Investigation started. The next update will appear here.', actor: { name: 'Security support' }, createdAt: '2026-11-14T14:24:00Z' },
];
