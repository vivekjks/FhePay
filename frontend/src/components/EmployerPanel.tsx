import { useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { motion } from 'framer-motion';
import { Encryptable, assertCorrectEncryptedItemInput } from '@cofhe/sdk';
import { sepolia } from 'viem/chains';
import { isAddress } from 'viem/utils';
import { cofheClient } from '../cofhe';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { wagmiConfig } from '../wagmi';
import { useCofheReady } from '../hooks/useCofheReady';

type Address = `0x${string}`;

const MAX_UINT32 = 2n ** 32n - 1n;

function parseUint32Input(value: string): bigint | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = BigInt(trimmed);
  return parsed <= MAX_UINT32 ? parsed : null;
}

export function EmployerPanel() {
  const cofheReady = useCofheReady();
  const { address } = useAccount();
  const contract = getFhePayAddress();
  const [employee, setEmployee] = useState('');
  const [salary, setSalary] = useState('');
  const [batch, setBatch] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { writeContract, writeContractAsync, data: hash, error: writeErr, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const disabled = !contract || !address || !cofheReady;

  async function onSetSalary(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !isAddress(employee)) {
      setMsg('Enter a valid employee address.');
      return;
    }

    const parsedSalary = parseUint32Input(salary);
    if (parsedSalary === null) {
      setMsg('Salary must be a valid uint32 value.');
      return;
    }

    setBusy(true);
    try {
      const [enc] = await cofheClient.encryptInputs([Encryptable.uint32(parsedSalary)]).execute();
      assertCorrectEncryptedItemInput(enc);
      await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'setSalary',
        args: [employee as Address, enc],
      });
      setMsg('Salary set.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Encryption or tx failed');
    } finally {
      setBusy(false);
    }
  }

  function onPayOne(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !isAddress(employee)) {
      setMsg('Enter employee address.');
      return;
    }

    writeContract({
      address: contract,
      abi: fhePayAbi,
      chainId: sepolia.id,
      functionName: 'paySalary',
      args: [employee as Address],
    });
  }

  async function onBatchPay() {
    setMsg(null);
    if (!contract) return;

    const addrs = batch
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s): s is Address => isAddress(s));

    if (addrs.length === 0) {
      setMsg('Paste comma- or space-separated employee addresses.');
      return;
    }

    setBusy(true);
    try {
      for (const emp of addrs) {
        const txHash = await writeContractAsync({
          address: contract,
          abi: fhePayAbi,
          chainId: sepolia.id,
          functionName: 'paySalary',
          args: [emp],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
      }
      setMsg(`Paid ${addrs.length} employees (one tx each).`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Batch failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.section
      className="card"
      style={{ marginTop: '1rem' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 style={{ marginTop: 0, fontFamily: 'Outfit, sans-serif' }}>Employer - payroll setup</h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
        Salaries are encrypted with CoFHE before they hit the chain. Only ciphertext handles are stored publicly.
      </p>
      {disabled && (
        <p style={{ color: '#ffb6c1' }}>
          {!contract
            ? 'Set VITE_FHEPAY_ADDRESS after deployment.'
            : !address
              ? 'Connect your wallet.'
              : 'Wait for CoFHE (encrypt needs a live session). Try the Status page if this persists.'}
        </p>
      )}
      <form onSubmit={onSetSalary} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label className="label" htmlFor="emp">
            Employee address
          </label>
          <input
            id="emp"
            className="input"
            placeholder="0x..."
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label" htmlFor="sal">
            Salary (plain unit, e.g. USD whole dollars)
          </label>
          <input
            id="sal"
            className="input"
            inputMode="numeric"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={disabled || busy || isPending}>
          {busy ? 'Encrypting...' : 'Encrypt & set salary'}
        </button>
      </form>
      <form onSubmit={onPayOne} style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem' }}>
        <button type="submit" className="btn btn-ghost" disabled={disabled || isPending}>
          Pay one period (same employee field)
        </button>
      </form>
      <div style={{ marginTop: '1.5rem' }}>
        <label className="label" htmlFor="batch">
          Batch pay - addresses
        </label>
        <textarea
          id="batch"
          className="input"
          rows={3}
          placeholder="0xabc..., 0xdef..."
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          style={{ resize: 'vertical' }}
        />
        <button
          type="button"
          className="btn"
          style={{ marginTop: '0.5rem' }}
          disabled={disabled || busy}
          onClick={() => void onBatchPay()}
        >
          Batch pay (sequential)
        </button>
      </div>
      {(msg || writeErr) && (
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>
          {msg || writeErr?.message}
        </p>
      )}
      {hash && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', wordBreak: 'break-all' }}>
          Tx: {hash} {confirming ? '(confirming...)' : isSuccess ? 'OK' : ''}
        </p>
      )}
    </motion.section>
  );
}
