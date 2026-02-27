import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

// Formspree endpoint — free, emails go to your inbox
// Create one at formspree.io and replace this ID
const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID || '';

async function submitToWaitlist(email: string): Promise<boolean> {
  // If Formspree is configured, submit there
  if (FORMSPREE_ID) {
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, source: 'distoken', _subject: 'New DisToken Pro waitlist signup' }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Fallback: store locally (you can export later)
  const existing = JSON.parse(localStorage.getItem('distoken:waitlist') ?? '[]');
  existing.push({ email, ts: Date.now() });
  localStorage.setItem('distoken:waitlist', JSON.stringify(existing));
  return true;
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
