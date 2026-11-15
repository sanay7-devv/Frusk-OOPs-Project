import { api, tokenStore } from './client';

export interface CategorySuggestion {
  categoryId: number | null;
  categoryName: string | null;
  confidence: number;
  reason: string;
  source?: string;
}

export interface IntakeSuggestion {
  categoryId?: number | null;
  categoryName?: string | null;
  impact: number;
  urgency: number;
  confidence: number;
  reason: string;
}

export interface SimilarIncident {
  incidentId: number;
  code: string;
  title: string;
  similarity: number;
  status: string;
}

export const suggestCategory = async (b: { title: string; description: string; serviceId?: number }): Promise<CategorySuggestion> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return mockSuggestCategory(b);
  }
  try {
    const res = await api.post('/intelligence/suggest-category', b);
    return res.data;
  } catch {
    return mockSuggestCategory(b);
  }
};

export const suggestIntake = async (description: string): Promise<IntakeSuggestion> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return mockSuggestIntake(description);
  }
  try {
    const res = await api.post('/intelligence/suggest-intake', { description });
    return res.data;
  } catch {
    return mockSuggestIntake(description);
  }
};

export const findSimilar = async (b: { title: string; description: string; serviceId: number }): Promise<SimilarIncident[]> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return mockFindSimilar(b);
  }
  try {
    const res = await api.post('/intelligence/similar', b);
    return res.data;
  } catch {
    return mockFindSimilar(b);
  }
};

// Heuristic fallback for offline/demo operation
function mockSuggestCategory(b: { title: string; description: string; serviceId?: number }): CategorySuggestion {
  const combined = (b.title + ' ' + b.description).toLowerCase();
  if (combined.includes('vpn') || combined.includes('network') || combined.includes('handshake') || combined.includes('dns')) {
    return { categoryId: 1, categoryName: 'Network & Connectivity', confidence: 0.94, reason: 'Matched networking, VPN or gateway tokens in description' };
  }
  if (combined.includes('okta') || combined.includes('saml') || combined.includes('sso') || combined.includes('login') || combined.includes('auth')) {
    return { categoryId: 2, categoryName: 'Authentication & Access Controls', confidence: 0.92, reason: 'Matched authentication, SSO and identity tokens' };
  }
  if (combined.includes('database') || combined.includes('sql') || combined.includes('postgres') || combined.includes('data')) {
    return { categoryId: 3, categoryName: 'Data Integrity & Corruption', confidence: 0.89, reason: 'Matched database and table storage telemetry' };
  }
  if (combined.includes('slow') || combined.includes('latency') || combined.includes('timeout') || combined.includes('performance')) {
    return { categoryId: 4, categoryName: 'Performance & Latency Degradation', confidence: 0.86, reason: 'Matched latency and response degradation symptoms' };
  }
  return { categoryId: 6, categoryName: 'Application Software', confidence: 0.78, reason: 'General operational software disruption classification' };
}

function mockSuggestIntake(description: string): IntakeSuggestion {
  const lower = description.toLowerCase();
  if (lower.includes('outage') || lower.includes('down') || lower.includes('fail') || lower.includes('catastrophic') || lower.includes('payment')) {
    return { impact: 4, urgency: 4, confidence: 0.91, reason: 'High business impact keywords detected in incident report', categoryId: 6, categoryName: 'Application Software' };
  }
  if (lower.includes('vpn') || lower.includes('sso') || lower.includes('cannot access') || lower.includes('blocked')) {
    return { impact: 3, urgency: 4, confidence: 0.94, reason: 'Significant departmental blocker detected with elevated urgency', categoryId: 1, categoryName: 'Network & Connectivity' };
  }
  return { impact: 2, urgency: 2, confidence: 0.75, reason: 'Standard single-user operational request', categoryId: 6, categoryName: 'Application Software' };
}

function mockFindSimilar(b: { title: string; description: string; serviceId: number }): SimilarIncident[] {
  const lower = (b.title + ' ' + b.description).toLowerCase();
  if (lower.includes('vpn') || lower.includes('sso') || lower.includes('okta') || lower.includes('remote')) {
    return [
      { incidentId: 108, code: 'INC-2026-00108', title: 'SSO Login loop for Bangalore & Mumbai offices', similarity: 0.88, status: 'IN_PROGRESS' },
      { incidentId: 104, code: 'INC-2026-00104', title: 'VPN Gateway handshakes dropping across India South', similarity: 0.74, status: 'IN_PROGRESS' },
    ];
  }
  return [];
}
