import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

const API = 'http://localhost:3001/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Job {
  id: string;
  userId: string;
  text: string;
  status: JobStatus;
  characterCount: number;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  id: string;
  email: string;
  currentUsage: number;
  subscription?: {
    plan: string;
    monthlyQuota: number;
    remaining: number;
  };
}

// ─── API client ───────────────────────────────────────────────────────────────

const apiClient = {
  async createJob(userId: string, text: string, idempotencyKey?: string): Promise<Job> {
    const res = await fetch(`${API}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, text, idempotencyKey }),
    });
    const body = await res.json() as { success: boolean; data: Job; error?: string };
    if (!body.success) throw new Error(body.error ?? 'Failed to create job');
    return body.data;
  },

  async getJobs(userId: string): Promise<Job[]> {
    const res = await fetch(`${API}/jobs?userId=${encodeURIComponent(userId)}`);
    const body = await res.json() as { success: boolean; results?: Job[]; jobs?: Job[] };
    // BUG: looks for `results` but the API returns `jobs` — always gets undefined → []
    return body.results ?? [];
  },

  async getJob(id: string): Promise<Job> {
    const res = await fetch(`${API}/jobs/${id}`);
    const body = await res.json() as { success: boolean; data: Job };
    return body.data;
  },

  async getUser(userId: string): Promise<UserProfile> {
    const res = await fetch(`${API}/users/${userId}`);
    const body = await res.json() as { success: boolean; data: UserProfile };
    return body.data;
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusPill({ status }: { status: JobStatus }) {
  const palette: Record<JobStatus, { bg: string; fg: string }> = {
    pending:    { bg: '#fef3c7', fg: '#92400e' },
    processing: { bg: '#dbeafe', fg: '#1e40af' },
    completed:  { bg: '#d1fae5', fg: '#065f46' },
    failed:     { bg: '#fee2e2', fg: '#991b1b' },
  };
  const { bg, fg } = palette[status];
  return (
    <span style={{
      background: bg, color: fg,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {status}
    </span>
  );
}

function UsageMeter({ used, quota }: { used: number; quota: number }) {
  const pct = Math.min((used / quota) * 100, 100);
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
        <span style={{ color: '#6b7280' }}>Monthly usage</span>
        <span style={{ fontWeight: 600 }}>{used.toLocaleString()} / {quota.toLocaleString()} chars</span>
      </div>
      <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [userId] = useState('user-1');
  const [text, setText] = useState('');
  const [jobList, setJobList] = useState<Job[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const list = await apiClient.getJobs(userId);
      setJobList(list);
    } catch {
      // silently fail on background refresh
    }
  }, [userId]);

  const loadProfile = useCallback(async () => {
    try {
      const p = await apiClient.getUser(userId);
      setProfile(p);
    } catch {
      // silently fail
    }
  }, [userId]);

  useEffect(() => {
    void loadJobs();
    void loadProfile();
  }, [loadJobs, loadProfile]);

  const handleSubmit = async () => {
    // BUG: loading flag is set but the button is NOT disabled, so rapid clicks
    // before the first response arrives will fire multiple POST /api/jobs requests
    if (!text.trim()) {
      setError('Please enter some text first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessId(null);

    try {
      // No idempotency key generated on the client — retries always create new jobs
      const job = await apiClient.createJob(userId, text);
      setSuccessId(job.id);
      setText('');
      // BUG: loadJobs fetches from the list endpoint which returns `jobs` not `results`,
      // so jobList will always remain [] after every successful submission
      await loadJobs();
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    // BUG: no refreshing indicator set before the awaits — UI doesn't show loading state
    setRefreshing(true);
    await loadJobs();
    await loadProfile();
    setRefreshing(false);
  };

  const quota = profile?.subscription?.monthlyQuota ?? 0;
  const usage = profile?.currentUsage ?? 0;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
          🎙️ AudioGen
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>
          AI text-to-speech processing platform
        </p>
      </div>

      {/* User banner */}
      {profile && (
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Signed in as</p>
            <p style={{ fontWeight: 600, fontSize: 15 }}>{profile.email}</p>
            <span style={{
              display: 'inline-block', marginTop: 4,
              background: '#f0fdf4', color: '#166534',
              fontSize: 11, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, textTransform: 'uppercase',
            }}>
              {profile.subscription?.plan ?? 'unknown'} plan
            </span>
          </div>
          <div style={{ flex: 2, minWidth: 240 }}>
            {quota > 0 && <UsageMeter used={usage} quota={quota} />}
          </div>
        </div>
      )}

      {/* Submission panel */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
        padding: 24, marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Submit Text for Processing
        </h2>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type the text you want converted to audio…"
          rows={5}
          style={{
            width: '100%', padding: '12px 14px',
            border: '1px solid #d1d5db', borderRadius: 8,
            fontSize: 14, lineHeight: 1.6, resize: 'vertical',
            outline: 'none',
          }}
        />

        <div style={{ marginTop: 6, textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
          {text.length.toLocaleString()} characters
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
          {/* BUG: disabled is always false — button is never actually disabled */}
          <button
            onClick={() => { void handleSubmit(); }}
            disabled={false}
            style={{
              background: loading ? '#818cf8' : '#4f46e5',
              color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 22px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Submitting…' : 'Submit Job'}
          </button>

          {error && (
            <span style={{ color: '#ef4444', fontSize: 13 }}>⚠ {error}</span>
          )}
          {successId && !error && (
            <span style={{ color: '#10b981', fontSize: 13 }}>
              ✓ Job created — ID: <code style={{ fontSize: 12 }}>{successId.slice(0, 8)}…</code>
            </span>
          )}
        </div>
      </div>

      {/* Job list panel */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
        padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Job History</h2>
          <button
            onClick={() => { void handleRefresh(); }}
            style={{
              background: 'none', border: '1px solid #e5e7eb',
              borderRadius: 6, padding: '6px 14px',
              fontSize: 13, cursor: 'pointer', color: '#374151',
            }}
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {/* BUG: jobList is always [] because apiClient.getJobs reads `results`
            but the API returns `jobs` — so this empty state always renders
            even after jobs have been created */}
        {jobList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <p>No jobs yet. Submit some text above!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobList.map((job) => (
              <div
                key={job.id}
                style={{
                  border: '1px solid #f3f4f6', borderRadius: 8,
                  padding: '14px 16px',
                  background: job.status === 'failed' ? '#fff7f7' : '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                  <code style={{ fontSize: 11, color: '#9ca3af' }}>{job.id}</code>
                  <StatusPill status={job.status} />
                </div>
                <p style={{ fontSize: 14, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>
                  {job.text.length > 120 ? `${job.text.slice(0, 120)}…` : job.text}
                </p>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9ca3af' }}>
                  <span>{job.characterCount.toLocaleString()} chars</span>
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                </div>
                {job.audioUrl && (
                  <a
                    href={job.audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#4f46e5' }}
                  >
                    🔊 Listen to audio
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const root = document.getElementById('root');
if (!root) throw new Error('Could not find #root element');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
