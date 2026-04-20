import { useState } from 'react';
import { motion } from 'framer-motion';
import { Encryptable, assertCorrectEncryptedItemInput, FheTypes } from '@cofhe/sdk';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { sepolia } from 'viem/chains';
import { cofheClient } from '../cofhe';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { useCofheReady } from '../hooks/useCofheReady';
import { wagmiConfig } from '../wagmi';
import { formatEtherAmount, parseDecimalToUnits } from '../utils/format';

type Hash = `0x${string}`;

export function EmployeePanel() {
  const contract = getFhePayAddress();
  const cofheReady = useCofheReady();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [balance, setBalance] = useState<bigint | null>(null);
  const [salary, setSalary] = useState<bigint | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<Hash | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { data: hasPendingWithdrawal, refetch: refetchHasPending } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'hasPendingWithdrawal',
    args: address ? [address] : undefined,
    query: { enabled: !!contract && !!address },
  });
  const { data: treasuryBalance, refetch: refetchTreasury } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'treasuryBalance',
    query: { enabled: !!contract },
  });

  async function ensureSelfPermit() {
    await cofheClient.permits.getOrCreateSelfPermit();
  }

  async function waitForHash(hash: Hash) {
    setLastHash(hash);
    await waitForTransactionReceipt(wagmiConfig, { hash });
  }

  async function decryptBalance() {
    setMsg(null);
    if (!contract || !address || !publicClient || !cofheReady) {
      setMsg('Connect your wallet on Sepolia and wait for CoFHE to become ready.');
      return;
    }

    setBusy('balance');
    try {
      const ct = (await publicClient.readContract({
        address: contract,
        abi: fhePayAbi,
        functionName: 'balanceCiphertext',
        args: [address],
      })) as Hash;

      await ensureSelfPermit();
      const value = await cofheClient.decryptForView(ct, FheTypes.Uint128).withPermit().execute();
      setBalance(typeof value === 'bigint' ? value : BigInt(String(value)));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not decrypt balance.');
    } finally {
      setBusy(null);
    }
  }

  async function decryptSalary() {
    setMsg(null);
    if (!contract || !address || !publicClient || !cofheReady) {
      setMsg('Connect your wallet on Sepolia and wait for CoFHE to become ready.');
      return;
    }

    setBusy('salary');
    try {
      const ct = (await publicClient.readContract({
        address: contract,
        abi: fhePayAbi,
        functionName: 'salaryCiphertext',
        args: [address],
      })) as Hash;

      await ensureSelfPermit();
      const value = await cofheClient.decryptForView(ct, FheTypes.Uint128).withPermit().execute();
      setSalary(typeof value === 'bigint' ? value : BigInt(String(value)));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not decrypt salary.');
    } finally {
      setBusy(null);
    }
  }

  async function claimPendingWithdrawal(options?: { silentIfMissing?: boolean }) {
    if (!contract || !address || !publicClient) return;

    const pending = await refetchHasPending();
    if (!pending.data) {
      if (!options?.silentIfMissing) setMsg('There is no pending withdrawal claim for this wallet.');
      return;
    }

    setBusy('claim');
    setMsg(null);
    try {
      const pendingCt = (await publicClient.readContract({
        address: contract,
        abi: fhePayAbi,
        functionName: 'pendingWithdrawalCiphertext',
        args: [address],
      })) as Hash;

      const decryptResult = await cofheClient
        .decryptForTx(pendingCt)
        .withoutPermit()
        .execute();

      const clearAmount =
        typeof decryptResult.decryptedValue === 'bigint'
          ? decryptResult.decryptedValue
          : BigInt(String(decryptResult.decryptedValue));

      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'claimWithdrawal',
        args: [clearAmount, decryptResult.signature],
      });
      await waitForHash(hash);
      await Promise.all([refetchHasPending(), refetchTreasury()]);

      if (clearAmount === 0n) {
        setMsg('The requested amount exceeded your confidential balance, so the zero-value claim was cleared.');
      } else {
        setMsg(`Claimed ${formatEtherAmount(clearAmount)} to your wallet.`);
      }
      await decryptBalance();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Claim failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!contract || !address || !cofheReady) {
      setMsg('Connect your wallet on Sepolia and wait for CoFHE to become ready.');
      return;
    }

    const amountWei = parseDecimalToUnits(withdrawAmt, 18);
    if (amountWei === null || amountWei <= 0n) {
      setMsg('Enter a valid ETH amount to withdraw.');
      return;
    }

    setBusy('withdraw');
    try {
      const [enc] = await cofheClient.encryptInputs([Encryptable.uint128(amountWei)]).execute();
      assertCorrectEncryptedItemInput(enc);
      const requestHash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'requestWithdraw',
        args: [enc],
      });
      await waitForHash(requestHash);
      await Promise.all([refetchHasPending(), refetchTreasury()]);
      setWithdrawAmt('');
      await claimPendingWithdrawal({ silentIfMissing: true });
      setBusy(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Withdraw request failed.');
      setBusy(null);
    }
  }

  return (
    <motion.section
      className="card"
      style={{ marginTop: '1rem' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="panel-head">
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit, sans-serif' }}>Employee vault</h2>
          <p className="prose-muted" style={{ margin: '0.45rem 0 0' }}>
            Decrypt your confidential salary locally, then request and claim ETH using the verified on-chain proof flow.
          </p>
        </div>
        <span className="badge" style={{ color: cofheReady ? 'var(--accent)' : 'rgba(255,255,255,0.55)' }}>
          {hasPendingWithdrawal ? 'Pending claim' : 'No pending claim'}
        </span>
      </div>

      <div className="stats-grid" style={{ marginTop: '1rem' }}>
        <div className="stat-card">
          <span className="label">Confidential balance</span>
          <strong>{balance === null ? 'Decrypt to view' : formatEtherAmount(balance)}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Confidential salary</span>
          <strong>{salary === null ? 'Decrypt to view' : formatEtherAmount(salary)}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Treasury liquidity</span>
          <strong>{typeof treasuryBalance === 'bigint' ? formatEtherAmount(treasuryBalance) : 'Loading...'}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="button" className="btn" disabled={busy !== null} onClick={() => void decryptBalance()}>
          {busy === 'balance' ? 'Decrypting...' : 'Decrypt balance'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={() => void decryptSalary()}>
          {busy === 'salary' ? 'Decrypting...' : 'Decrypt salary'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy !== null || !hasPendingWithdrawal}
          onClick={() => void claimPendingWithdrawal()}
        >
          {busy === 'claim' ? 'Claiming...' : 'Claim pending withdrawal'}
        </button>
      </div>

      <form onSubmit={onWithdraw} className="stack-form" style={{ marginTop: '1.25rem' }}>
        <div>
          <label className="label" htmlFor="withdraw">
            Withdraw amount (ETH)
          </label>
          <input
            id="withdraw"
            className="input"
            placeholder="0.01"
            value={withdrawAmt}
            onChange={(e) => setWithdrawAmt(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <p className="prose-muted" style={{ margin: 0, fontSize: '0.92rem' }}>
          This requests a confidential withdrawal, then claims the verified amount into your wallet.
        </p>
        <button type="submit" className="btn" disabled={busy !== null}>
          {busy === 'withdraw' ? 'Requesting...' : 'Withdraw to wallet'}
        </button>
      </form>

      {(msg || lastHash) && (
        <div className="status-strip" style={{ marginTop: '1rem' }}>
          {msg && <p style={{ margin: 0 }}>{msg}</p>}
          {lastHash && (
            <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
              Tx: {lastHash}
            </code>
          )}
        </div>
      )}
    </motion.section>
  );
}
