import type { ElementType, ReactNode } from 'react';
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

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
  color = '#6366f1',
  badge,
  onClick,
}: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        bgcolor: 'rgba(18, 22, 34, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
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
              color: '#94a3b8',
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
            variant="h4"
            sx={{
              fontWeight: 800,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
          {badge}
        </Box>
        {subtitle && (
          <Typography sx={{ color: '#64748b', fontSize: '0.75rem', mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
