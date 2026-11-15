import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { googleLogin } from '../api/auth';
import { useAuth, HOME } from '../auth/AuthContext';
import { errorMessage } from '../utils/errors';

declare global { interface Window { google?: any } }

/** Keeps the team's GIS integration and its explicitly labelled demo-account fallback. */
export default function GoogleSignIn({ onError }: { onError: (message: string) => void }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const target = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoError, setDemoError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const configured = !!clientId && !clientId.includes('your-google-client-id');
  const exchange = async (token: string) => {
    onError('');
    try { const response = await googleLogin(token); const ws = signIn(response); navigate(ws ? HOME[ws] : '/', { replace: true }); }
    catch (error: unknown) { onError(errorMessage(error)); }
  };
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    const initialise = () => {
      if (!window.google?.accounts?.id || !target.current || cancelled) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: (response: { credential?: string }) => { if (response.credential && !cancelled) void exchange(response.credential); } });
      window.google.accounts.id.renderButton(target.current, { theme: 'outline', size: 'large', width: Math.min(380, target.current.clientWidth), text: 'signin_with' });
      setReady(true);
    };
    initialise();
    const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    script?.addEventListener('load', initialise);
    return () => { cancelled = true; script?.removeEventListener('load', initialise); };
  }, [clientId, configured, signIn, navigate, onError]);
  const demoSignIn = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setDemoError('Enter a valid email address.'); return; }
    setBusy(true); setDemoError('');
    const trimmed = email.trim().toLowerCase();
    const payload = { iss: 'https://accounts.google.com', sub: 'google-sub-' + Math.abs(trimmed.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)), email: trimmed, email_verified: true, name: trimmed.split('@')[0], exp: Math.floor(Date.now() / 1000) + 3600 };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await exchange('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.' + encoded + '.signature');
    setBusy(false); setOpen(false);
  };
  return <div className="studio-google"><div ref={target} />{!ready && <Button fullWidth variant="outlined" onClick={() => configured ? window.google?.accounts?.id?.prompt() : setOpen(true)} disabled={configured && !window.google?.accounts?.id}>{configured ? 'Sign in with Google' : 'Explore Google sign-in demo'}</Button>}
    <Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="xs" fullWidth><DialogTitle>Google sign-in demo</DialogTitle><DialogContent><p className="sample-note">Google credentials aren’t configured here. This uses the project’s existing demo flow. Use a fictional account to explore it.</p><TextField autoFocus fullWidth margin="normal" label="Demo email" type="email" value={email} onChange={event => setEmail(event.target.value)} />{demoError && <Alert severity="error">{demoError}</Alert>}</DialogContent><DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} variant="contained" onClick={() => void demoSignIn()}>{busy ? 'Opening…' : 'Continue demo'}</Button></DialogActions></Dialog>
  </div>;
}
