import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@virtuenova.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#121212] text-white p-12 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 bg-white text-[#121212] flex items-center justify-center">
            <Sparkles size={15} />
          </span>
          <span className="font-display text-xl tracking-tight">VirtueNova</span>
        </div>
        <div>
          <p className="font-mono-vn text-[11px] uppercase tracking-widest text-[#0033FF] mb-4">
            AI Shopping Platform
          </p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight max-w-md">
            See it on you.<br />See it in your space.
          </h1>
          <p className="text-[#a3a3a3] mt-6 max-w-sm text-[15px] leading-relaxed">
            Virtual try-on for fashion and photoreal room visualization for furniture — with a live
            input-validation layer and honest, representative AI outputs.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/10">
          {["Try-On", "Room Studio", "AI Match"].map((t) => (
            <div key={t} className="bg-[#121212] p-4">
              <span className="font-mono-vn text-[10px] uppercase tracking-widest text-[#0033FF]">{t}</span>
            </div>
          ))}
        </div>
        <div className="vn-scan-line" style={{ top: "40%", opacity: 0.4 }} />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#F9F9F6]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="w-7 h-7 bg-[#121212] text-white flex items-center justify-center">
              <Sparkles size={15} />
            </span>
            <span className="font-display text-xl tracking-tight">VirtueNova</span>
          </div>

          <h2 className="font-display text-3xl tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-[#525252] mt-1 mb-8">
            {mode === "login"
              ? "Sign in to start visualizing."
              : "Join to try on fashion and stage your rooms."}
          </p>

          <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
            {mode === "register" && (
              <div>
                <label className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">Name</label>
                <input
                  data-testid="name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full bg-white border border-[#E5E5E5] px-3 py-2.5 text-sm outline-none focus:border-[#0033FF] focus:ring-1 focus:ring-[#0033FF]"
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">Email</label>
              <input
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full bg-white border border-[#E5E5E5] px-3 py-2.5 text-sm outline-none focus:border-[#0033FF] focus:ring-1 focus:ring-[#0033FF]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">Password</label>
              <input
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full bg-white border border-[#E5E5E5] px-3 py-2.5 text-sm outline-none focus:border-[#0033FF] focus:ring-1 focus:ring-[#0033FF]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p data-testid="auth-error" className="text-sm text-[#E05C3A]">{error}</p>
            )}

            <button
              data-testid="auth-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-[#121212] text-white py-3 text-sm font-medium hover:bg-[#0033FF] transition-colors disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-[#525252] mt-6">
            {mode === "login" ? "New to VirtueNova?" : "Already have an account?"}{" "}
            <button
              data-testid="toggle-auth-mode"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-[#0033FF] hover:underline font-medium"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <div className="mt-8 border border-[#E5E5E5] bg-white p-3">
            <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">
              Demo login · admin@virtuenova.com / admin123
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
