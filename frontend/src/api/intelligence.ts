import { api } from './client';

export interface CategorySuggestion {
  categoryId: number | null;
  categoryName: string | null;
  confidence: number;
  reason: string;
  source?: 'LLM' | 'KEYWORD' | 'EMBEDDING' | string;
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
  match?: 'DUPLICATE' | 'RELATED' | string;
  source?: 'LLM' | 'KEYWORD' | 'EMBEDDING' | string;
}

export const suggestCategory = async (b: { title: string; description: string; serviceId?: number }): Promise<CategorySuggestion> => {
  const res = await api.post<CategorySuggestion>('/intelligence/suggest-category', b);
  return res.data;
};

export const suggestIntake = async (description: string): Promise<IntakeSuggestion> => {
  const res = await api.post<IntakeSuggestion>('/intelligence/suggest-intake', { description });
  return res.data;
};

export const findSimilar = async (b: { title: string; description: string; serviceId: number }): Promise<SimilarIncident[]> => {
  const res = await api.post<SimilarIncident[]>('/intelligence/similar', b);
  return res.data || [];
};
