import { alpha } from '@mui/material';
import { tokens } from '../../theme/theme';

/** Shared colour helpers for the technician and team lead screens. Everything is built from theme tokens, never from hex literals. */
export { alpha };

/** Primary action gradient (indigo to cyan) used on the main call-to-action buttons. */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`;
export const BRAND_GRADIENT_REVERSE = `linear-gradient(135deg, ${tokens.secondary} 0%, ${tokens.primary} 100%)`;
export const BRAND_GRADIENT_HOVER = `linear-gradient(135deg, ${tokens.primaryDark} 0%, ${tokens.secondary} 100%)`;
