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
  Close as CloseIcon,
  AutoFixHigh as AutoFixHighIcon,
  GroupAdd as GroupAddIcon,
  VerifiedUser as VerifiedUserIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

import { getServices, getCategories } from '../../api/services';
import {
  createIncident,
  CreateIncidentPayload,
  uploadAttachment,
  getKnownOutages,
  joinProblem,
  priorityWhatIf,
} from '../../api/incidents';
import {
  suggestCategory,
  findSimilar,
  suggestIntake,
  chatReport,
  CategorySuggestion,
  SimilarIncident,
  Draft,
  ChatReply,
} from '../../api/intelligence';
import type { IncidentDetail, Priority } from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../utils/errors';

import { tokens } from '../../theme/theme';
import { alpha } from '@mui/material/styles';
// Form validation schema adhering to handbook rules
const reportSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  serviceId: z.number({ invalid_type_error: 'Please choose an affected service' }),
  categoryId: z.number().nullable().optional(),
  impact: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  affectedUsers: z.number().int().min(1, 'At least 1 user must be affected').max(1000000, 'Cannot exceed 1,000,000 users'),
  description: z
    .string()
    .min(20, 'Please provide at least 20 characters describing the outage')
    .max(5000, 'Description cannot exceed 5000 characters'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: string;
  type: 'log' | 'image' | 'doc';
}

const IMPACT_LEVELS = [
  { level: 1, title: 'Minor', desc: 'Isolated single-seat inconvenience.' },
  { level: 2, title: 'Moderate', desc: 'Small team workaround exists.' },
  { level: 3, title: 'Significant', desc: 'Entire office or core department slowed.' },
  { level: 4, title: 'Major', desc: 'Primary core revenue or payment loop degraded.' },
  { level: 5, title: 'Catastrophic', desc: 'Complete enterprise-wide total stoppage.' },
];

const URGENCY_LEVELS = [
  { level: 1, label: 'Low' },
  { level: 2, label: 'Medium' },
  { level: 3, label: 'High' },
  { level: 4, label: 'Critical' },
  { level: 5, label: 'Immediate' },
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

  // Chatbot intake assistant state (guide P3-11)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState<Draft | undefined>(undefined);
  const [chatExpecting, setChatExpecting] = useState<string | undefined>('DESCRIPTION');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; options?: Array<{ label: string; value: string }> }>>([
    {
      sender: 'bot',
      text: 'Hello! I can guide you through reporting this issue step-by-step. What seems to be the problem?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatReadyToFile, setChatReadyToFile] = useState(false);

  // Queries for services & categories
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: getServices });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
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

  // Real-time matrix calculation of fallback priority
  const calculatePriority = (imp: number, urg: number): Priority => {
    const score = imp * urg;
    if (score >= 16) return 'P1';
    if (score >= 9) return 'P2';
    if (score >= 4) return 'P3';
    return 'P4';
  };

  const priorityColorMap: Record<Priority, string> = {
    P1: tokens.danger,
    P2: tokens.warning,
    P3: tokens.info,
    P4: tokens.priority.P4,
  };

  const priorityLabelMap: Record<Priority, string> = {
    P1: 'P1 CRITICAL',
    P2: 'P2 HIGH',
    P3: 'P3 MEDIUM',
    P4: 'P4 LOW',
  };

  // Debounced AI Copilot calls when typing with stale guard
  useEffect(() => {
    let active = true;
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
        if (active && cat) setAiSuggestion(cat);

        if (active && watchServiceId) {
          const sim = await findSimilar({
            title: watchTitle || '',
            description: watchDescription || '',
            serviceId: watchServiceId,
          });
          if (active) {
            if (sim && sim.length > 0) setSimilarIncidents(sim);
            else setSimilarIncidents([]);
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (active) setAiLoading(false);
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [watchTitle, watchDescription, watchServiceId]);

  const handleDescriptionBlur = async () => {
    const desc = getValues('description');
    if (desc && desc.trim().length >= 20 && !getValues('categoryId')) {
      try {
        const intake = await suggestIntake(desc);
        if (intake.categoryId && !getValues('categoryId')) {
          setValue('categoryId', intake.categoryId, { shouldValidate: true });
        }
        if (intake.impact) {
          setValue('impact', intake.impact, { shouldValidate: true });
        }
        if (intake.urgency) {
          setValue('urgency', intake.urgency, { shouldValidate: true });
        }
      } catch {
        // Handled silently
      }
    }
  };

  const applyAiRecommendations = () => {
    if (aiSuggestion?.categoryId) {
      setValue('categoryId', aiSuggestion.categoryId, { shouldValidate: true });
      toast('Applied AI category recommendation to form.', 'info');
    }
  };

  const { data: knownOutages = [] } = useQuery({
    queryKey: ['known-outages', watchServiceId],
    queryFn: () => getKnownOutages(watchServiceId),
    enabled: !!watchServiceId,
  });

  const { data: whatIfData } = useQuery({
    queryKey: ['priority-whatif', watchServiceId, watch('categoryId'), watchImpact, watchUrgency, watchAffectedUsers],
    queryFn: () =>
      priorityWhatIf({
        serviceId: watchServiceId,
        categoryId: watch('categoryId') ?? undefined,
        impact: watchImpact,
        urgency: watchUrgency,
        affectedUsers: watchAffectedUsers,
      }),
    enabled: !!watchServiceId,
  });

  const calculatedPriority = whatIfData?.whatIf?.priority || calculatePriority(watchImpact, watchUrgency);

  const processFiles = (files: FileList | File[]) => {
    const allowedExts = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'log'];
    if (!files || files.length === 0) return;
    if (attachedFiles.length + files.length > 10) {
      toast('Maximum 10 attachments allowed per incident.', 'error');
      return;
    }
    const toAdd: AttachedFile[] = [];
    for (const f of Array.from(files)) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExts.includes(ext)) {
        toast(`Unsupported format: ${f.name}. Allowed: ${allowedExts.join(', ')}`, 'error');
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast(`File exceeds 5 MB: ${f.name}`, 'error');
        continue;
      }
      toAdd.push({
        id: Math.random().toString(36).substring(7),
        file: f,
        name: f.name,
        size: `${(f.size / 1024).toFixed(0)} KB`,
        type: ['png', 'jpg', 'jpeg', 'gif'].includes(ext) ? 'image' : 'log',
      });
    }
    if (toAdd.length > 0) {
      setAttachedFiles((prev) => [...prev, ...toAdd]);
      toast(`Attached ${toAdd.length} file(s).`, 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
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

      if (attachedFiles.length > 0) {
        for (const f of attachedFiles) {
          try {
            await uploadAttachment(result.id, f.file);
          } catch {
            toast(`Failed to upload attachment ${f.name}`, 'warning');
          }
        }
      }

      setCreatedIncident(result);
      reset();
      setAttachedFiles([]);
      toast('Incident submitted successfully.', 'success');
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.response?.data?.code === 'DUPLICATE_INCIDENT') {
        const returnedSimilar = err?.response?.data?.similar || [];
        if (returnedSimilar.length > 0) {
          const mappedSimilar = returnedSimilar.map((s: any) => ({
            ...s,
            incidentId: s.incidentId || s.id,
          }));
          setSimilarIncidents(mappedSimilar);
        }
        setDuplicateModalOpen(true);
      } else if (err?.response?.status === 400 && err?.response?.data?.fieldErrors?.length) {
        for (const fe of err.response.data.fieldErrors) {
          setError(fe.field as any, { message: fe.message });
        }
        toast('Please resolve the field validation errors indicated below.', 'error');
      } else {
        toast(errorMessage(err), 'error');
      }
    }
  };

  const handleSendChatMessage = async (msgText: string) => {
    if (!msgText.trim()) return;
    setChatMessages((prev) => [...prev, { sender: 'user', text: msgText }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await chatReport({
        answer: msgText,
        draft: chatDraft,
        expecting: chatExpecting,
      });
      setChatDraft(res.draft);
      setChatExpecting(res.expecting);
      setChatReadyToFile(res.readyToFile);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: res.message,
          options: res.options,
        },
      ]);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const handleApplyChatDraft = () => {
    if (!chatDraft) return;
    if (chatDraft.title) setValue('title', chatDraft.title, { shouldValidate: true });
    if (chatDraft.description) setValue('description', chatDraft.description, { shouldValidate: true });
    if (chatDraft.serviceId) setValue('serviceId', chatDraft.serviceId, { shouldValidate: true });
    if (chatDraft.categoryId) setValue('categoryId', chatDraft.categoryId, { shouldValidate: true });
    if (chatDraft.impact) setValue('impact', chatDraft.impact, { shouldValidate: true });
    if (chatDraft.urgency) setValue('urgency', chatDraft.urgency, { shouldValidate: true });
    if (chatDraft.affectedUsers) setValue('affectedUsers', chatDraft.affectedUsers, { shouldValidate: true });
    setChatOpen(false);
    toast('Draft populated into the report form.', 'success');
  };

  const handleDiscard = () => {
    if (watchTitle || watchDescription) {
      if (window.confirm('Discard unsaved incident report?')) {
        reset();
        setAttachedFiles([]);
        navigate('/employee/home');
      }
    } else {
      navigate('/employee/home');
    }
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      {/* Top Breadcrumb & Page Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', color: tokens.secondaryLight, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate('/employee/home')}
          >
            <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
            Home
          </Link>
          <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 13, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>
            Report Incident
          </Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: tokens.white, letterSpacing: '-0.02em' }}>
              Report an Operational Issue or Outage
            </Typography>
            <Typography sx={{ color: tokens.onSurfaceVariant, mt: 0.5, maxWidth: 840, fontSize: 14, fontFamily: 'Geist, sans-serif' }}>
              Submit downtime, authentication barriers, or service degradation to open a new incident.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={() => setChatOpen(true)}
            startIcon={<SmartToyIcon sx={{ color: tokens.secondaryLight }} />}
            sx={{
              borderColor: alpha(tokens.secondary, 0.4),
              color: tokens.secondaryLight,
              bgcolor: alpha(tokens.secondary, 0.1),
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: '8px',
              px: 2,
              py: 0.8,
              '&:hover': { bgcolor: alpha(tokens.secondary, 0.18) },
            }}
          >
            Guided Chat Assistant
          </Button>
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
              border: `1px solid ${tokens.outlineVariant}`,
              bgcolor: tokens.paper,
              boxShadow: `0 8px 32px ${alpha(tokens.black, 0.4)}`,
            }}
          >
            {knownOutages.length > 0 && (
              <Alert
                severity="warning"
                sx={{
                  mb: 3,
                  bgcolor: alpha(tokens.warning, 0.1),
                  border: `1px solid ${alpha(tokens.warning, 0.3)}`,
                  color: tokens.warning,
                  borderRadius: '10px',
                }}
                action={
                  <Button
                    color="warning"
                    size="small"
                    variant="contained"
                    onClick={async () => {
                      try {
                        const joined = await joinProblem(knownOutages[0].problemId);
                        toast('Successfully joined known outage ticket.', 'success');
                        navigate(`/employee/incidents/${joined.id}`);
                      } catch (err: any) {
                        toast(err?.response?.data?.message || 'Failed to join outage', 'error');
                      }
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Join Outage ({knownOutages[0].leadCode})
                  </Button>
                }
              >
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                  Known Outage in Progress: {knownOutages[0].title}
                </Typography>
                <Typography sx={{ fontSize: 12, color: tokens.orangePale, mt: 0.5 }}>
                  This service has an active outage ({knownOutages[0].leadPriority}) with {knownOutages[0].affectedUsers} affected users reported. Join the existing outage ticket to receive resolution updates.
                </Typography>
              </Alert>
            )}

            {/* SECTION 1: Core Parameters */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditNoteIcon sx={{ color: tokens.secondaryLight, fontSize: 20 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: tokens.secondaryLight, textTransform: 'uppercase' }}>
                    01. Core Incident Parameters
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.textDisabled }}>
                  * Mandatory for escalation routing
                </Typography>
              </Box>

              {/* Title Input */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.onSurface }}>
                    Incident Title
                  </Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.textDisabled }}>
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
                    bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
                    borderRadius: '8px',
                  }}
                />
              </Box>

              {/* Service & Category Selectors */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.onSurface, mb: 0.8 }}>
                    Affected Service <span style={{ color: tokens.danger }}>*</span>
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
                          sx={{ bgcolor: alpha(tokens.surfaceContainerLow, 0.7), borderRadius: '8px' }}
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
                  <Typography sx={{ fontSize: 12, color: tokens.textDisabled, mt: 0.5 }}>
                    Select the degraded customer-facing service
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.onSurface, mb: 0.8 }}>
                    Problem Category
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
                          sx={{ bgcolor: alpha(tokens.surfaceContainerLow, 0.7), borderRadius: '8px' }}
                        >
                          <MenuItem value="">
                            <em>Let the system decide (Auto-suggest)</em>
                          </MenuItem>
                          {categories.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Typography sx={{ fontSize: 12, color: tokens.textDisabled, mt: 0.5 }}>
                    Used to determine initial responder rota
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3, borderColor: tokens.borderSubtle }} />

            {/* SECTION 2: Severity Metrics & Blast Radius */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EqualizerIcon sx={{ color: tokens.secondaryLight, fontSize: 20 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: tokens.secondaryLight, textTransform: 'uppercase' }}>
                    02. Severity Metrics &amp; Blast Radius
                  </Typography>
                </Box>
                <Chip
                  label={`SLA Matrix: ${priorityLabelMap[calculatedPriority]}`}
                  size="small"
                  sx={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
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
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.onSurface }}>
                    Impact Level (Scope of Operational Impairment)
                  </Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: tokens.secondaryLight }}>
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
                                ? alpha(tokens.danger, 0.25)
                                : `linear-gradient(135deg, ${alpha(tokens.primary, 0.3)} 0%, ${alpha(tokens.secondary, 0.2)} 100%)`
                              : alpha(tokens.surfaceContainerLow, 0.6),
                            color: isSelected ? tokens.white : tokens.onSurfaceVariant,
                            border: isSelected
                              ? `1px solid ${isCatastrophic ? '${tokens.danger}' : '${tokens.secondary}'}`
                              : `1px solid ${tokens.outlineVariant}`,
                            boxShadow: isSelected
                              ? `0 0 16px ${isCatastrophic ? '${alpha(tokens.danger, 0.35)}' : '${alpha(tokens.secondary, 0.3)}'}`
                              : 'none',
                            '&:hover': {
                              borderColor: isSelected ? undefined : alpha(tokens.primary, 0.4),
                              bgcolor: isSelected ? undefined : alpha(tokens.primary, 0.08),
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: isSelected ? tokens.secondaryLight : tokens.textDisabled }}>
                              LVL {item.level}
                            </Typography>
                            {isSelected && <CheckCircleIcon sx={{ fontSize: 16, color: tokens.secondaryLight }} />}
                          </Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: isSelected ? tokens.white : tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>
                            {item.title}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 12,
                              lineHeight: 1.3,
                              color: isSelected ? tokens.onSurface : tokens.textDisabled,
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
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.onSurface }}>
                      Urgency Level (Time Sensitivity)
                    </Typography>
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: tokens.secondaryLight }}>
                      Selected: {watchUrgency} ({URGENCY_LEVELS.find((u) => u.level === watchUrgency)?.label})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      bgcolor: alpha(tokens.surfaceContainerLow, 0.8),
                      p: 0.5,
                      borderRadius: '8px',
                      border: `1px solid ${tokens.outlineVariant}`,
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
                                ? alpha(tokens.danger, 0.3)
                                : `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`
                              : 'transparent',
                            color: isSelected ? tokens.white : isImmed ? tokens.danger : tokens.onSurfaceVariant,
                            boxShadow: isSelected ? `0 0 12px ${alpha(tokens.primary, 0.35)}` : 'none',
                            '&:hover': {
                              bgcolor: isSelected ? undefined : tokens.hover,
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
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.onSurface, mb: 1 }}>
                    Estimated Affected Users
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: alpha(tokens.surfaceContainerLow, 0.8),
                      borderRadius: '8px',
                      border: `1px solid ${tokens.outlineVariant}`,
                      p: 0.5,
                    }}
                  >
                    <IconButton aria-label="Decrease affected users"
                      size="small"
                      onClick={() => setValue('affectedUsers', Math.max(1, (watchAffectedUsers || 1) - 1))}
                      sx={{ color: tokens.onSurfaceVariant }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      variant="standard"
                      type="number"
                      value={watchAffectedUsers}
                      onChange={(e) => setValue('affectedUsers', Math.max(1, parseInt(e.target.value) || 1))}
                      InputProps={{ disableUnderline: true }}
                      inputProps={{ min: 1, style: { textAlign: 'center', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: tokens.onSurface } }}
                      sx={{ flexGrow: 1 }}
                    />
                    <IconButton aria-label="Increase affected users"
                      size="small"
                      onClick={() => setValue('affectedUsers', (watchAffectedUsers || 0) + 1)}
                      sx={{ color: tokens.onSurfaceVariant }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3, borderColor: tokens.borderSubtle }} />

            {/* SECTION 3: Detailed Telemetry & Narrative */}
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SubjectIcon sx={{ color: tokens.secondaryLight, fontSize: 20 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: tokens.secondaryLight, textTransform: 'uppercase' }}>
                    03. Detailed Telemetry &amp; Narrative
                  </Typography>
                </Box>
              </Box>

              {/* Textarea with Formatting Toolbar */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.onSurface }}>
                    Detailed Description
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                    Markdown &amp; Stack Traces supported
                  </Typography>
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    border: `1px solid ${alpha(tokens.white, 0.1)}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    bgcolor: alpha(tokens.surfaceContainerLow, 0.8),
                    '&:focus-within': { borderColor: tokens.secondary, boxShadow: `0 0 12px ${alpha(tokens.secondary, 0.2)}` },
                  }}
                >
                  {/* Textarea */}
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    placeholder="Describe exact error messages, timeline, steps to reproduce, and impact on operations..."
                    {...register('description', {
                      onBlur: handleDescriptionBlur,
                    })}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    InputProps={{ disableUnderline: true }}
                    variant="standard"
                    sx={{
                      p: 1.5,
                      '& .MuiInputBase-root': { fontSize: 13, lineHeight: 1.6, color: tokens.onSurface, fontFamily: 'Geist, sans-serif' },
                    }}
                  />
                </Paper>
              </Box>

              {/* Diagnostic Evidence & Logs (Drag and Drop Zone) */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.onSurface }}>
                    Diagnostic Evidence &amp; Logs
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                    Max file size 5MB each (PNG, JPG, LOG, HAR)
                  </Typography>
                </Box>

                <Paper
                  elevation={0}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleFileDrop}
                  sx={{
                    p: 3,
                    borderRadius: '12px',
                    border: `1.5px dashed ${alpha(tokens.white, 0.15)}`,
                    bgcolor: alpha(tokens.surfaceContainerLow, 0.6),
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: alpha(tokens.primary, 0.08), borderColor: tokens.primary },
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    multiple
                    accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.log"
                    onChange={handleFileUpload}
                  />
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: alpha(tokens.secondary, 0.15),
                      color: tokens.secondaryLight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1.5,
                      boxShadow: `0 0 16px ${alpha(tokens.secondary, 0.2)}`,
                    }}
                  >
                    <UploadFileIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.white }}>
                    <span style={{ color: tokens.secondaryLight }}>Click to browse</span> or drag files here
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 0.5 }}>
                    Supported formats: PNG, JPG, GIF, PDF, TXT, LOG (Max 5 MB per file, max 10 files)
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
                              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: tokens.onSurface }}>{f.name}</Typography>
                              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>({f.size})</Typography>
                            </Box>
                          }
                          onDelete={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          deleteIcon={<CloseIcon fontSize="small" />}
                          sx={{
                            bgcolor: alpha(tokens.surfaceContainerLow, 0.9),
                            border: `1px solid ${alpha(tokens.white, 0.1)}`,
                            borderRadius: '6px',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>

            <Divider sx={{ my: 3, borderColor: tokens.borderSubtle }} />

            {/* Form Footer Action Bar */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tokens.onSurfaceVariant }}>
                <VerifiedUserIcon sx={{ fontSize: 18, color: tokens.secondary }} />
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                  Standard ITIL incident intake &amp; routing
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={handleDiscard}
                  sx={{
                    borderRadius: '8px',
                    borderColor: tokens.border,
                    color: tokens.onSurfaceVariant,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { borderColor: alpha(tokens.white, 0.25), bgcolor: tokens.hover, color: tokens.onSurface },
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
                    background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
                    color: tokens.white,
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 700,
                    boxShadow: `0 0 20px ${alpha(tokens.primary, 0.4)}`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${tokens.primaryStrong} 0%, ${tokens.secondaryStrong} 100%)`,
                      boxShadow: `0 0 28px ${alpha(tokens.secondary, 0.55)}`,
                    },
                  }}
                >
                  {isSubmitting ? 'Submitting...' : '+ Submit Incident Ticket'}
                </Button>
              </Stack>
            </Box>
          </Paper>

        </Grid>

        {/* RIGHT COLUMN: AI Intake Suggestions */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ position: { lg: 'sticky' }, top: 80, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Suggestions Header Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '16px',
                border: `1px solid ${alpha(tokens.primary, 0.35)}`,
                background: `linear-gradient(135deg, ${alpha(tokens.primary, 0.15)} 0%, ${alpha(tokens.secondary, 0.1)} 100%)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: `0 4px 20px ${alpha(tokens.primary, 0.15)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    bgcolor: tokens.primary,
                    color: tokens.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 12px ${alpha(tokens.primary, 0.5)}`,
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.white, fontFamily: 'Sora, sans-serif' }}>
                      AI Intake Assistant
                    </Typography>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tokens.secondary, boxShadow: `0 0 6px ${tokens.secondary}` }} />
                  </Box>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.secondaryLight }}>
                    Real-time Suggestions
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* AI Suggested Classification Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: `1px solid ${tokens.outlineVariant}`,
                bgcolor: tokens.paper,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                boxShadow: `0 4px 20px ${alpha(tokens.black, 0.3)}`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <PsychologyIcon sx={{ color: tokens.primaryLight, fontSize: 18 }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: tokens.primaryLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Suggested Classification
                  </Typography>
                </Box>
                {aiSuggestion?.categoryId != null && (
                  <Chip
                    label={aiLoading ? 'Analyzing...' : `${Math.round((aiSuggestion.confidence || 0) * 100)}% confidence`}
                    size="small"
                    sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, bgcolor: alpha(tokens.success, 0.15), color: tokens.successLight, border: `1px solid ${alpha(tokens.success, 0.3)}` }}
                  />
                )}
              </Box>

              {aiSuggestion && aiSuggestion.categoryId != null ? (
                <>
                  {/* Classification Metric Box */}
                  <Box sx={{ bgcolor: alpha(tokens.surfaceContainerLow, 0.7), p: 2, borderRadius: '10px', border: `1px solid ${tokens.borderSubtle}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Category Match:</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.secondaryLight }}>
                        {aiSuggestion.categoryName}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Source:</Typography>
                      <Chip
                        label={(aiSuggestion as any).source || 'AI'}
                        size="small"
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          fontSize: 12,
                          height: 20,
                          bgcolor: alpha(tokens.primary, 0.2),
                          color: tokens.primaryLight,
                        }}
                      />
                    </Box>

                    {/* Confidence Bar */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.textDisabled }}>Model Alignment</Typography>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.textDisabled }}>
                          {(aiSuggestion.confidence || 0).toFixed(2)} / 1.00
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(aiSuggestion.confidence || 0) * 100}
                        sx={{ height: 5, borderRadius: '3px', bgcolor: tokens.outlineVariant, '& .MuiLinearProgress-bar': { bgcolor: tokens.secondary } }}
                      />
                    </Box>
                  </Box>

                  {aiSuggestion.reason && (
                    <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, lineHeight: 1.4, fontFamily: 'Geist, sans-serif' }}>
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
                      borderColor: alpha(tokens.primary, 0.4),
                      bgcolor: alpha(tokens.primary, 0.1),
                      color: tokens.primaryLight,
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': { bgcolor: alpha(tokens.primary, 0.2), borderColor: tokens.primary, color: tokens.white },
                    }}
                  >
                    Apply Suggested Category
                  </Button>
                </>
              ) : (
                <Box sx={{ py: 3, px: 1, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant, lineHeight: 1.5 }}>
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
                  border: `1px solid ${alpha(tokens.amber, 0.4)}`,
                  bgcolor: alpha(tokens.amber, 0.08),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tokens.warningLight }}>
                  <WarningIcon sx={{ fontSize: 20, color: tokens.warning }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                    Potential Duplicate Outage
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: tokens.warningLight, fontWeight: 500 }}>
                  {similarIncidents.length} similar active incident{similarIncidents.length > 1 ? 's' : ''} found:
                </Typography>

                {similarIncidents.slice(0, 2).map((item, idx) => (
                  <Paper
                    key={item.incidentId}
                    elevation={0}
                    onClick={() => {
                      if (item.incidentId) navigate(`/employee/incidents/${item.incidentId}`);
                    }}
                    sx={{
                      cursor: 'pointer',
                      p: 1.5,
                      borderRadius: '8px',
                      bgcolor: idx === 0 ? alpha(tokens.surfaceContainerLow, 0.8) : alpha(tokens.surfaceContainerLow, 0.5),
                      border: `1px solid ${alpha(tokens.amber, 0.25)}`,
                      '&:hover': { borderColor: tokens.amberDark },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: tokens.secondaryLight }}>
                        {item.code}
                      </Typography>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.warning }}>
                        {Math.round(item.similarity * 100)}% match
                      </Typography>
                    </Box>
                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: tokens.onSurface }}>
                      &ldquo;{item.title}&rdquo;
                    </Typography>
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
                    bgcolor: tokens.amberDark,
                    color: tokens.white,
                    fontWeight: 700,
                    textTransform: 'none',
                    '&:hover': { bgcolor: tokens.warningDark },
                  }}
                >
                  View &amp; Join Existing Ticket
                </Button>
              </Paper>
            )}
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
            bgcolor: tokens.surfaceContainerLow,
            border: `1px solid ${alpha(tokens.amber, 0.4)}`,
            p: 1,
            boxShadow: `0 24px 64px ${alpha(tokens.black, 0.8)}`,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: tokens.warningLight, fontFamily: 'Sora, sans-serif' }}>
          <WarningIcon sx={{ color: tokens.warning }} />
          Potential Duplicate Incident Found
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px', bgcolor: alpha(tokens.amber, 0.12), color: tokens.amberPale, border: `1px solid ${alpha(tokens.amber, 0.3)}` }}>
            A similar active incident is already being resolved by engineers. To avoid duplicated work, you can join the existing ticket to receive status updates.
          </Alert>

          {similarIncidents.map((sim) => (
            <Paper key={sim.incidentId} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: '10px', bgcolor: alpha(tokens.surfaceContainerLow, 0.8), borderColor: tokens.outlineVariant }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: tokens.secondaryLight }}>
                  {sim.code}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {sim.match && (
                    <Chip
                      label={sim.match === 'DUPLICATE' ? 'Likely Duplicate' : 'Related'}
                      size="small"
                      sx={{
                        fontSize: 12,
                        bgcolor: sim.match === 'DUPLICATE' ? alpha(tokens.danger, 0.2) : alpha(tokens.primary, 0.2),
                        color: sim.match === 'DUPLICATE' ? tokens.danger : tokens.primaryLight,
                      }}
                    />
                  )}
                  <Chip label={`${Math.round(sim.similarity * 100)}% match`} size="small" sx={{ bgcolor: alpha(tokens.amber, 0.2), color: tokens.warningLight }} />
                </Box>
              </Box>
              <Typography sx={{ fontWeight: 600, mt: 0.5, color: tokens.onSurface }}>{sim.title}</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 0.5 }}>
                Status: {sim.status} • Active Engineering Remediation
              </Typography>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setDuplicateModalOpen(false);
              if (similarIncidents.length > 0 && similarIncidents[0].incidentId) {
                navigate(`/employee/incidents/${similarIncidents[0].incidentId}`);
              } else {
                navigate('/employee/incidents');
              }
            }}
            variant="contained"
            sx={{ bgcolor: tokens.amberDark, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: tokens.warningDark } }}
          >
            View Existing Ticket
          </Button>
          <Button
            onClick={() => {
              setDuplicateModalOpen(false);
              handleSubmit((data) => onSubmit(data, true))();
            }}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: alpha(tokens.white, 0.15), color: tokens.onSurface }}
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
            bgcolor: tokens.surfaceContainerLow,
            border: `1px solid ${alpha(tokens.white, 0.1)}`,
            p: 1,
            boxShadow: `0 24px 64px ${alpha(tokens.black, 0.8)}, 0 0 24px ${alpha(tokens.primary, 0.2)}`,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: tokens.white, fontFamily: 'Sora, sans-serif' }}>
          <CheckCircleIcon sx={{ color: tokens.success, fontSize: 26 }} />
          Incident Reported Successfully
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
          {createdIncident && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="success" sx={{ borderRadius: '8px', bgcolor: alpha(tokens.success, 0.15), color: tokens.successLight, border: `1px solid ${alpha(tokens.success, 0.3)}` }}>
                Your incident was categorized, prioritized, and queued for technician triage.
              </Alert>

              <Box sx={{ bgcolor: alpha(tokens.surfaceContainerLow, 0.8), p: 2.5, borderRadius: '10px', border: `1px solid ${tokens.outlineVariant}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Incident Code:</Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: tokens.secondaryLight }}>
                    {createdIncident.code}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Assigned Priority:</Typography>
                  <PriorityBadge priority={createdIncident.priority} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Assigned Service:</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.onSurface }}>{createdIncident.service.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Assignee:</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.onSurface }}>{createdIncident.assignee?.name || 'Unassigned (Triage Dispatch Queue)'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Target SLA Resolution:</Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: tokens.success }}>
                    {createdIncident.resolutionDue
                      ? new Date(createdIncident.resolutionDue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Scheduled according to SLA policy'}
                  </Typography>
                </Box>
              </Box>

              {createdIncident.priorityBreakdown && (
                <Box sx={{ p: 2, bgcolor: alpha(tokens.white, 0.03), borderRadius: '10px', border: `1px solid ${tokens.borderSubtle}` }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: tokens.primaryLight, mb: 0.5 }}>
                    Why this priority?
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
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
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: alpha(tokens.white, 0.15), color: tokens.onSurface }}
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
              background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
              color: tokens.white,
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            View Incident Detail
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 3: Conversational Chat Intake Assistant (guide P3-11) */}
      <Dialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: tokens.surfaceContainerLow,
            border: `1px solid ${alpha(tokens.secondary, 0.4)}`,
            boxShadow: `0 24px 64px ${alpha(tokens.black, 0.8)}`,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon sx={{ color: tokens.secondaryLight, fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: tokens.white, fontFamily: 'Sora, sans-serif', fontSize: 16 }}>
              Guided Intake Assistant
            </Typography>
          </Box>
          <IconButton aria-label="Close assistant chat" size="small" onClick={() => setChatOpen(false)} sx={{ color: tokens.onSurfaceVariant }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant, p: 2 }}>
          {/* Messages Stream */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
            {chatMessages.map((m, idx) => (
              <Box
                key={idx}
                sx={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    bgcolor: m.sender === 'user' ? tokens.primary : alpha(tokens.surfaceContainerLow, 0.9),
                    border: m.sender === 'user' ? 'none' : `1px solid ${alpha(tokens.white, 0.1)}`,
                    color: tokens.white,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {m.text}
                </Box>
                {/* Option Chips */}
                {m.options && m.options.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1 }}>
                    {m.options.map((opt) => (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        size="small"
                        onClick={() => handleSendChatMessage(opt.label)}
                        sx={{
                          bgcolor: alpha(tokens.secondary, 0.15),
                          color: tokens.secondaryLight,
                          border: `1px solid ${alpha(tokens.secondary, 0.3)}`,
                          cursor: 'pointer',
                          fontSize: 12,
                          '&:hover': { bgcolor: alpha(tokens.secondary, 0.28) },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
            {chatLoading && (
              <Box sx={{ alignSelf: 'flex-start', p: 1.5, bgcolor: alpha(tokens.surfaceContainerLow, 0.9), borderRadius: '12px 12px 12px 2px', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={14} sx={{ color: tokens.secondaryLight }} />
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Analyzing response...</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Chat text input */}
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type your message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage(chatInput);
                }
              }}
              sx={{
                bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(tokens.white, 0.15) },
              }}
            />
            <Button
              variant="contained"
              disabled={!chatInput.trim() || chatLoading}
              onClick={() => handleSendChatMessage(chatInput)}
              sx={{
                bgcolor: tokens.secondary,
                color: tokens.white,
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                '&:hover': { bgcolor: tokens.secondaryStrong },
              }}
            >
              Send
            </Button>
          </Box>

          {/* Action to apply draft to form */}
          {chatDraft && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pt: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                {chatReadyToFile ? 'Draft is complete and ready to apply!' : 'Draft partially generated.'}
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handleApplyChatDraft}
                sx={{
                  background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
                  color: tokens.white,
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: 'none',
                }}
              >
                Apply Draft to Form
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
