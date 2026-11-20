import type { ElementType, ReactNode } from 'react';
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

import { tokens } from '../theme/theme';
import { alpha } from '@mui/material/styles';
export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ElementType;
  color?: string;
  badge?: ReactNode;
  onClick?: () => void;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = tokens.primary,
  badge,
  onClick,
}: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
        border: `1px solid ${tokens.outlineVariant}`,
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              borderColor: alpha(tokens.white, 0.2),
              boxShadow: `0 8px 24px ${alpha(tokens.black, 0.4)}`,
            }
          : undefined,
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: tokens.onSurfaceVariant,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </Typography>
          {Icon && (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: `${color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color,
              }}
            >
              <Icon sx={{ fontSize: 18 }} />
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            variant="h4" component="p"
            sx={{
              fontWeight: 800,
              fontFamily: 'JetBrains Mono, monospace',
              color: tokens.white,
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
          {badge}
        </Box>
        {subtitle && (
          <Typography sx={{ color: tokens.textDisabled, fontSize: '0.75rem', mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
