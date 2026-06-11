import Link from 'next/link';
import Panel from './components/ui/Panel';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Panel className="p-8 max-w-md text-center">
        <p className="font-display text-xl mb-2">Page not found.</p>
        <p className="text-sm text-slate-muted mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link href="/" className="text-signal-gold hover:underline text-sm">
          ← Back home
        </Link>
      </Panel>
    </main>
  );
}
