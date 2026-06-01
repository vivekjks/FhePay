import { useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, CircleCheck, Eye, LockKeyhole, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { sepolia } from 'viem/chains';
import { getCofheClient } from '../cofhe';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { useCofheReady } from '../hooks/useCofheReady';
import { wagmiConfig } from '../wagmi';
import { formatEtherAmount, isUint128, parseDecimalToUnits } from '../utils/format';
import { toEncryptedItemInput } from '../utils/cofheInput';

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
  const { data: hasSalary, refetch: refetchHasSalary } = useReadContract({
    address: contract,
    abi: fhePayAbi,
    functionName: 'hasSalary',
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
    const cofheClient = await getCofheClient();
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
      const [{ FheTypes }, cofheClient] = await Promise.all([import('@cofhe/sdk'), getCofheClient()]);
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
    if (hasSalary === false) {
      setMsg('No salary is registered for this wallet yet.');
      return;
    }

    setBusy('salary');
    try {
      const [{ FheTypes }, cofheClient] = await Promise.all([import('@cofhe/sdk'), getCofheClient()]);
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
    if (!cofheReady) {
      setMsg('CoFHE is still connecting. Try the claim again in a moment.');
      return;
    }

    const pending = await refetchHasPending();
    if (!pending.data) {
      if (!options?.silentIfMissing) setMsg('There is no pending withdrawal claim for this wallet.');
      return;
    }

    setBusy('claim');
    setMsg(null);
    try {
      const cofheClient = await getCofheClient();
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
      await Promise.all([refetchHasPending(), refetchTreasury(), refetchHasSalary()]);

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

  async function cancelPendingWithdrawal() {
    setMsg(null);
    if (!contract || !address) return;

    const pending = await refetchHasPending();
    if (!pending.data) {
      setMsg('There is no pending withdrawal to cancel.');
      return;
    }

    setBusy('cancel');
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'cancelWithdrawal',
      });
      await waitForHash(hash);
      await Promise.all([refetchHasPending(), refetchTreasury()]);
      setMsg('Pending withdrawal canceled and returned to your confidential balance.');
      if (cofheReady) await decryptBalance();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not cancel withdrawal.');
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
    if (hasPendingWithdrawal) {
      setMsg('Claim or cancel your pending withdrawal before creating another one.');
      return;
    }

    const amountWei = parseDecimalToUnits(withdrawAmt, 18);
    if (amountWei === null || amountWei <= 0n) {
      setMsg('Enter a valid ETH amount to withdraw.');
      return;
    }
    if (!isUint128(amountWei)) {
      setMsg('Withdrawal exceeds the euint128 limit.');
      return;
    }

    setBusy('withdraw');
    try {
      const [{ Encryptable }, cofheClient] = await Promise.all([
        import('@cofhe/sdk'),
        getCofheClient(),
      ]);
      const [enc] = await cofheClient.encryptInputs([Encryptable.uint128(amountWei)]).execute();
      const encryptedAmount = toEncryptedItemInput(enc);
      const requestHash = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'requestWithdraw',
        args: [encryptedAmount],
      });
      await waitForHash(requestHash);
      await Promise.all([refetchHasPending(), refetchTreasury()]);
      setWithdrawAmt('');
      await claimPendingWithdrawal({ silentIfMissing: true });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Withdraw request failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.section className="card panel-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Employee vault</p>
          <h2>Private balance and claims</h2>
          <p className="prose-muted">Decrypt your values and claim verified ETH.</p>
        </div>
        <span className={`status-pill ${hasPendingWithdrawal ? 'status-warn' : 'status-ok'}`}>
          {hasPendingWithdrawal ? <RefreshCw size={14} /> : <CircleCheck size={14} />}
          {hasPendingWithdrawal ? 'Pending claim' : 'No pending claim'}
        </span>
      </div>

      <div className="stats-grid compact-stats">
        <div className="stat-card">
          <span className="label">Confidential balance</span>
          <strong>{balance === null ? 'Decrypt to view' : formatEtherAmount(balance)}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Confidential salary</span>
          <strong>{salary === null ? (hasSalary === false ? 'Not registered' : 'Decrypt to view') : formatEtherAmount(salary)}</strong>
        </div>
        <div className="stat-card">
          <span className="label">Treasury liquidity</span>
          <strong>{typeof treasuryBalance === 'bigint' ? formatEtherAmount(treasuryBalance) : 'Loading...'}</strong>
        </div>
      </div>

      <div className="button-row action-row">
        <button type="button" className="btn" disabled={busy !== null} onClick={() => void decryptBalance()}>
          <Eye size={16} />
          {busy === 'balance' ? 'Decrypting...' : 'Decrypt balance'}
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void decryptSalary()}>
          <LockKeyhole size={16} />
          {busy === 'salary' ? 'Decrypting...' : 'Decrypt salary'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy !== null || !hasPendingWithdrawal}
          onClick={() => void claimPendingWithdrawal()}
        >
          <Banknote size={16} />
          {busy === 'claim' ? 'Claiming...' : 'Claim pending'}
        </button>
        <button
          type="button"
          className="icon-btn"
          disabled={busy !== null || !hasPendingWithdrawal}
          title="Cancel pending withdrawal"
          onClick={() => void cancelPendingWithdrawal()}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <form onSubmit={onWithdraw} className="surface-form withdraw-form">
        <div className="form-title">
          <Send size={18} />
          <h3>Withdraw to wallet</h3>
        </div>
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
        <p className="prose-muted small-copy">Encrypted request, verified public settlement.</p>
        <button type="submit" className="btn" disabled={busy !== null || !!hasPendingWithdrawal}>
          <Send size={16} />
          {busy === 'withdraw' ? 'Requesting...' : 'Request and claim'}
        </button>
      </form>

      {(msg || lastHash) && (
        <div className="status-strip">
          {msg && <p>{msg}</p>}
          {lastHash && (
            <a href={`https://sepolia.etherscan.io/tx/${lastHash}`} target="_blank" rel="noreferrer">
              Tx: {lastHash}
            </a>
          )}
        </div>
      )}
    </motion.section>
  );
}
