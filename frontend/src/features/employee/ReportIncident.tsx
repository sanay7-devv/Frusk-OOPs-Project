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
  InputLabel,
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

// TODO have to work for this to select what texts to use
const IMPACT_LEVELS = [
  { level: 1, title: 'Minor(P-4)', desc: 'Isolated single-seat inconvenience.' },
  { level: 2, title: 'Moderate(P-3)', desc: 'Small team workaround exists.' },
  { level: 3, title: 'Significant(P-2)', desc: 'Departmental blocker or business unit impact.' },
  { level: 4, title: 'Extensive(P-1)', desc: 'Company-wide core workflow outage.' },
  { level: 5, title: 'Catastrophic(P-1)', desc: 'Critical client-facing revenue loss.' },
];

const URGENCY_LEVELS = [
  { level: 1, label: '1 Low' },
  { level: 2, label: '2 Norm' },
  { level: 3, label: '3 Elev' },
  { level: 4, label: '4 High' },
  { level: 5, label: '5 Immed' },
];

// NOTE: this is the whole function which conatins another functions which will be exportetd and then shown on the screen
export default function ReportIncident() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries for services and categories
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: getServices });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  // Attached files state
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([
    { id: '1', name: 'okta-auth-trace-0835.log', size: '240 KB', type: 'log' },
    { id: '2', name: 'vpn_handshake_timeout.png', size: '1.1 MB', type: 'image' },
  ]);

  // ? should this be integrated AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<CategorySuggestion | null>({
    categoryId: 2,
    categoryName: 'Network & Connectivity',
    confidence: 0.94,
    reason: 'Derived from text phrase Okta SAML credential prompt loop and user count of 45.',
  });
  const [similarIncidents, setSimilarIncidents] = useState<SimilarIncident[]>([
    { incidentId: 108, code: 'INC-2026-00108', title: 'SSO Login loop for Bangalore & Mumbai offices', similarity: 0.88, status: 'IN_PROGRESS' },
    { incidentId: 104, code: 'INC-2026-00104', title: 'VPN Gateway handshakes dropping across India South', similarity: 0.74, status: 'IN_PROGRESS' },
  ]);

  // Outcome dialogs
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [createdIncident, setCreatedIncident] = useState<IncidentDetail | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: 'Cannot access Corporate VPN and Single Sign-On from remote office',
      serviceId: 1,
      categoryId: 1,
      impact: 3,
      urgency: 4,
      affectedUsers: 45,
      description: `At approximately 10:35 AM IST, remote personnel attempting to authenticate against the India-South VPN termination endpoint reported intermittent timeout exceptions (Error 0x8007274c).\n\nSubsequent attempts redirected users into an endless Okta SAML credential prompt loop with 'Assertion verification failure'.\n\nTroubleshooting steps attempted:\n- Flushed local client DNS cache and renewed DHCP lease.\n- Tested bypass via alternate APN: Failed with identical token rejection.\n- Confirmed internal subnet routing is unresponsive for all 45 regional engineering staff on Sprint Review prep.`,
    },
  });

  const watchTitle = watch('title');
  const watchDescription = watch('description');
  const watchServiceId = watch('serviceId');
  const watchImpact = watch('impact');
  const watchUrgency = watch('urgency');
  const watchAffectedUsers = watch('affectedUsers');

  // Calculate Priority Preview based on Impact, Urgency, and Service
  const selectedService = services.find((s) => s.id === watchServiceId);
  const calculatedPriority: Priority = selectedService?.alwaysP1
    ? 'P1' //if P1 then it will directly go to the incidents page with priority 1 ? : this type of functions
    : (watchImpact >= 4 && watchUrgency >= 4) || (selectedService?.criticality === 5 && watchImpact >= 3)
      ? 'P1'
      : (watchImpact >= 3 && watchUrgency >= 3)
        ? 'P2'
        : (watchImpact >= 2 || watchUrgency >= 2)
          ? 'P3'
          : 'P4';

  const priorityLabelMap: Record<Priority, string> = {
    P1: 'Priority 1 (Critical)',
    P2: 'Priority 2 (High)',
    P3: 'Priority 3 (Medium)',
    P4: 'Priority 4 (Low)',
  };

  const priorityColorMap: Record<Priority, string> = {
    P1: '#d32f2f',
    P2: '#ed6c02',
    P3: '#f9a825',
    P4: '#2e7d32',
  };

  // Debounced AI Copilot calls when typing
  useEffect(() => {
    if (!watchTitle && !watchDescription) return;
    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const cat = await suggestCategory({
          title: watchTitle || '',
          description: watchDescription || '',
          serviceId: watchServiceId,
        });
        if (cat) setAiSuggestion(cat);

        const sim = await findSimilar({
          title: watchTitle || '',
          description: watchDescription || '',
          serviceId: watchServiceId || 1,
        });
        if (sim && sim.length > 0) setSimilarIncidents(sim);
      } catch {
        // Fallback handled inside API layer
      } finally {
        setAiLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [watchTitle, watchDescription, watchServiceId]);

  // Apply AI Copilot recommendations to form
  const applyAiRecommendations = () => {
    if (aiSuggestion?.categoryId) {
      setValue('categoryId', aiSuggestion.categoryId, { shouldValidate: true });
    }
    // Propose reasonable impact & urgency
    setValue('impact', 3, { shouldValidate: true });
    setValue('urgency', 4, { shouldValidate: true });
    toast('Applied AI intake recommendations to form.', 'info');
  };

  // Description markdown formatting helpers
  const appendFormatting = (prefix: string, suffix = '') => {
    const current = watchDescription || '';
    setValue('description', current + `\n${prefix}sample${suffix}\n`, { shouldValidate: true });
  };

  // File upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: AttachedFile[] = Array.from(files).map((f) => ({
      id: Math.random().toString(36).substring(7), //random id generation 
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

  // Submit Handler
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
      toast('Incident submitted and dispatched to on-call SRE queue.', 'success');
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number; data?: { code?: string } } };
      if (errorObj?.response?.status === 409 || errorObj?.response?.data?.code === 'DUPLICATE_INCIDENT') {
        setDuplicateModalOpen(true);
      } else {
        toast('Failed to submit incident. Please check the form and retry.', 'error');
      }
    }
  };

  // Diagnostic health calculation (simple heuristic)
  const diagnosticScore = Math.min(
    100,
    (watchTitle?.length >= 20 ? 25 : 10) +
    (watchDescription?.length >= 100 ? 35 : 15) +
    (attachedFiles.length > 0 ? 25 : 10) +
    (watchAffectedUsers > 1 ? 15 : 5)
  );

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      <div className="eyebrow"><span className="shape-dot" />INCIDENT REPORTING</div>
      <h1 className="studio-report-title">Report an incident</h1>
      <p style={{ maxWidth: 600, color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 25 }}>Tell us what happened and who it affects. A clear report helps the right person find the right fix.</p>
      <div className="studio-intake-band"><strong>Incident details</strong><div className="studio-intake-steps"><span><b>1</b> THE ISSUE</span><span><b>2</b> THE IMPACT</span><span><b>3</b> THE DETAILS</span></div></div>

      {/* Main Two-Column Grid */}
      <Grid container spacing={3} alignItems="flex-start">
        {/* LEFT COLUMN: Main Intake Form (approx 65% on desktop) */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            component="form"
            onSubmit={handleSubmit((data) => onSubmit(data, false))}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
            }}
          >
            {/* SECTION 1: Core Parameters */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditNoteIcon sx={{ color: '#1653c7', fontSize: 20 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#1653c7', textTransform: 'uppercase' }}>
                    01. Core Incident Parameters
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                  * Mandatory for escalation routing
                </Typography>
              </Box>

              {/* Title Input */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    Incident Title
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
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
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#f5f7fa',
                      borderRadius: 0,
                      '&:hover': { bgcolor: '#ffffff' },
                      '&.Mui-focused': { bgcolor: '#ffffff' },
                    },
                  }}
                />
              </Box>

              {/* Service & Category Selectors */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b', mb: 0.8 }}>
                    Affected Service <span style={{ color: '#d32f2f' }}>*</span>
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
                          sx={{ bgcolor: '#f5f7fa', borderRadius: 0 }}
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
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b', mb: 0.8 }}>
                    Problem Category <span style={{ color: '#d32f2f' }}>*</span>
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
                          sx={{ bgcolor: '#f5f7fa', borderRadius: 0 }}
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

            <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

            {/* SECTION 2: Severity Metrics & Blast Radius */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EqualizerIcon sx={{ color: '#1653c7', fontSize: 20 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#1653c7', textTransform: 'uppercase' }}>
                    02. Severity Metrics &amp; Blast Radius
                  </Typography>
                </Box>
                <Chip
                  label={`SLA Matrix: ${priorityLabelMap[calculatedPriority]}`}
                  size="small"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: `${priorityColorMap[calculatedPriority]}15`,
                    color: priorityColorMap[calculatedPriority],
                    border: `1px solid ${priorityColorMap[calculatedPriority]}40`,
                  }}
                />
              </Box>

              {/* Impact Level Selection (5 Cards) */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    Impact Level (Scope of Operational Impairment)
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#1653c7' }}>
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
                            borderRadius: 2,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            bgcolor: isSelected
                              ? isCatastrophic
                                ? '#d32f2f'
                                : '#1653c7'
                              : '#f5f7fa',
                            color: isSelected ? '#ffffff' : '#1e293b',
                            border: isSelected
                              ? `1px solid ${isCatastrophic ? '#b71c1c' : '#0d47a1'}`
                              : '1px solid #e2e8f0',
                            '&:hover': {
                              bgcolor: isSelected
                                ? isCatastrophic
                                  ? '#b71c1c'
                                  : '#0d47a1'
                                : isCatastrophic
                                  ? '#fee2e2'
                                  : '#f1f5f9',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, opacity: isSelected ? 0.9 : 0.6 }}>
                              LVL {item.level}
                            </Typography>
                            {isSelected && <CheckCircleIcon sx={{ fontSize: 16, color: '#ffffff' }} />}
                          </Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                            {item.title}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 11,
                              lineHeight: 1.3,
                              color: isSelected ? 'rgba(255,255,255,0.85)' : '#64748b',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
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
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                      Urgency Level (Time Sensitivity)
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#1653c7' }}>
                      Selected: {watchUrgency} ({URGENCY_LEVELS.find((u) => u.level === watchUrgency)?.label})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      bgcolor: '#f5f7fa',
                      p: 0.5,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
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
                            borderRadius: 0,
                            textTransform: 'none',
                            fontSize: 13,
                            fontWeight: isSelected ? 700 : 500,
                            bgcolor: isSelected ? (isImmed ? '#d32f2f' : '#1653c7') : 'transparent',
                            color: isSelected ? '#ffffff' : isImmed ? '#d32f2f' : '#475569',
                            boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            '&:hover': {
                              bgcolor: isSelected
                                ? isImmed
                                  ? '#b71c1c'
                                  : '#0d47a1'
                                : isImmed
                                  ? '#fee2e2'
                                  : '#e2e8f0',
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
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b', mb: 1 }}>
                    Estimated Affected Users
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: '#f5f7fa',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      p: 0.5,
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setValue('affectedUsers', Math.max(1, (watchAffectedUsers || 1) - 1))}
                      sx={{ color: '#475569' }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      variant="standard"
                      type="number"
                      value={watchAffectedUsers}
                      onChange={(e) => setValue('affectedUsers', Math.max(1, parseInt(e.target.value) || 1))}
                      InputProps={{ disableUnderline: true }}
                      inputProps={{ min: 1, style: { textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' } }}
                      sx={{ flexGrow: 1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => setValue('affectedUsers', (watchAffectedUsers || 0) + 1)}
                      sx={{ color: '#475569' }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

            {/* SECTION 3: Detailed Telemetry & Narrative */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SubjectIcon sx={{ color: '#1653c7', fontSize: 20 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#1653c7', textTransform: 'uppercase' }}>
                    03. Detailed Telemetry &amp; Narrative
                  </Typography>
                </Box>
              </Box>

              {/* Textarea with Formatting Toolbar */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    Detailed Description
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                    Markdown &amp; Stack Traces supported
                  </Typography>
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: '#f5f7fa',
                    '&:focus-within': { borderColor: '#1653c7', bgcolor: '#ffffff' },
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
                      bgcolor: '#f1f5f9',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <Tooltip title="Bold">
                      <IconButton size="small" onClick={() => appendFormatting('**', '**')}>
                        <FormatBoldIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Italic">
                      <IconButton size="small" onClick={() => appendFormatting('*', '*')}>
                        <FormatItalicIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Code snippet">
                      <IconButton size="small" onClick={() => appendFormatting('`', '`')}>
                        <CodeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                    <Tooltip title="Bulleted list">
                      <IconButton size="small" onClick={() => appendFormatting('- ')}>
                        <FormatListBulletedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Numbered list">
                      <IconButton size="small" onClick={() => appendFormatting('1. ')}>
                        <FormatListNumberedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Insert terminal log">
                      <IconButton size="small" onClick={() => appendFormatting('```terminal\n$ ', '\n```')}>
                        <TerminalIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Box sx={{ ml: 'auto' }}>
                      <Chip
                        label="AI Auto-Enrichment Active"
                        size="small"
                        sx={{ height: 20, fontSize: 11, bgcolor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1' }}
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
                      '& .MuiInputBase-root': { fontSize: 13, lineHeight: 1.5 },
                    }}
                  />
                </Paper>
              </Box>

              {/* Diagnostic Evidence & Logs (Drag and Drop Zone) */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    Diagnostic Evidence &amp; Logs
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                    Max file size 5MB each (PNG, JPG, LOG, HAR)
                  </Typography>
                </Box>

                <Paper
                  elevation={0}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    p: 3,
                    borderRadius: 2.5,
                    border: '1.5px dashed #cbd5e1',
                    bgcolor: '#f5f7fa',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: '#f1f5f9', borderColor: '#1653c7' },
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
                      bgcolor: '#e3f2fd',
                      color: '#1653c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1.5,
                    }}
                  >
                    <UploadFileIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    <span style={{ color: '#1653c7' }}>Click to browse</span> or drag screenshots, error logs, or network HAR captures
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5 }}>
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
                              <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{f.name}</Typography>
                              <Typography sx={{ fontSize: 10, color: '#64748b' }}>({f.size})</Typography>
                            </Box>
                          }
                          onDelete={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          deleteIcon={<CloseIcon fontSize="small" />}
                          sx={{
                            bgcolor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 0,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>

            <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

            {/* Form Footer Action Bar */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748b' }}>
                <VerifiedUserIcon sx={{ fontSize: 18, color: '#059669' }} />
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                  Automated ITIL incident dispatch to Tier-2 SRE queue
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={() => reset()}
                  sx={{
                    borderRadius: 2,
                    borderColor: '#cbd5e1',
                    color: '#475569',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f5f7fa' },
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
                    borderRadius: 2,
                    bgcolor: '#1653c7',
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 700,
                    boxShadow: '0 2px 4px rgba(21,101,192,0.3)',
                    '&:hover': { bgcolor: '#0d47a1' },
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
              borderRadius: 2.5,
              bgcolor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            }}
          >
            <InfoIcon sx={{ color: '#1653c7', mt: 0.3 }} />
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                Triage Expedite Guarantee
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.3, lineHeight: 1.5 }}>
                Providing specific timestamps and system error hex codes shortens Average Triage Time (ATT) by 62%. High-severity issues automatically page the primary site engineering lead within 180 seconds.
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: Floating AI Intake Copilot (approx 35% on desktop) */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ position: { lg: 'sticky' }, top: 80, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Copilot Header Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: '#1653c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                      AI Intake Copilot
                    </Typography>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#059669' }} />
                  </Box>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                    Real-time Semantic Classifier
                  </Typography>
                </Box>
              </Box>
              <Chip
                label="v3.2 ACTIVE"
                size="small"
                sx={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, bgcolor: '#e3f2fd', color: '#1653c7' }}
              />
            </Paper>

            {/* AI Suggested Classification Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <PsychologyIcon sx={{ color: '#1653c7', fontSize: 18 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1653c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Suggested Classification
                  </Typography>
                </Box>
                <Chip
                  label={aiLoading ? 'Analyzing...' : `${Math.round((aiSuggestion?.confidence || 0.94) * 100)}% confidence`}
                  size="small"
                  sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, bgcolor: '#dcfce7', color: '#166534' }}
                />
              </Box>

              {/* Classification Metric Box */}
              <Box sx={{ bgcolor: '#f5f7fa', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>Category Match:</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1653c7' }}>
                    {aiSuggestion?.categoryName || 'Network / SSO'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>Predicted Priority:</Typography>
                  <Chip
                    label={calculatedPriority}
                    size="small"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      height: 22,
                      bgcolor: `${priorityColorMap[calculatedPriority]}20`,
                      color: priorityColorMap[calculatedPriority],
                    }}
                  />
                </Box>

                {/* Confidence Bar */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>Model Alignment</Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                      {((aiSuggestion?.confidence || 0.94)).toFixed(2)} / 1.00
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(aiSuggestion?.confidence || 0.94) * 100}
                    sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#1653c7' } }}
                  />
                </Box>
              </Box>

              <Typography sx={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                {aiSuggestion?.reason || 'Derived from text tokens and affected user volume.'}
              </Typography>

              <Button
                variant="outlined"
                fullWidth
                onClick={applyAiRecommendations}
                startIcon={<AutoFixHighIcon />}
                sx={{
                  borderRadius: 2,
                  borderColor: '#cbd5e1',
                  color: '#1653c7',
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: '#f5f7fa',
                  '&:hover': { bgcolor: '#e3f2fd', borderColor: '#1653c7' },
                }}
              >
                Apply AI Recommendations
              </Button>
            </Paper>

            {/* POTENTIAL DUPLICATE OUTAGE WARNING CARD */}
            {similarIncidents.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid #fcd34d',
                  bgcolor: '#fffbeb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#92400e' }}>
                  <WarningIcon sx={{ fontSize: 20, color: '#d97706' }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    Potential Duplicate Outage
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: '#78350f', fontWeight: 500 }}>
                  {similarIncidents.length} similar incidents reported in the last 30 mins:
                </Typography>

                {/* Primary Similar Incident Card */}
                {similarIncidents.slice(0, 2).map((item, idx) => (
                  <Paper
                    key={item.incidentId}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: idx === 0 ? '#ffffff' : 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(217, 119, 6, 0.2)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1653c7' }}>
                        {item.code}
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                        {Math.round(item.similarity * 100)}% match
                      </Typography>
                    </Box>
                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                      "{item.title}"
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#059669' }} />
                      <Typography sx={{ fontSize: 11, color: '#64748b' }}>Assigned: SRE Core Squad</Typography>
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
                    borderRadius: 2,
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
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <ScheduleIcon sx={{ color: '#1653c7', fontSize: 18 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1653c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Estimated SLA Windows
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                  TIER-2 SLA
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f5f7fa', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontSize: 11, color: '#64748b' }}>Initial Response</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1653c7', mt: 0.3 }}>
                      &lt; 15 mins
                    </Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#166534', mt: 0.3 }}>
                      99.4% on-target
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f5f7fa', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontSize: 11, color: '#64748b' }}>Target Resolution</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1e293b', mt: 0.3 }}>
                      &lt; 2 hours
                    </Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#475569', mt: 0.3 }}>
                      Runbook standard
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#f5f7fa', border: '1px solid #e2e8f0' }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: '#e3f2fd',
                    color: '#1653c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TimerIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {priorityLabelMap[calculatedPriority]} Target
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748b' }}>
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
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
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
                    sx={{ color: '#1653c7' }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                    Diagnostic Integrity {diagnosticScore}%
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                    Ready for automated synthesis
                  </Typography>
                </Box>
              </Box>
              <CheckIcon sx={{ color: '#059669', fontSize: 20 }} />
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
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: '#92400e' }}>
          <WarningIcon sx={{ color: '#d97706' }} />
          Potential Duplicate Incident Found
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#f1f5f9' }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            A similar active incident is already being resolved by engineers. To avoid duplicated work, you can join the existing ticket to receive status updates.
          </Alert>

          {similarIncidents.map((sim) => (
            <Paper key={sim.incidentId} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1653c7' }}>
                  {sim.code}
                </Typography>
                <Chip label={`${Math.round(sim.similarity * 100)}% match`} size="small" color="warning" />
              </Box>
              <Typography sx={{ fontWeight: 600, mt: 0.5 }}>{sim.title}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
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
            sx={{ textTransform: 'none', fontWeight: 600 }}
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
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: '#1653c7' }}>
          <CheckCircleIcon sx={{ color: '#059669', fontSize: 26 }} />
          Incident Reported Successfully
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#f1f5f9' }}>
          {createdIncident && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Your incident was categorized, prioritized, and dispatched to on-call engineers.
              </Alert>

              <Box sx={{ bgcolor: '#f5f7fa', p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>Incident Code:</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#1653c7' }}>
                    {createdIncident.code}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>Assigned Priority:</Typography>
                  <PriorityBadge priority={createdIncident.priority} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>Assigned Service:</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{createdIncident.service.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>Assignee:</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{createdIncident.assignee?.name || 'On-Call Tier-2 SRE'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>Target SLA Resolution:</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#059669' }}>
                    &lt; 2 hours
                  </Typography>
                </Box>
              </Box>

              {createdIncident.priorityBreakdown && (
                <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 0.5 }}>
                    Why this priority?
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>
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
            sx={{ textTransform: 'none', fontWeight: 600 }}
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
            sx={{ bgcolor: '#1653c7', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0d47a1' } }}
          >
            View Incident Detail
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

