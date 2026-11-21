import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Command, LockKeyhole, Mail, Package } from "lucide-react";
import { useAuth } from "../services/auth.js";
import Alert from "../components/Alert.js";

export default function LoginPage() {
  const { user, login, register, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!loading && user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      if (mode === "register") await register({ name, email, password });
      else await login({ email, password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="auth-brand"><span className="brand-mark"><Command size={19} /></span> stockroom<span>.</span></div>
        <div className="auth-copy">
          <div className="auth-eyebrow"><span /> INVENTORY, IN SYNC</div>
          <h1>A clearer view<br />of your <em>business.</em></h1>
          <p>One calm place to track products, keep stock moving, and understand what’s next.</p>
        </div>
        <div className="auth-illustration">
          <div className="floating-card float-card-top"><span className="mini-icon mint"><Package size={16} /></span><div><b>Stock levels healthy</b><small>Updated just now</small></div><i /></div>
          <div className="illustration-box"><div className="box-top" /><div className="box-front"><div /><div /></div><div className="box-side" /></div>
          <div className="floating-card float-card-bottom"><span className="mini-icon violet"><ArrowRight size={16} /></span><div><b>Ready for what’s next</b><small>Inventory insights</small></div></div>
        </div>
        <div className="auth-footer"><span>Inventory management, made simple.</span><span>© 2025 Stockroom</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand"><span className="brand-mark"><Command size={18} /></span> stockroom<span>.</span></div>
          <div className="auth-heading">
            <div className="auth-overline">WELCOME {mode === "login" ? "BACK" : "ABOARD"}</div>
            <h2>{mode === "login" ? "Sign in to your account" : "Create your account"}</h2>
            <p>{mode === "login" ? "Enter your details to access your workspace." : "Create a staff account to get started."}</p>
          </div>
          <Alert message={error} />
          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <label className="field">
                <span>Full name</span><div className="input-icon"><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" minLength="2" maxLength="100" required /></div>
              </label>
            )}
            <label className="field">
              <span>Email address</span><div className="input-icon"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></div>
            </label>
            <label className="field">
              <span>Password</span><div className="input-icon"><LockKeyhole size={17} /><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" minLength={mode === "register" ? 10 : 1} required /></div>
            </label>
            <button type="submit" className="button button-primary auth-submit" disabled={working}>
              {working ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17} />
            </button>
          </form>
          {mode === "login" && <div className="demo-login"><strong>Demo admin</strong><span>admin@inventory.local</span><span>Inventory123!</span></div>}
          <div className="auth-switch">
            {mode === "login" ? "New to Stockroom?" : "Already have an account?"}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
          <div className="auth-terms">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</div>
        </div>
      </section>
    </main>
  );
}
