import Link from 'next/link';
import Button from './components/ui/Button';
import Panel from './components/ui/Panel';
import Badge from './components/ui/Badge';

const nodes = [
  {
    label: 'Parent',
    detail: 'Sends funds in one tap',
    sub: 'Stellar wallet, instant settlement',
  },
  {
    label: 'Send Funds contract',
    detail: 'Escrows on Stellar testnet',
    sub: 'Soroban smart contract, on-chain record',
  },
  {
    label: 'Student',
    detail: 'Receives, tracks, spends',
    sub: 'Categorized expenses, AI insight',
  },
  {
    label: 'University',
    detail: 'Gets paid directly',
    sub: 'Tuition settled on-chain',
  },
];

const pillars = [
  {
    title: 'Real Stellar transactions',
    body: 'Every transfer is a signed Soroban contract call, not a database row pretending to be one.',
  },
  {
    title: 'Transparent by default',
    body: 'Parents see exactly where money went. Students see exactly what they spent it on.',
  },
  {
    title: 'AI that reads the ledger',
    body: 'Budget guidance generated from real categorized spending, not a generic tips list.',
  },
];

export default function HomePage() {
  return (
    <main>
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-display text-lg tracking-tight">Student Expense Wallet</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-muted hover:text-parchment transition-colors">
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Badge tone="gold">Stellar testnet · Soroban</Badge>
          <h1 className="font-display text-5xl leading-[1.05] mt-5 mb-6">
            One ledger, <em className="italic text-signal-gold">two sides of the same story.</em>
          </h1>
          <p className="text-slate-muted text-lg leading-relaxed mb-8 max-w-lg">
            Parents send tuition and allowance straight to a student&apos;s Stellar wallet.
            Students track every rupee against a category. Nobody has to ask
            &ldquo;where did the money go&rdquo; — the chain already answered.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/signup">
              <Button size="lg">Create your wallet</Button>
            </Link>
            <Link href="/login" className="text-sm text-slate-muted hover:text-parchment transition-colors">
              I already have an account →
            </Link>
          </div>
        </div>

        <Panel className="p-8 ledger-thread">
          <p className="text-xs uppercase tracking-widest text-slate-faint mb-6 pl-12">
            The path a payment takes
          </p>
          <ol className="flex flex-col gap-7">
            {nodes.map((node, i) => (
              <li key={node.label} className="flex items-start gap-4 relative">
                <span className="relative z-10 flex-none w-10 h-10 rounded-full bg-ink-raised border border-signal-gold/40 flex items-center justify-center text-signal-gold font-display text-sm">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-parchment">{node.label}</p>
                  <p className="text-sm text-slate-muted">{node.detail}</p>
                  <p className="text-xs text-slate-faint mt-0.5 tabular">{node.sub}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-5">
          {pillars.map((p) => (
            <Panel key={p.title} className="p-6">
              <p className="font-display text-lg mb-2">{p.title}</p>
              <p className="text-sm text-slate-muted leading-relaxed">{p.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-ink-border text-sm text-slate-faint flex items-center justify-between">
        <span>Built on Stellar testnet for demonstration purposes.</span>
        <span className="tabular">No real funds are transferred.</span>
      </footer>
    </main>
  );
}
