import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Shield, Activity, Bug, Code2 } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@/types';
import { ROLE_LABELS } from '@/types';

export default function LoginPage() {
  const { users, setCurrentUser } = useUserStore();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<User | null>(users[0]);
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    if (!selected) return;
    setLoading(true);
    setCurrentUser(selected);
    setTimeout(() => navigate('/dashboard'), 600);
  }

  return (
    <div className="min-h-screen bg-bg-base bg-mesh-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-glow rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-critical/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-glow rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-4 shadow-glow-brand">
            <Code2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">QA Platform</h1>
          <p className="text-sm text-text-muted mt-1">Software QA & Bug Tracker</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { icon: Bug,      label: 'Bugs Tracked', value: '25+' },
            { icon: Activity, label: 'Projects',      value: '4' },
            { icon: Shield,   label: 'QA Verified',   value: '12' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="card p-3 text-center">
              <Icon size={16} className="text-brand mx-auto mb-1" />
              <div className="text-base font-bold text-text-primary">{value}</div>
              <div className="text-[9px] text-text-muted">{label}</div>
            </div>
          ))}
        </div>

        {/* Login Card */}
        <div className="card p-6 space-y-5">
          <div>
            <label className="label">Select Your Profile</label>
            <div className="space-y-2 mt-2">
              {users.map(user => (
                <button
                  key={user.id}
                  id={`login-user-${user.id}`}
                  onClick={() => setSelected(user)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 text-left ${
                    selected?.id === user.id
                      ? 'border-brand bg-brand-glow'
                      : 'border-bg-border bg-bg-base hover:border-bg-hover hover:bg-bg-muted'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: user.color + '30', color: user.color, border: `2px solid ${user.color}40` }}
                  >
                    {user.initials}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-text-primary">{user.name}</div>
                    <div className="text-xs text-text-muted">{ROLE_LABELS[user.role]} · {user.department}</div>
                  </div>
                  {selected?.id === user.id && (
                    <div className="w-2 h-2 rounded-full bg-brand" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            id="login-submit"
            onClick={handleLogin}
            disabled={!selected || loading}
            className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Enter as {selected ? ROLE_LABELS[selected.role] : '...'} <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-text-disabled mt-4">
          This is a demo system. No authentication required.
        </p>
      </motion.div>
    </div>
  );
}
