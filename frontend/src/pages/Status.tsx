import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAccount, useBlockNumber, useChainId, useReadContract } from 'wagmi';
import { getFhePayAddress } from '../constants';
import { fhePayAbi } from '../abi/fhepay';
import { useCofheReady } from '../hooks/useCofheReady';
import { ConnectBar } from '../components/ConnectBar';
import { sepolia } from 'viem/chains';

function Row({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem 1rem',
        padding: '0.65rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ minWidth: 140, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</span>
      <span className="badge" style={{ color: ok ? 'var(--accent)' : 'rgba(255,100,100,0.9)' }}>
        {ok ? 'OK' : 'Check'}
      </span>
      <span className="prose-muted" style={{ flex: '1 1 200px', margin: 0, fontSize: '0.92rem' }}>
        {detail}
      </span>
    </div>
  );
}

export function Status() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const cofheReady = useCofheReady();
  const contract = getFhePayAddress();
  const { data: block } = useBlockNumber({ watch: true });
  const { data: owner } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'owner',
    query: { enabled: !!contract },
  });

  const onSepolia = chainId === sepolia.id;
  const envOk = !!contract;

  return (
    <div>
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="badge" style={{ marginBottom: '0.65rem' }}>
          Diagnostics
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.85rem, 4vw, 2.15rem)', margin: '0 0 0.5rem' }}>
          Connection status
        </h1>
        <p className="prose-muted" style={{ maxWidth: 640, margin: 0 }}>
          Use this page to verify your browser, wallet, and CoFHE session before running payroll. Everything should show{' '}
          <strong style={{ color: 'var(--fg)' }}>OK</strong> on Sepolia with a funded wallet.
        </p>
      </motion.header>

      <ConnectBar />

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Checks</h2>
        <Row label="Contract env" ok={envOk} detail={envOk ? `Address: ${contract}` : 'Set VITE_FHEPAY_ADDRESS in .env.local'} />
        <Row
          label="Wallet"
          ok={isConnected}
          detail={
            isConnected
              ? `Connected: ${address?.slice(0, 6)}…${address?.slice(-4)}`
              : 'Use the bar below or open App to connect'
          }
        />
        <Row
          label="Network"
          ok={onSepolia}
          detail={onSepolia ? `Ethereum Sepolia (${sepolia.id})` : `Wrong chain (${chainId}). Switch to Sepolia.`}
        />
        <Row
          label="Latest block"
          ok={onSepolia && block != null}
          detail={block != null ? `#${block.toString()}` : 'Waiting for RPC…'}
        />
        <Row
          label="Contract owner"
          ok={!!owner && envOk}
          detail={owner ? String(owner) : contract ? 'Reading…' : 'No contract'}
        />
        <Row
          label="CoFHE SDK"
          ok={!isConnected || cofheReady}
          detail={
            !isConnected
              ? 'Connect wallet first to initialize CoFHE'
              : cofheReady
                ? 'Client connected — you can encrypt and decrypt'
                : 'Connecting… open App, wait a few seconds, then refresh if stuck'
          }
        />
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 className="section-title">Next steps</h2>
        <ul className="prose-muted" style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li>If network fails: use MetaMask → Networks → Ethereum Sepolia, or the “Switch to Sepolia” button in the app.</li>
          <li>If CoFHE stays stuck: disable strict ad blockers for this site, then reconnect the wallet.</li>
          <li>
            <Link to="/app" style={{ fontWeight: 600 }}>
              Open App
            </Link>{' '}
            when all checks pass.
          </li>
        </ul>
      </section>

      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link to="/resources" className="btn btn-ghost">
          Resources & FAQ
        </Link>
      </p>
    </div>
  );
}
