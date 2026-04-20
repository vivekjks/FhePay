import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAccount, useBlockNumber, useChainId, useReadContract } from 'wagmi';
import { sepolia } from 'viem/chains';
import { ConnectBar } from '../components/ConnectBar';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { useCofheReady } from '../hooks/useCofheReady';
import { formatDuration, formatEtherAmount, shortAddress } from '../utils/format';

function Row({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem 1rem',
        padding: '0.7rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ minWidth: 150, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{label}</span>
      <span className="badge" style={{ color: ok ? 'var(--accent)' : 'rgba(255,120,120,0.95)' }}>
        {ok ? 'OK' : 'Check'}
      </span>
      <span className="prose-muted" style={{ flex: '1 1 220px', margin: 0, fontSize: '0.92rem' }}>
        {detail}
      </span>
    </div>
  );
}

export function Status() {
  const contract = getFhePayAddress();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const cofheReady = useCofheReady();
  const { data: block } = useBlockNumber({ watch: true });
  const { data: owner } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'owner',
    query: { enabled: !!contract },
  });
  const { data: treasuryBalance } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'treasuryBalance',
    query: { enabled: !!contract },
  });
  const { data: payInterval } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'payInterval',
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
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.85rem, 4vw, 2.2rem)', margin: '0 0 0.5rem' }}>
          Runtime status
        </h1>
        <p className="prose-muted" style={{ maxWidth: 720, margin: 0 }}>
          Use this page to verify that the wallet, chain, contract, treasury, and CoFHE session are all ready before you
          run payroll or claim a withdrawal.
        </p>
      </motion.header>

      <ConnectBar />

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Checks</h2>
        <Row label="Contract env" ok={envOk} detail={envOk ? `Address: ${contract}` : 'Set VITE_FHEPAY_ADDRESS in frontend/.env.local'} />
        <Row
          label="Wallet"
          ok={isConnected}
          detail={isConnected ? `Connected: ${shortAddress(address)}` : 'Connect from the bar above or open the dashboard'}
        />
        <Row
          label="Network"
          ok={onSepolia}
          detail={onSepolia ? `Ethereum Sepolia (${sepolia.id})` : `Wrong chain (${chainId}). Switch to Sepolia.`}
        />
        <Row
          label="Latest block"
          ok={onSepolia && block != null}
          detail={block != null ? `Block #${block.toString()}` : 'Waiting for RPC response'}
        />
        <Row
          label="Contract owner"
          ok={!!owner && envOk}
          detail={owner ? String(owner) : contract ? 'Reading contract owner...' : 'No contract configured'}
        />
        <Row
          label="Treasury"
          ok={typeof treasuryBalance === 'bigint'}
          detail={
            typeof treasuryBalance === 'bigint'
              ? `${formatEtherAmount(treasuryBalance)} available for employee claims`
              : 'Reading treasury balance'
          }
        />
        <Row
          label="Pay interval"
          ok={typeof payInterval === 'bigint'}
          detail={typeof payInterval === 'bigint' ? formatDuration(payInterval) : 'Reading pay interval'}
        />
        <Row
          label="CoFHE SDK"
          ok={!isConnected || cofheReady}
          detail={
            !isConnected
              ? 'Connect a wallet first to initialize the CoFHE client'
              : cofheReady
                ? 'Ready for encrypt, decryptForView, and decryptForTx flows'
                : 'Connecting... give it a few seconds after wallet connect'
          }
        />
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 className="section-title">Operational notes</h2>
        <ul className="prose-muted" style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li>The employer should keep enough ETH in the treasury to cover expected employee claims.</li>
          <li>The employee claim flow depends on both CoFHE readiness and sufficient treasury liquidity.</li>
          <li>The pay interval protects against accidental duplicate payroll runs for the same employee.</li>
        </ul>
      </section>

      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link to="/app" className="btn">
          Open dashboard
        </Link>
      </p>
    </div>
  );
}
