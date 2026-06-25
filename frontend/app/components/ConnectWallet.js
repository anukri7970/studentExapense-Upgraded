'use client';

import { useState, useEffect } from 'react';
import { isConnected, setAllowed, requestAccess, signAuthEntry } from '@stellar/freighter-api';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import Panel from './ui/Panel';

export default function ConnectWallet() {
  const [freighterConnected, setFreighterConnected] = useState(false);
  const [walletKey, setWalletKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const { user, refresh } = useAuth();
  
  useEffect(() => {
    async function checkConnection() {
      try {
        if (await isConnected()) {
          setFreighterConnected(true);
        }
      } catch (e) {
        // Freighter not installed or not available
      }
    }
    checkConnection();
  }, []);

  useEffect(() => {
    if (user?.stellarPublicKey) {
      setWalletKey(user.stellarPublicKey);
      setVerified(true);
    }
  }, [user]);

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      if (!freighterConnected) {
        throw new Error('Freighter extension is not installed or accessible.');
      }
      
      await setAllowed();
      const access = await requestAccess();
      if (access.error) {
        throw new Error(access.error);
      }
      const publicKey = access.address;

      // Request a signature to prove ownership
      const challenge = "Verify wallet ownership for Student Expense Wallet: " + Date.now();
      const signature = await signAuthEntry(challenge);
      
      if (signature) {
        await api.post('/users/connect-wallet', { stellarPublicKey: publicKey });
        setWalletKey(publicKey);
        setVerified(true);
        refresh(); // Refresh user data to get the newly connected wallet everywhere
      } else {
        throw new Error('Signature was rejected or failed.');
      }
      
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
      setVerified(false);
    } finally {
      setLoading(false);
    }
  };

  if (!freighterConnected) {
    return (
      <Panel className="p-6 bg-slate-800/50 border-dashed border-slate-700">
        <p className="text-slate-muted text-sm mb-2">Connect External Wallet</p>
        <p className="text-sm">Install the <a href="https://freighter.app" target="_blank" rel="noreferrer" className="text-mint underline">Freighter extension</a> to connect your own wallet.</p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6 bg-slate-800/50">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-muted">External Wallet</p>
        {!walletKey ? (
          <div>
            <button 
              onClick={handleConnect} 
              disabled={loading}
              className="bg-mint text-slate-950 font-medium px-4 py-2 rounded text-sm hover:bg-mint/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect Freighter Wallet'}
            </button>
            {error && <p className="text-coral text-xs mt-2">{error}</p>}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-mint"></div>
              <p className="text-sm font-medium">Connected</p>
              {verified && <span className="bg-mint/20 text-mint text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ml-2">Verified Owner</span>}
            </div>
            <p className="text-xs text-slate-muted font-mono truncate" title={walletKey}>
              {walletKey.slice(0, 8)}...{walletKey.slice(-8)}
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
