import { z } from 'zod';
// Mirrors handbook 2.8 / Appendix C. Server is the authority.
export const passwordRule = z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Needs a letter').regex(/\d/, 'Needs a digit');
export const reasonRule = z.string().min(10, 'Please give at least 10 characters').max(1000);
export const incidentSchema = z.object
({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  serviceId: z.number({ invalid_type_error: 'Choose a service' }),
  categoryId: z.number().nullable().optional(),
  impact: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  affectedUsers: z.number().int().min(1).max(1_000_000),
});
export type IncidentForm = z.infer<typeof incidentSchema>;
