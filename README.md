# FhePay

**FhePay** is a confidential payroll demo on **Ethereum Sepolia** built with **Fhenix CoFHE**: salaries and vault balances are stored as encrypted handles (`euint32`) on-chain; employers configure pay using client-side encryption; employees decrypt **their own** balances locally with the CoFHE client and permits.

Official CoFHE documentation: [https://cofhe-docs.fhenix.zone/](https://cofhe-docs.fhenix.zone/)

---



## Table of contents

- [What problem does this solve?](#what-problem-does-this-solve)
- [Who is it for?](#who-is-it-for)
- [Architecture](#architecture)
- [User flows (end-to-end)](#user-flows-end-to-end)
- [Site map (routes)](#site-map-routes)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Smart contracts](#smart-contracts)
- [Frontend](#frontend)
- [Environment variables](#environment-variables)
- [Security model](#security-model-high-level)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## What problem does this solve?

On public chains, token transfers and simple payroll contracts often reveal **amounts** to everyone. That is a poor fit for teams, DAOs, and companies where compensation should stay private while still benefiting from on-chain settlement and auditability.

FhePay shows how **fully homomorphic encryption (FHE)** can keep amounts confidential: the contract performs homomorphic add / compare on ciphertexts; observers see transactions and addresses involved in events, but **not** plaintext salaries or balances.

## Who is it for?

- **Hackathons & demos** — Judges can follow txs on Etherscan without seeing salary numbers.
- **Product teams** — A reference for how CoFHE, wagmi, and Solidity FHE fit together.
- **DAOs & remote orgs** — A conversation starter for “on-chain payroll without public amounts.”

---

## Architecture

| Layer | Role |
|--------|------|
| **React (Vite)** | Wallet connection (wagmi + injected), UI, motion, routing (see [Site map](#site-map-routes)) |
| **@cofhe/sdk** | `encryptInputs`, permits, `decryptForView` for ciphertext handles |
| **FhePay.sol** | `euint32` salary + balance per employee; `FHE.add`, `FHE.gte`, `FHE.select` for pay/withdraw; ACL via `FHE.allowThis` / `FHE.allow` / `FHE.allowSender` |
| **Sepolia** | Chain id `11155111` — CoFHE-supported testnet |

```text
Browser (encrypt) → Transaction (handles + proofs) → Contract (FHE ops) → Events (addresses only)
                                                          ↓
                                              Employee decrypts locally (permit)
```

---

## User flows (end-to-end)

### Employer (contract `owner`)

1. Connect the **deployer** wallet on **Sepolia**.
2. Wait until the UI shows **CoFHE: ready** (SDK connected to viem clients).
3. Enter **employee address** + **salary** (plain unit, e.g. whole USD) → **Encrypt & set salary**.
4. **Pay one period** or use **batch pay** (one `paySalary` tx per address; confirm each in the wallet).
5. Optional: use **Employee** panel with the same wallet if you added yourself as an employee.

### Employee (any non-owner address)

1. Connect the **employee** wallet on Sepolia.
2. After the employer has set salary and paid at least once, use **Decrypt balance** / **Decrypt salary**.
3. **Withdraw** by entering an amount; the contract checks balance in ciphertext (no plaintext revert leak).

### What you see on Etherscan

- Contract calls and **events** with **addresses** (e.g. `SalarySet`, `SalaryPaid`, `Withdrawn`).
- **Not** plaintext dollar amounts — those stay inside encrypted types + off-chain decrypt.

---

## Repository layout

| Path | Contents |
|------|-----------|
| [`contracts/`](contracts/) | Hardhat, `FhePay.sol`, tests, `scripts/deploy.ts`, CoFHE plugin |
| [`frontend/`](frontend/) | Vite + React + wagmi + `@cofhe/sdk/web` |
| [`proejct.md`](proejct.md) | Original product spec |

---

## Prerequisites

- **Node.js 18+**
- **Sepolia ETH** for gas ([faucet links vary](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) — search “Sepolia faucet”).
- A browser wallet (e.g. MetaMask) on **Ethereum Sepolia**

---

## Smart contracts

```bash
cd contracts
npm install
npm run build
npm test
```

### Deploy to Sepolia

1. Copy `contracts/.env.example` to `contracts/.env` and set:

   - **`PRIVATE_KEY`** or **`DEPLOYER_PRIVATE_KEY`** — funded Sepolia account (never commit)
   - **`SEPOLIA_RPC_URL`** — optional; defaults to a public RPC

2. Run:

```bash
cd contracts
npm run deploy:sepolia
```

The script prints the contract address and writes `frontend/.env.local` with `VITE_FHEPAY_ADDRESS=...` when possible.

### Latest Sepolia deployment (this repo)

| | |
|---|---|
| **Contract** | [`0xa446455cc0291FCBdF2259898CC640abDF6443A0`](https://sepolia.etherscan.io/address/0xa446455cc0291FCBdF2259898CC640abDF6443A0) |
| **Owner (deployer)** | [`0x573f08604704227A8b9A6551009Bd39C668Ff8F8`](https://sepolia.etherscan.io/address/0x573f08604704227A8b9A6551009Bd39C668Ff8F8) |

`frontend/.env.local` should include `VITE_FHEPAY_ADDRESS` for this deployment. Re-deploying changes the address — update env accordingly.

**Security:** Never commit private keys. Never share them in chat or tickets. If a key was exposed, move funds to a new wallet and rotate RPC/API keys.

---

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# set VITE_FHEPAY_ADDRESS (and optionally VITE_SEPOLIA_RPC_URL)
npm run dev
```

Production build:

```bash
cd frontend
npm run build
npm run preview   # serves dist/
```

### UI overview

| Area | Notes |
|------|--------|
| **Theme** | `#000` background, white text, `#ffb6c1` accents — [`frontend/src/theme.css`](frontend/src/theme.css) |
| **Pages** | **Home** — marketing + steps + feature grid; **App** — payroll console; **Resources** — FAQ, glossary, troubleshooting |
| **Motion** | Framer Motion on hero, sections, footer; **reduced motion** respected globally |
| **CoFHE build** | Vite `worker` config for `zkProve.worker`; see [`frontend/vite.config.ts`](frontend/vite.config.ts) |

---

## Environment variables

### `contracts/.env` (deploy only, gitignored)

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` or `DEPLOYER_PRIVATE_KEY` | `0x`‑prefixed private key with Sepolia ETH |
| `SEPOLIA_RPC_URL` | Optional HTTPS RPC (Alchemy, Infura, etc.) |

### `frontend/.env.local` (gitignored)

| Variable | Description |
|----------|-------------|
| `VITE_FHEPAY_ADDRESS` | Deployed `FhePay` contract address |
| `VITE_SEPOLIA_RPC_URL` | Optional; wagmi uses it for Sepolia RPC |

---

## Security model (high level)

- **Plaintext** salaries and amounts are encrypted **in the browser** before sending to the contract.
- The **contract** never sees raw salaries as plaintext; it operates on encrypted types and updates ACL for ciphertext handles.
- **Decryption** for viewing balances is done **off-chain** with the CoFHE client and valid permits; employees only see their own row when the contract has `FHE.allow`’d their address on the relevant handle.
- This is a **testnet demo**: review gas, key management, and upgrade policy before any production use.

---

## Limitations

- Amounts use **`euint32`** — pick a single unit (e.g. whole USD) and stay within `0 … 2^32-1` in that unit.
- **Withdraw** uses encrypted `gte` + `select`; if “withdraw” is larger than balance, the balance is unchanged (no plaintext revert leak).
- **Auditor** selective disclosure is described in the UI as future work; the current contract scopes decryption to employees for their ciphertexts.

---

## Troubleshooting

| Issue | What to try |
|--------|-------------|
| Wrong network | Switch wallet to **Ethereum Sepolia** (chain id `11155111`). |
| CoFHE “connecting” forever | Refresh, reconnect wallet, check RPC; ad blockers can interfere with SDK storage iframes. |
| Tx reverts | Confirm Sepolia ETH, correct `VITE_FHEPAY_ADDRESS`, and employer using **owner** wallet. |
| Decrypt fails | Ensure CoFHE ready, and contract has updated ACL for your address after `setSalary` / `paySalary` / `withdraw`. |
| Build fails on CoFHE worker | See [`frontend/vite.config.ts`](frontend/vite.config.ts) `worker` block — ES format for Rollup. |

---

## License

MIT (match the Solidity `UNLICENSED` header in contracts if you need a formal license for your deployment).
