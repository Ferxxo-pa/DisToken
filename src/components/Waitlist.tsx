import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function submitToWaitlist(email: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Fallback: just store locally if no Supabase configured
    const existing = JSON.parse(localStorage.getItem('distoken:waitlist') ?? '[]');
    existing.push({ email, ts: Date.now() });
    localStorage.setItem('distoken:waitlist', JSON.stringify(existing));
    return true;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        email,
        source: 'distoken',
        created_at: new Date().toISOString(),
      }),
    });
    return res.ok || res.status === 201 || res.status === 409; // 409 = already exists
  } catch {
    return false;
  }
}

export function Waitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setStatus('submitting');
    const ok = await submitToWaitlist(email.trim());
    setStatus(ok ? 'success' : 'error');
  };

  if (status === 'success') {
    return (
      <div className="text-center space-y-2 py-8">
        <p className="text-sm font-medium">You're on the list ✓</p>
        <p className="text-xs text-muted-foreground font-light">
          We'll notify you when Pro features launch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-8">
      <div className="text-center space-y-2">
        <p className="text-sm font-medium tracking-wide">
          Coming soon — Pro features
        </p>
        <p className="text-xs text-muted-foreground font-light max-w-sm mx-auto">
          Offline event packs, playlist scheduling, multi-screen management, and more.
          Get early access.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="flex-1 h-10 text-sm bg-card border-border focus:border-foreground"
          disabled={status === 'submitting'}
        />
        <Button
          type="submit"
          className="h-10 px-5 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium"
          disabled={status === 'submitting' || !email.includes('@')}
        >
          {status === 'submitting' ? '...' : 'Join'}
        </Button>
      </form>
      {status === 'error' && (
        <p className="text-xs text-center text-destructive">Something went wrong. Try again.</p>
      )}
    </div>
  );
}
