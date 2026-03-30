import { useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { motion } from 'framer-motion';
import { Encryptable, assertCorrectEncryptedItemInput, FheTypes } from '@cofhe/sdk';
import { cofheClient } from '../cofhe';
import { fhePayAbi } from '../abi/fhepay';
import { getFhePayAddress } from '../constants';
import { wagmiConfig } from '../wagmi';
import type { Hash } from 'viem';

export function EmployeePanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const contract = getFhePayAddress();
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [balance, setBalance] = useState<bigint | null>(null);
  const [salary, setSalary] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  async function decryptBalance() {
    setMsg(null);
    if (!contract || !address || !publicClient || !cofheClient.connected) {
      setMsg('Connect wallet on Sepolia and wait for CoFHE.');
      return;
    }
    setLoading(true);
    try {
      const ct = (await publicClient.readContract({
        address: contract,
        abi: fhePayAbi,
        functionName: 'balanceCiphertext',
        args: [address],
      })) as Hash;

      const v = await cofheClient.decryptForView(ct, FheTypes.Uint32).execute();
      setBalance(typeof v === 'bigint' ? v : BigInt(String(v)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Decrypt failed');
    } finally {
      setLoading(false);
    }
  }

  async function decryptSalary() {
    setMsg(null);
    if (!contract || !address || !publicClient || !cofheClient.connected) {
      setMsg('Connect wallet on Sepolia and wait for CoFHE.');
      return;
    }
    setLoading(true);
    try {
      const ct = (await publicClient.readContract({
        address: contract,
        abi: fhePayAbi,
        functionName: 'salaryCiphertext',
        args: [address],
      })) as Hash;

      const v = await cofheClient.decryptForView(ct, FheTypes.Uint32).execute();
      setSalary(typeof v === 'bigint' ? v : BigInt(String(v)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Decrypt failed');
    } finally {
      setLoading(false);
    }
  }

  async function onWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contract || !address) return;
    const n = BigInt(Math.floor(Number(withdrawAmt)));
    if (n < 0n || n > 2n ** 32n - 1n) {
      setMsg('Invalid amount.');
      return;
    }
    setLoading(true);
    try {
      const [enc] = await cofheClient.encryptInputs([Encryptable.uint32(n)]).execute();
      assertCorrectEncryptedItemInput(enc);
      const h = await writeContractAsync({
        address: contract,
        abi: fhePayAbi,
        chainId: sepolia.id,
        functionName: 'withdraw',
        args: [enc],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: h });
      setMsg('Withdrawal confirmed. Decrypt balance again to see the new amount.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Withdraw failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.section
      className="card"
      style={{ marginTop: '1rem' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 style={{ marginTop: 0, fontFamily: 'Outfit, sans-serif' }}>Employee · vault</h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
        Your balance and salary are ciphertexts on-chain. Decrypt locally with your permit — only you
        (and the contract) receive the handles needed for this.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="button" className="btn" disabled={loading} onClick={() => void decryptBalance()}>
          {loading ? '…' : 'Decrypt balance'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void decryptSalary()}>
          Decrypt salary
        </button>
      </div>
      {balance !== null && (
        <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
          <strong>Balance (local decrypt):</strong> {balance.toString()}
        </p>
      )}
      {salary !== null && (
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Salary (local decrypt):</strong> {salary.toString()}
        </p>
      )}
      <form onSubmit={onWithdraw} style={{ marginTop: '1.25rem', display: 'grid', gap: '0.75rem' }}>
        <div>
          <label className="label" htmlFor="wd">
            Withdraw amount
          </label>
          <input
            id="wd"
            className="input"
            inputMode="numeric"
            value={withdrawAmt}
            onChange={(e) => setWithdrawAmt(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={loading}>
          Encrypt & withdraw
        </button>
      </form>
      {msg && (
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>{msg}</p>
      )}
    </motion.section>
  );
}
