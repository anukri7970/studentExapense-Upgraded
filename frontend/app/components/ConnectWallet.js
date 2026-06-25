'use client';

import { useState, useEffect } from 'react';
import { isConnected, setAllowed, requestAccess } from '@stellar/freighter-api';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Panel from './ui/Panel';

export default function ConnectWallet({ onWalletChange }) {
  const [freighterInstalled, setFreighterInstalled] = useState(false);
  const [walletKey, setWalletKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState('');
  const [fundMsg, setFundMsg] = useState('');

  const { user, refresh } = useAuth();

  useEffect(() => {
    async function checkFreighter() {
      try {
        if (await isConnected()) setFreighterInstalled(true);
      } catch (_) {}
    }
    checkFreighter();
  }, []);

  useEffect(() => {
    if (user?.stellarPublicKey) setWalletKey(user.stellarPublicKey);
  }, [user]);

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      if (!freighterInstalled) throw new Error('Freighter extension is not installed.');
      await setAllowed();
      const access = await requestAccess();
      if (access.error) throw new Error(access.error);
      const publicKey = access.address;

      const { data } = await api.post('/users/connect-wallet', { stellarPublicKey: publicKey });
      setWalletKey(publicKey);
      if (data.funded) setFundMsg('✅ Wallet auto-funded with 10,000 XLM via Friendbot!');
      await refresh();
      if (onWalletChange) onWalletChange();
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/users/disconnect-wallet');
      setWalletKey('');
      setFundMsg('');
      await refresh();
      if (onWalletChange) onWalletChange();
    } catch (_) {
      setError('Failed to disconnect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleFriendbot = async () => {
    if (!walletKey) return;
    setFunding(true);
    setFundMsg('');
    setError('');
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(walletKey)}`);
      if (res.ok) {
        setFundMsg('✅ Funded! You now have 10,000 XLM on Testnet.');
        await refresh();
        if (onWalletChange) onWalletChange();
      } else {
        setFundMsg('ℹ️ Already funded or Friendbot limit reached.');
      }
    } catch (_) {
      setError('Friendbot request failed. Try again.');
    } finally {
      setFunding(false);
    }
  };

  const balance = user?.liveXlmBalance;
  const isFunded = balance !== null && balance !== undefined && Number(balance) > 0;

  if (!freighterInstalled) {
    return (
      <Panel className="p-6 bg-slate-800/50 border-dashed border-slate-700">
        <p className="text-slate-muted text-sm mb-2 font-medium">External Wallet</p>
        <p className="text-sm text-parchment">
          Install the{' '}
          <a href="https://freighter.app" target="_blank" rel="noreferrer" className="text-mint underline">
            Freighter extension
          </a>{' '}
          to connect your Stellar wallet.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6 bg-slate-800/50">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-muted font-medium">External Wallet</p>
          {walletKey && (
            <button onClick={handleDisconnect} disabled={loading}
              className="text-coral text-xs hover:underline disabled:opacity-50">
              Disconnect
            </button>
          )}
        </div>

        {/* Testnet reminder */}
        <div className="bg-signal-gold/10 border border-signal-gold/30 rounded px-3 py-2 text-[11px] text-signal-gold">
          ⚠️ Make sure Freighter is set to <strong>Testnet</strong> before connecting or signing.
        </div>

        {!walletKey ? (
          <div>
            <button onClick={handleConnect} disabled={loading}
              className="bg-mint text-slate-950 font-semibold px-4 py-2.5 rounded text-sm hover:bg-mint/90 transition-colors disabled:opacity-50 w-full">
              {loading ? 'Connecting…' : '🔗 Connect Freighter Wallet'}
            </button>
            {error && <p className="text-coral text-xs mt-2">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-mint shrink-0" />
              <p className="text-sm font-medium">Connected</p>
              <span className="bg-mint/20 text-mint text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider">
                VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-muted font-mono">
              {walletKey.slice(0, 10)}…{walletKey.slice(-10)}
            </p>

            <div className="p-3 bg-slate-900 rounded border border-slate-700/50">
              <p className="text-xs text-slate-muted mb-1">Available Balance (Testnet)</p>
              <p className={`text-xl font-display ${isFunded ? 'text-mint' : 'text-coral'}`}>
                {isFunded ? `${Number(balance).toLocaleString()} XLM` : '0 XLM — Not funded'}
              </p>

              {!isFunded && (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-muted mb-2">
                    Your wallet needs testnet XLM to send transactions. Click below to get free test funds:
                  </p>
                  <button
                    onClick={handleFriendbot}
                    disabled={funding}
                    className="bg-signal-gold text-slate-950 font-semibold px-3 py-1.5 rounded text-xs hover:bg-signal-gold/90 transition-colors disabled:opacity-50 w-full"
                  >
                    {funding ? 'Funding…' : '🚰 Fund with Friendbot (Free Testnet XLM)'}
                  </button>
                </div>
              )}
            </div>

            {fundMsg && <p className="text-mint text-xs font-medium">{fundMsg}</p>}
            {error && <p className="text-coral text-xs">{error}</p>}
          </div>
        )}
      </div>
    </Panel>
  );
}
