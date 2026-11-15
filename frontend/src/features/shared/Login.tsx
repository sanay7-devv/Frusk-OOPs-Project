import { ArrowForward, Visibility, VisibilityOff } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, IconButton, InputAdornment, TextField } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { login, PREDEFINED_ACCOUNTS, type PredefinedAccount } from '../../api/auth';
import { useAuth, HOME } from '../../auth/AuthContext';
import { errorMessage } from '../../utils/errors';
import ServicePoster from '../../components/ServicePoster';
import GoogleSignIn from '../../components/GoogleSignIn';
import mark from '../../assets/studio-mark.svg';

const schema = z.object({ email: z.string().email('Please enter a valid email address'), password: z.string().min(1, 'Password is required') });
type Values = z.infer<typeof schema>;
const DEMO_ACCOUNTS = PREDEFINED_ACCOUNTS.filter((account, index, accounts) => accounts.findIndex(item => item.roleLabel === account.roleLabel) === index);

export default function Login() {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const { user, workspace, signIn } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const onSubmit = handleSubmit(async values => {
    setErr('');
    try { const response = await login(values.email, values.password); const ws = signIn(response); navigate(ws ? HOME[ws] : '/', { replace: true }); }
    catch (error: unknown) { setErr(errorMessage(error)); }
  });
  useEffect(() => { if (user && workspace) navigate(HOME[workspace], { replace: true }); }, [user, workspace, navigate]);
  const choose = (account: PredefinedAccount) => {
    setSelected(account.email); setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true }); setErr('');
  };

  return <main className="auth-studio">
    <header className="auth-masthead"><Link to="/login" className="studio-brand" aria-label="Frusk service desk home"><img src={mark} alt="" /><div><strong>frusk.</strong><small>IT SERVICE MANAGEMENT</small></div></Link><div className="masthead-note">Incident management &amp; audit</div></header>
    <div className="auth-grid">
      <section className="auth-editorial" aria-labelledby="welcome-title"><div className="eyebrow"><span className="shape-dot" />FRUSK SERVICE PLATFORM</div><h1 id="welcome-title">IT service<br /><em>management.</em></h1><div className="auth-art-wrap"><ServicePoster /></div></section>
      <section className="auth-form-wrap" aria-labelledby="signin-title"><div className="eyebrow">WORKSPACE ACCESS</div><h2 className="auth-form-heading" id="signin-title">Sign in</h2><p className="auth-form-intro">Access your service workspace to report incidents, manage requests and review activity.</p>
        {user && workspace && <Alert severity="success" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate(HOME[workspace])}>Continue</Button>}>Signed in as {user.name}.</Alert>}
        <form onSubmit={onSubmit} noValidate aria-label="Sign in">
          <div><label className="field-label" htmlFor="signin-email">Email address</label><TextField id="signin-email" type="email" placeholder="you@yourcompany.com" fullWidth autoComplete="email" {...register('email', { onChange: () => setSelected('') })} error={!!errors.email} helperText={errors.email?.message} inputProps={{ 'aria-label': 'Email Address' }} /></div>
          <div><label className="field-label" htmlFor="signin-password">Password</label><TextField id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="Your password" fullWidth autoComplete="current-password" {...register('password', { onChange: () => setSelected('') })} error={!!errors.password} helperText={errors.password?.message} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} edge="end">{showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} /></div>
          {err && <Alert severity="error" role="alert">{err}</Alert>}
          <Button className="auth-submit" type="submit" variant="contained" fullWidth disabled={isSubmitting} endIcon={<ArrowForward />}>{isSubmitting ? 'Signing in…' : 'Sign in to your workspace'}</Button>
        </form>
        <GoogleSignIn onError={setErr} /><p className="auth-register-link">Need an account? <Link to="/register">Create an employee account ↗</Link></p>
        <div className="auth-demo"><div className="auth-demo-heading"><span>Demo workspaces</span><span>4 ROLES</span></div><div className="demo-roles">{DEMO_ACCOUNTS.map(account => <button className="demo-role" type="button" key={account.email} aria-pressed={selected === account.email} onClick={() => choose(account)}>{account.roleLabel}</button>)}</div><p className="demo-description">{selected ? PREDEFINED_ACCOUNTS.find(account => account.email === selected)?.description : 'Choose a role to fill the demo credentials, then sign in.'}</p><p className="auth-demo-note">Demo accounts open a sample workspace. For your own reports, use your organisation’s account.</p></div>
      </section>
    </div><footer className="auth-footer"><span>Frusk · IT service management</span><span>Incident reporting and operational audit</span><span className="footer-shapes" aria-hidden="true"><i /><i /><i /></span></footer>
  </main>;
}
