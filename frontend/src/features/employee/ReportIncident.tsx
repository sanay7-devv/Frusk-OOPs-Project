import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Chip,
  Stack,
  Divider,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Tooltip,
} from '@mui/material';
import {
  Home as HomeIcon,
  EditNote as EditNoteIcon,
  Equalizer as EqualizerIcon,
  Subject as SubjectIcon,
  UploadFile as UploadFileIcon,
  Send as SendIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  SmartToy as SmartToyIcon,
  Psychology as PsychologyIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Timer as TimerIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  AutoFixHigh as AutoFixHighIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  Code as CodeIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatListNumbered as FormatListNumberedIcon,
  Terminal as TerminalIcon,
  GroupAdd as GroupAddIcon,
  VerifiedUser as VerifiedUserIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

import { getServices, getCategories } from '../../api/services';
import { createIncident, CreateIncidentPayload } from '../../api/incidents';
import { suggestCategory, suggestIntake, findSimilar, CategorySuggestion, SimilarIncident } from '../../api/intelligence';
import type { IncidentDetail, Priority } from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import { useToast } from '../../components/Toast';

// Form validation schema adhering to handbook rules
const reportSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(250, 'Title cannot exceed 250 characters'),
  serviceId: z.number({ invalid_type_error: 'Please choose an affected service' }),
  categoryId: z.number().nullable().optional(),
  impact: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  affectedUsers: z.number().int().min(1, 'At least 1 user must be affected'),
  description: z
    .string()
    .min(20, 'Please provide at least 20 characters describing the outage')
    .max(5000, 'Description cannot exceed 5000 characters'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: 'log' | 'image' | 'doc';
}

const IMPACT_LEVELS = [
  { level: 1, title: 'Minor (P-4)', desc: 'Isolated single-seat inconvenience.' },
  { level: 2, title: 'Moderate (P-3)', desc: 'Small team workaround exists.' },
  { level: 3, title: 'Significant (P-2)', desc: 'Entire office or core department slowed.' },
  { level: 4, title: 'Major (P-1)', desc: 'Primary core revenue or payment loop degraded.' },
  { level: 5, title: 'Catastrophic (SEV-1)', desc: 'Complete enterprise-wide total stoppage.' },
];

const URGENCY_LEVELS = [
  { level: 1, label: 'Low (<7d)' },
  { level: 2, label: 'Medium (<48h)' },
  { level: 3, label: 'High (<8h)' },
  { level: 4, label: 'Critical (<2h)' },
  { level: 5, label: 'Immediate (<15m)' },
];

export default function ReportIncident() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<CategorySuggestion | null>(null);
  const [similarIncidents, setSimilarIncidents] = useState<SimilarIncident[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [createdIncident, setCreatedIncident] = useState<IncidentDetail | null>(null);

  // Queries for services & categories
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: getServices });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: '',
      serviceId: undefined as unknown as number,
      categoryId: null,
      impact: 2,
      urgency: 2,
      affectedUsers: 1,
      description: '',
    },
  });

  const watchTitle = watch('title');
  const watchDescription = watch('description');
  const watchServiceId = watch('serviceId');
  const watchImpact = watch('impact') || 2;
  const watchUrgency = watch('urgency') || 2;
  const watchAffectedUsers = watch('affectedUsers') || 1;

  // Real-time matrix calculation of calculated priority
  const calculatePriority = (imp: number, urg: number): Priority => {
    const score = imp * urg;
    if (score >= 16) return 'P1';
    if (score >= 9) return 'P2';
    if (score >= 4) return 'P3';
    return 'P4';
  };

  const calculatedPriority = calculatePriority(watchImpact, watchUrgency);

  const priorityColorMap: Record<Priority, string> = {
    P1: '#f43f5e',
    P2: '#fb923c',
    P3: '#38bdf8',
    P4: '#4ade80',
  };

  const priorityLabelMap: Record<Priority, string> = {
    P1: 'P1 CRITICAL',
    P2: 'P2 HIGH',
    P3: 'P3 MEDIUM',
    P4: 'P4 LOW',
  };

  // Debounced AI Copilot calls when typing
  useEffect(() => {
    if (!watchTitle?.trim() && !watchDescription?.trim()) {
      setAiSuggestion(null);
      setSimilarIncidents([]);
      return;
    }
    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const cat = await suggestCategory({
          title: watchTitle || '',
          description: watchDescription || '',
          serviceId: watchServiceId,
        });
        if (cat) setAiSuggestion(cat);

        if (watchServiceId) {
          const sim = await findSimilar({
            title: watchTitle || '',
            description: watchDescription || '',
            serviceId: watchServiceId,
          });
          if (sim && sim.length > 0) setSimilarIncidents(sim);
          else setSimilarIncidents([]);
        }
      } catch {
        // Handled silently
      } finally {
        setAiLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [watchTitle, watchDescription, watchServiceId]);

  const applyAiRecommendations = () => {
    if (aiSuggestion?.categoryId) {
      setValue('categoryId', aiSuggestion.categoryId, { shouldValidate: true });
      toast('Applied AI category recommendation to form.', 'info');
    }
  };

  const appendFormatting = (prefix: string, suffix = '') => {
    const current = watchDescription || '';
    setValue('description', current + `\n${prefix}sample${suffix}\n`, { shouldValidate: true });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: AttachedFile[] = Array.from(files).map((f) => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
      type: f.name.endsWith('.png') || f.name.endsWith('.jpg') ? 'image' : 'log',
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    toast(`Attached ${newFiles.length} file(s).`, 'success');
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const onSubmit = async (data: ReportFormValues, confirmNotDuplicate = false) => {
    try {
      const payload: CreateIncidentPayload = {
        title: data.title,
        description: data.description,
        serviceId: data.serviceId,
        categoryId: data.categoryId ?? undefined,
        impact: data.impact,
        urgency: data.urgency,
        affectedUsers: data.affectedUsers,
        confirmNotDuplicate,
      };

      const result = await createIncident(payload);
      setCreatedIncident(result);
      toast('Incident submitted successfully.', 'success');
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.response?.data?.code === 'DUPLICATE_INCIDENT') {
        const returnedSimilar = err?.response?.data?.similar || [];
        if (returnedSimilar.length > 0) {
          setSimilarIncidents(returnedSimilar);
        }
        setDuplicateModalOpen(true);
      } else {
        toast(err?.response?.data?.message || 'Failed to submit incident. Please check the form and retry.', 'error');
      }
    }
  };

  const diagnosticScore = Math.min(
    100,
    (watchTitle?.length >= 20 ? 25 : 10) +
    (watchDescription?.length >= 100 ? 35 : 15) +
    (attachedFiles.length > 0 ? 25 : 10) +
    (watchAffectedUsers > 1 ? 15 : 5)
  );

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      {/* Top Breadcrumb & Page Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', color: '#4cd7f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate('/employee/home')}
          >
            <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
            PORTAL
          </Link>
          <Typography sx={{ color: '#94a3b8', fontSize: 13, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>
            REPORT INCIDENT
          </Typography>
          <Chip
            label="INTAKE_V4"
            size="small"
            sx={{
              height: 20,
              fontSize: 10.5,
              fontWeight: 700,
              bgcolor: 'rgba(99, 102, 241, 0.15)',
              color: '#c0c1ff',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        </Breadcrumbs>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Report an Operational Issue or Outage
            </Typography>
            <Typography sx={{ color: '#94a3b8', mt: 0.5, maxWidth: 840, fontSize: 14, fontFamily: 'Geist, sans-serif' }}>
              Submit critical downtime, authentication barriers, or degradation. Our real-time SRE triage engine matches incoming telemetry and alerts on-call operators immediately.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: 'rgba(18, 22, 34, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              px: 2,
              py: 0.8,
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#06b6d4',
                boxShadow: '0 0 8px #06b6d4',
              }}
            />
            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 600, color: '#4cd7f6' }}>
              SRE Dispatch: Active (Latency 1.4s)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Two-Column Grid */}
      <Grid container spacing={3} alignItems="flex-start">
        {/* LEFT COLUMN: Main Intake Form */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            component="form"
            onSubmit={handleSubmit((data) => onSubmit(data, false))}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              bgcolor: '#141824',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* SECTION 1: Core Parameters */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditNoteIcon sx={{ color: '#4cd7f6', fontSize: 20 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: '#4cd7f6', textTransform: 'uppercase' }}>
                    01. Core Incident Parameters
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>
                  * Mandatory for escalation routing
                </Typography>
              </Box>

              {/* Title Input */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#dfe2ef' }}>
                    Incident Title
                  </Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>
                    {watchTitle?.length || 0} / 200 chars
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Brief summary of the outage or symptom"
                  {...register('title')}
                  error={!!errors.title}
                  helperText={errors.title?.message || 'Be concise. Avoid ambiguous titles like "System broken" or "Help urgently".'}
                  sx={{
                    bgcolor: 'rgba(18, 22, 34, 0.7)',
                    borderRadius: '8px',
                  }}
                />
              </Box>

              {/* Service & Category Selectors */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#dfe2ef', mb: 0.8 }}>
                    Affected Service <span style={{ color: '#f43f5e' }}>*</span>
                  </Typography>
                  <Controller
                    name="serviceId"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small" error={!!errors.serviceId}>
                        <Select
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          sx={{ bgcolor: 'rgba(18, 22, 34, 0.7)', borderRadius: '8px' }}
                        >
                          {services.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              {s.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.5 }}>
                    Select the degraded customer-facing service
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#dfe2ef', mb: 0.8 }}>
                    Problem Category <span style={{ color: '#f43f5e' }}>*</span>
                  </Typography>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small" error={!!errors.categoryId}>
                        <Select
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          sx={{ bgcolor: 'rgba(18, 22, 34, 0.7)', borderRadius: '8px' }}
                        >
                          {categories.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.5 }}>
                    Used to determine initial responder rota
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

            {/* SECTION 2: Severity Metrics & Blast Radius */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EqualizerIcon sx={{ color: '#4cd7f6', fontSize: 20 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: '#4cd7f6', textTransform: 'uppercase' }}>
                    02. Severity Metrics &amp; Blast Radius
                  </Typography>
                </Box>
                <Chip
                  label={`SLA Matrix: ${priorityLabelMap[calculatedPriority]}`}
                  size="small"
                  sx={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: `${priorityColorMap[calculatedPriority]}18`,
                    color: priorityColorMap[calculatedPriority],
                    border: `1px solid ${priorityColorMap[calculatedPriority]}45`,
                  }}
                />
              </Box>

              {/* Impact Level Selection (5 Cards) */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#dfe2ef' }}>
                    Impact Level (Scope of Operational Impairment)
                  </Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#4cd7f6' }}>
                    Current: Level {watchImpact} ({IMPACT_LEVELS.find((i) => i.level === watchImpact)?.title})
                  </Typography>
                </Box>

                <Grid container spacing={1}>
                  {IMPACT_LEVELS.map((item) => {
                    const isSelected = watchImpact === item.level;
                    const isCatastrophic = item.level === 5;
                    return (
                      <Grid item xs={6} sm={2.4} key={item.level}>
                        <Paper
                          onClick={() => setValue('impact', item.level, { shouldValidate: true })}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.18s ease',
                            bgcolor: isSelected
                              ? isCatastrophic
                                ? 'rgba(244, 63, 94, 0.25)'
                                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(6, 182, 212, 0.2) 100%)'
                              : 'rgba(18, 22, 34, 0.6)',
                            color: isSelected ? '#ffffff' : '#94a3b8',
                            border: isSelected
                              ? `1px solid ${isCatastrophic ? '#f43f5e' : '#06b6d4'}`
                              : '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: isSelected
                              ? `0 0 16px ${isCatastrophic ? 'rgba(244, 63, 94, 0.35)' : 'rgba(6, 182, 212, 0.3)'}`
                              : 'none',
                            '&:hover': {
                              borderColor: isSelected ? undefined : 'rgba(99, 102, 241, 0.4)',
                              bgcolor: isSelected ? undefined : 'rgba(99, 102, 241, 0.08)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: isSelected ? '#4cd7f6' : '#64748b' }}>
                              LVL {item.level}
                            </Typography>
                            {isSelected && <CheckCircleIcon sx={{ fontSize: 16, color: '#4cd7f6' }} />}
                          </Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: isSelected ? '#ffffff' : '#dfe2ef', fontFamily: 'Sora, sans-serif' }}>
                            {item.title}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 11,
                              lineHeight: 1.3,
                              color: isSelected ? '#dfe2ef' : '#64748b',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontFamily: 'Geist, sans-serif',
                            }}
                          >
                            {item.desc}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>

              {/* Urgency & Affected Users Row */}
              <Grid container spacing={3} alignItems="center">
                {/* Urgency segmented pills */}
                <Grid item xs={12} sm={8}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#dfe2ef' }}>
                      Urgency Level (Time Sensitivity)
                    </Typography>
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#4cd7f6' }}>
                      Selected: {watchUrgency} ({URGENCY_LEVELS.find((u) => u.level === watchUrgency)?.label})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      bgcolor: 'rgba(18, 22, 34, 0.8)',
                      p: 0.5,
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      gap: 0.5,
                    }}
                  >
                    {URGENCY_LEVELS.map((u) => {
                      const isSelected = watchUrgency === u.level;
                      const isImmed = u.level === 5;
                      return (
                        <Button
                          key={u.level}
                          fullWidth
                          size="small"
                          onClick={() => setValue('urgency', u.level, { shouldValidate: true })}
                          sx={{
                            py: 0.8,
                            borderRadius: '6px',
                            textTransform: 'none',
                            fontSize: 12.5,
                            fontWeight: isSelected ? 700 : 500,
                            bgcolor: isSelected
                              ? isImmed
                                ? 'rgba(244, 63, 94, 0.3)'
                                : 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)'
                              : 'transparent',
                            color: isSelected ? '#ffffff' : isImmed ? '#f43f5e' : '#94a3b8',
                            boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.35)' : 'none',
                            '&:hover': {
                              bgcolor: isSelected ? undefined : 'rgba(255, 255, 255, 0.04)',
                            },
                          }}
                        >
                          {u.label}
                        </Button>
                      );
                    })}
                  </Box>
                </Grid>

                {/* Affected Users Stepper */}
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#dfe2ef', mb: 1 }}>
                    Estimated Affected Users
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: 'rgba(18, 22, 34, 0.8)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      p: 0.5,
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setValue('affectedUsers', Math.max(1, (watchAffectedUsers || 1) - 1))}
                      sx={{ color: '#94a3b8' }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      variant="standard"
                      type="number"
                      value={watchAffectedUsers}
                      onChange={(e) => setValue('affectedUsers', Math.max(1, parseInt(e.target.value) || 1))}
                      InputProps={{ disableUnderline: true }}
                      inputProps={{ min: 1, style: { textAlign: 'center', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#dfe2ef' } }}
                      sx={{ flexGrow: 1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => setValue('affectedUsers', (watchAffectedUsers || 0) + 1)}
                      sx={{ color: '#94a3b8' }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

            {/* SECTION 3: Detailed Telemetry & Narrative */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SubjectIcon sx={{ color: '#4cd7f6', fontSize: 20 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: '#4cd7f6', textTransform: 'uppercase' }}>
                    03. Detailed Telemetry &amp; Narrative
                  </Typography>
                </Box>
              </Box>

              {/* Textarea with Formatting Toolbar */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#dfe2ef' }}>
                    Detailed Description
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                    Markdown &amp; Stack Traces supported
                  </Typography>
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    bgcolor: 'rgba(18, 22, 34, 0.8)',
                    '&:focus-within': { borderColor: '#06b6d4', boxShadow: '0 0 12px rgba(6, 182, 212, 0.2)' },
                  }}
                >
                  {/* Toolbar */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.5,
                      py: 0.8,
                      bgcolor: '#0e121d',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <Tooltip title="Bold">
                      <IconButton size="small" onClick={() => appendFormatting('**', '**')} sx={{ color: '#94a3b8' }}>
                        <FormatBoldIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Italic">
                      <IconButton size="small" onClick={() => appendFormatting('*', '*')} sx={{ color: '#94a3b8' }}>
                        <FormatItalicIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Code snippet">
                      <IconButton size="small" onClick={() => appendFormatting('`', '`')} sx={{ color: '#94a3b8' }}>
                        <CodeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                    <Tooltip title="Bulleted list">
                      <IconButton size="small" onClick={() => appendFormatting('- ')} sx={{ color: '#94a3b8' }}>
                        <FormatListBulletedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Numbered list">
                      <IconButton size="small" onClick={() => appendFormatting('1. ')} sx={{ color: '#94a3b8' }}>
                        <FormatListNumberedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Insert terminal log">
                      <IconButton size="small" onClick={() => appendFormatting('```terminal\n$ ', '\n```')} sx={{ color: '#94a3b8' }}>
                        <TerminalIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Box sx={{ ml: 'auto' }}>
                      <Chip
                        label="AI Auto-Enrichment Active"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          bgcolor: 'rgba(99, 102, 241, 0.15)',
                          color: '#c0c1ff',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Textarea */}
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    placeholder="Describe exact error messages, timeline, steps to reproduce, and impact on operations..."
                    {...register('description')}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    InputProps={{ disableUnderline: true }}
                    variant="standard"
                    sx={{
                      p: 1.5,
                      '& .MuiInputBase-root': { fontSize: 13, lineHeight: 1.6, color: '#dfe2ef', fontFamily: 'Geist, sans-serif' },
                    }}
                  />
                </Paper>
              </Box>

              {/* Diagnostic Evidence & Logs (Drag and Drop Zone) */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#dfe2ef' }}>
                    Diagnostic Evidence &amp; Logs
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                    Max file size 5MB each (PNG, JPG, LOG, HAR)
                  </Typography>
                </Box>

                <Paper
                  elevation={0}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    p: 3,
                    borderRadius: '12px',
                    border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                    bgcolor: 'rgba(18, 22, 34, 0.6)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)', borderColor: '#6366f1' },
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    multiple
                    accept=".log,.har,.pcapng,.png,.jpg,.jpeg,.pdf,.txt"
                    onChange={handleFileUpload}
                  />
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: 'rgba(6, 182, 212, 0.15)',
                      color: '#4cd7f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1.5,
                      boxShadow: '0 0 16px rgba(6, 182, 212, 0.2)',
                    }}
                  >
                    <UploadFileIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>
                    <span style={{ color: '#4cd7f6' }}>Click to browse</span> or drag screenshots, error logs, or network HAR captures
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>
                    Supported formats: .log, .har, .pcapng, .png, .pdf (Diagnostics will be automatically sanitized for PII)
                  </Typography>

                  {/* Attached File Pills */}
                  {attachedFiles.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                      {attachedFiles.map((f) => (
                        <Chip
                          key={f.id}
                          icon={f.type === 'image' ? <ImageIcon fontSize="small" /> : <DescriptionIcon fontSize="small" />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#dfe2ef' }}>{f.name}</Typography>
                              <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>({f.size})</Typography>
                            </Box>
                          }
                          onDelete={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          deleteIcon={<CloseIcon fontSize="small" />}
                          sx={{
                            bgcolor: 'rgba(18, 22, 34, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

            {/* Form Footer Action Bar */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#94a3b8' }}>
                <VerifiedUserIcon sx={{ fontSize: 18, color: '#06b6d4' }} />
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                  Automated ITIL incident dispatch to Tier-2 SRE queue
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={() => reset()}
                  sx={{
                    borderRadius: '8px',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { borderColor: 'rgba(255, 255, 255, 0.25)', bgcolor: 'rgba(255, 255, 255, 0.04)', color: '#dfe2ef' },
                  }}
                >
                  Cancel &amp; Discard
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  sx={{
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                    color: '#ffffff',
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 700,
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)',
                      boxShadow: '0 0 28px rgba(6, 182, 212, 0.55)',
                    },
                  }}
                >
                  {isSubmitting ? 'Submitting...' : '+ Submit Incident Ticket'}
                </Button>
              </Stack>
            </Box>
          </Paper>

          {/* Incident Best Practices Guarantee Card */}
          <Paper
            elevation={0}
            sx={{
              mt: 2.5,
              p: 2,
              borderRadius: '12px',
              bgcolor: 'rgba(18, 22, 34, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            }}
          >
            <InfoIcon sx={{ color: '#4cd7f6', mt: 0.3 }} />
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
                Triage Expedite Guarantee
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3, lineHeight: 1.5, fontFamily: 'Geist, sans-serif' }}>
                Providing specific timestamps and system error hex codes shortens Average Triage Time (ATT) by 62%. High-severity issues automatically page the primary site engineering lead within 180 seconds.
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: Floating AI Intake Copilot */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ position: { lg: 'sticky' }, top: 80, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Copilot Header Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '16px',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    bgcolor: '#6366f1',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)',
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
                      AI Intake Copilot
                    </Typography>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }} />
                  </Box>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4cd7f6' }}>
                    Real-time Semantic Classifier
                  </Typography>
                </Box>
              </Box>
              <Chip
                label="v3.2 ACTIVE"
                size="small"
                sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, bgcolor: 'rgba(6, 182, 212, 0.15)', color: '#4cd7f6', border: '1px solid rgba(6, 182, 212, 0.3)' }}
              />
            </Paper>

            {/* AI Suggested Classification Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                bgcolor: '#141824',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <PsychologyIcon sx={{ color: '#c0c1ff', fontSize: 18 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, color: '#c0c1ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Suggested Classification
                  </Typography>
                </Box>
                {aiSuggestion?.categoryId != null && (
                  <Chip
                    label={aiLoading ? 'Analyzing...' : `${Math.round((aiSuggestion.confidence || 0) * 100)}% confidence`}
                    size="small"
                    sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                  />
                )}
              </Box>

              {aiSuggestion && aiSuggestion.categoryId != null ? (
                <>
                  {/* Classification Metric Box */}
                  <Box sx={{ bgcolor: 'rgba(18, 22, 34, 0.7)', p: 2, borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Category Match:</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#4cd7f6' }}>
                        {aiSuggestion.categoryName}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Source:</Typography>
                      <Chip
                        label={(aiSuggestion as any).source || 'AI'}
                        size="small"
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          fontSize: 10,
                          height: 20,
                          bgcolor: 'rgba(99, 102, 241, 0.2)',
                          color: '#c0c1ff',
                        }}
                      />
                    </Box>

                    {/* Confidence Bar */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>Model Alignment</Typography>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>
                          {(aiSuggestion.confidence || 0).toFixed(2)} / 1.00
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(aiSuggestion.confidence || 0) * 100}
                        sx={{ height: 5, borderRadius: '3px', bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: '#06b6d4' } }}
                      />
                    </Box>
                  </Box>

                  {aiSuggestion.reason && (
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4, fontFamily: 'Geist, sans-serif' }}>
                      {aiSuggestion.reason}
                    </Typography>
                  )}

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={applyAiRecommendations}
                    startIcon={<AutoFixHighIcon />}
                    sx={{
                      borderRadius: '8px',
                      borderColor: 'rgba(99, 102, 241, 0.4)',
                      bgcolor: 'rgba(99, 102, 241, 0.1)',
                      color: '#c0c1ff',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1', color: '#ffffff' },
                    }}
                  >
                    Apply Suggested Category
                  </Button>
                </>
              ) : (
                <Box sx={{ py: 3, px: 1, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
                    {aiLoading ? 'Analyzing incident description with semantic classifier...' : 'Type an issue title and description to see live AI categorization and similarity detection.'}
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* POTENTIAL DUPLICATE OUTAGE WARNING CARD */}
            {similarIncidents.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  bgcolor: 'rgba(245, 158, 11, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#fde68a' }}>
                  <WarningIcon sx={{ fontSize: 20, color: '#fb923c' }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                    Potential Duplicate Outage
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: '#fde68a', fontWeight: 500 }}>
                  {similarIncidents.length} similar incidents reported in the last 30 mins:
                </Typography>

                {similarIncidents.slice(0, 2).map((item, idx) => (
                  <Paper
                    key={item.incidentId}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      bgcolor: idx === 0 ? 'rgba(18, 22, 34, 0.8)' : 'rgba(18, 22, 34, 0.5)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#4cd7f6' }}>
                        {item.code}
                      </Typography>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#fb923c' }}>
                        {Math.round(item.similarity * 100)}% match
                      </Typography>
                    </Box>
                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>
                      &ldquo;{item.title}&rdquo;
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#06b6d4' }} />
                      <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Assigned: SRE Core Squad</Typography>
                    </Box>
                  </Paper>
                ))}

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setDuplicateModalOpen(true)}
                  startIcon={<GroupAddIcon />}
                  sx={{
                    mt: 0.5,
                    borderRadius: '8px',
                    bgcolor: '#d97706',
                    color: '#ffffff',
                    fontWeight: 700,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#b45309' },
                  }}
                >
                  View &amp; Join Existing Ticket
                </Button>
              </Paper>
            )}

            {/* ESTIMATED RESOLUTION SLA WINDOWS CARD */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                bgcolor: '#141824',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <ScheduleIcon sx={{ color: '#4cd7f6', fontSize: 18 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, color: '#4cd7f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Estimated SLA Windows
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>
                  TIER-2 SLA
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'rgba(18, 22, 34, 0.7)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Initial Response</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#4cd7f6', mt: 0.3, fontFamily: 'Sora, sans-serif' }}>
                      &lt; 15 mins
                    </Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#6ee7b7', mt: 0.3, fontFamily: 'JetBrains Mono, monospace' }}>
                      99.4% on-target
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'rgba(18, 22, 34, 0.7)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Target Resolution</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#dfe2ef', mt: 0.3, fontFamily: 'Sora, sans-serif' }}>
                      &lt; 2 hours
                    </Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', mt: 0.3, fontFamily: 'JetBrains Mono, monospace' }}>
                      Runbook standard
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(18, 22, 34, 0.7)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'rgba(99, 102, 241, 0.15)',
                    color: '#c0c1ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TimerIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>
                    {priorityLabelMap[calculatedPriority]} Target
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                    Engineering standby on-call: Tier-2 SRE queue
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Diagnostic Health Mini-Gauge */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                bgcolor: '#141824',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={diagnosticScore}
                    size={36}
                    thickness={4}
                    sx={{ color: '#06b6d4' }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#dfe2ef' }}>
                    Diagnostic Integrity {diagnosticScore}%
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                    Ready for automated synthesis
                  </Typography>
                </Box>
              </Box>
              <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* MODAL 1: Duplicate Detection Dialog */}
      <Dialog
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            p: 1,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: '#fde68a', fontFamily: 'Sora, sans-serif' }}>
          <WarningIcon sx={{ color: '#fb923c' }} />
          Potential Duplicate Incident Found
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px', bgcolor: 'rgba(245, 158, 11, 0.12)', color: '#fef3c7', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            A similar active incident is already being resolved by engineers. To avoid duplicated work, you can join the existing ticket to receive status updates.
          </Alert>

          {similarIncidents.map((sim) => (
            <Paper key={sim.incidentId} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: '10px', bgcolor: 'rgba(18, 22, 34, 0.8)', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#4cd7f6' }}>
                  {sim.code}
                </Typography>
                <Chip label={`${Math.round(sim.similarity * 100)}% match`} size="small" sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fde68a' }} />
              </Box>
              <Typography sx={{ fontWeight: 600, mt: 0.5, color: '#dfe2ef' }}>{sim.title}</Typography>
              <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>
                Status: {sim.status} • Active Engineering Remediation
              </Typography>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setDuplicateModalOpen(false);
              navigate('/employee/incidents');
            }}
            variant="contained"
            sx={{ bgcolor: '#d97706', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#b45309' } }}
          >
            Join Existing Ticket
          </Button>
          <Button
            onClick={() => {
              setDuplicateModalOpen(false);
              handleSubmit((data) => onSubmit(data, true))();
            }}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'rgba(255, 255, 255, 0.15)', color: '#dfe2ef' }}
          >
            Mine is Different, Submit Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 2: Incident Created Success Dialog */}
      <Dialog
        open={!!createdIncident}
        onClose={() => setCreatedIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 24px rgba(99, 102, 241, 0.2)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
          <CheckCircleIcon sx={{ color: '#10b981', fontSize: 26 }} />
          Incident Reported Successfully
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          {createdIncident && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="success" sx={{ borderRadius: '8px', bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                Your incident was categorized, prioritized, and dispatched to on-call engineers.
              </Alert>

              <Box sx={{ bgcolor: 'rgba(18, 22, 34, 0.8)', p: 2.5, borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Incident Code:</Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#4cd7f6' }}>
                    {createdIncident.code}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Assigned Priority:</Typography>
                  <PriorityBadge priority={createdIncident.priority} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Assigned Service:</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>{createdIncident.service.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Assignee:</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#dfe2ef' }}>{createdIncident.assignee?.name || 'Unassigned (Triage Dispatch Queue)'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Target SLA Resolution:</Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                    {createdIncident.resolutionDue
                      ? new Date(createdIncident.resolutionDue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Scheduled according to SLA policy'}
                  </Typography>
                </Box>
              </Box>

              {createdIncident.priorityBreakdown && (
                <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, color: '#c0c1ff', mb: 0.5 }}>
                    Why this priority?
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                    Impact ({createdIncident.priorityBreakdown.impact}/5) × Urgency ({createdIncident.priorityBreakdown.urgency}/5) with Business Criticality ({createdIncident.priorityBreakdown.criticality}/5) and users multiplier ({createdIncident.priorityBreakdown.usersMultiplier}x) yielded score {createdIncident.priorityBreakdown.score} ({createdIncident.priorityBreakdown.band}).
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setCreatedIncident(null);
              navigate('/employee/incidents');
            }}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'rgba(255, 255, 255, 0.15)', color: '#dfe2ef' }}
          >
            Go to My Incidents
          </Button>
          <Button
            onClick={() => {
              const id = createdIncident?.id;
              setCreatedIncident(null);
              if (id) navigate(`/employee/incidents/${id}`);
            }}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            View Incident Detail
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
