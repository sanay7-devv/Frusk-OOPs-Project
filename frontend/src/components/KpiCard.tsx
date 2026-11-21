import type { ElementType, ReactNode } from 'react';
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

import { tokens } from '../theme/theme';
import { alpha } from '@mui/material/styles';
import InfoTip from './InfoTip';
export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ElementType;
  color?: string;
  badge?: ReactNode;
  onClick?: () => void;
  titleTip?: ReactNode;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = tokens.primary,
  badge,
  onClick,
  titleTip,
}: KpiCardProps) {
  return (
    <Card
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={onClick ? `${title}: ${value}` : undefined}
      sx={{
        bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
        border: `1px solid ${tokens.outlineVariant}`,
        borderTop: `3px solid ${alpha(color, 0.75)}`,
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        width: '100%',
        p: 0,
        transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': onClick
          ? {
              borderColor: alpha(tokens.white, 0.25),
              bgcolor: alpha(tokens.surfaceContainerLow, 0.95),
            }
          : undefined,
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: tokens.onSurfaceVariant,
            }}
          >
            <InfoTip tip={titleTip}>{title}</InfoTip>
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
