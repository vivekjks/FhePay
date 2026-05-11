# FhePay

FhePay is a confidential payroll app on Ethereum Sepolia built with Fhenix CoFHE.

It now supports:
- Encrypted salaries and balances with `euint128`
- Treasury-backed payroll settlement in ETH
- Pay-interval protection to prevent accidental double-pay
- Single-transaction batch payroll
- On-chain employee roster and active/inactive payroll controls
- Confidential withdrawal requests followed by proof-verified ETH claims
- Pending-withdrawal cancellation that restores the encrypted pending amount

Official CoFHE docs: [https://cofhe-docs.fhenix.zone/](https://cofhe-docs.fhenix.zone/)

Live app: [https://fhepaye.vercel.app](https://fhepaye.vercel.app)

## Live deployment

- Contract: [0x7C6ECBDdF86667B802BEC29d69da72184eEbd9E8](https://sepolia.etherscan.io/address/0x7C6ECBDdF86667B802BEC29d69da72184eEbd9E8)
- Owner: [0x573f08604704227A8b9A6551009Bd39C668Ff8F8](https://sepolia.etherscan.io/address/0x573f08604704227A8b9A6551009Bd39C668Ff8F8)
- Frontend env: `frontend/.env.local` is set to this address
- Deployed package line: `@cofhe/sdk@^0.5.2`, `@cofhe/hardhat-plugin@^0.5.2`, `@fhenixprotocol/cofhe-contracts@^0.1.3`

## What we improved

This version was upgraded directly against the previous judge feedback.

- Replaced `euint32` payroll amounts with `euint128`
  This removes the previous scale constraint and makes ETH-denominated payroll much safer.
- Added real on-chain settlement
  Payroll is now funded by an ETH treasury, and employees can claim ETH into their wallet after a verified decryption flow.
- Added pay-cycle protection
  `paySalary` now respects a configurable `payInterval`, preventing accidental rapid double-pay.
- Added true batch payroll
  `batchPaySalary(address[])` processes multiple employees in one transaction instead of forcing one wallet confirmation per employee.
- Added Wave 4 roster controls
  `setSalary` now registers employees on-chain, `setEmployeeActive` pauses/reactivates future payroll, and `MAX_BATCH_SIZE` caps oversized batches.
- Added claim-based confidential withdrawals
  The app now follows the documented Fhenix `decryptForTx` + `verifyDecryptResult` flow for settlement.
- Added pending-withdrawal recovery
  Employees can call `cancelWithdrawal()` to return the encrypted pending amount to their confidential balance.
- Fixed frontend CoFHE permit handling
  Employee decrypts now explicitly create/use a self permit for `decryptForView`.
- Fixed frontend build and input-validation issues
  The app builds cleanly and handles numeric input more safely.
- Improved UI/UX
  The app now opens directly to the payroll console, with clearer wallet/network readiness, roster views, transaction links, and safer action states.

## Product overview

Transparent blockchains are excellent for settlement but terrible for salary privacy.

FhePay keeps the payroll arithmetic confidential:
- Salaries are encrypted in the browser
- The contract stores encrypted handles, not plaintext salaries
- Payroll accrues in encrypted balances
- Employees decrypt only their own values locally
- Final ETH claims are verified on-chain with threshold-network proofs

This gives a practical privacy boundary:
- Private: salary amounts, accrued confidential balances, withdrawal requests
- Public: treasury funding, wallet addresses, final ETH claim settlement

## Architecture

### Smart contract

[`contracts/contracts/FhePay.sol`](contracts/contracts/FhePay.sol)

Main capabilities:
- `setSalary(address, InEuint128)`
- `paySalary(address)`
- `batchPaySalary(address[])`
- `setEmployeeActive(address, bool)`
- `setPayInterval(uint64)`
- `fundTreasury() payable`
- `requestWithdraw(InEuint128)`
- `cancelWithdrawal()`
- `claimWithdrawal(uint128, bytes)`

Confidential state:
- salary per employee
- balance per employee
- pending withdrawal amount per employee

Public operational state:
- employee directory
- employee active/inactive status
- treasury balance
- payroll interval
- maximum batch size
- last paid timestamp per employee

### Frontend

[`frontend/`](frontend/)

Main app flows:
- Employer funds treasury in ETH
- Employer sets confidential salary in ETH terms
- Employer manages the on-chain roster and active payroll status
- Employer runs payroll for one employee or a whole batch
- Employee decrypts salary/balance locally
- Employee requests a confidential withdrawal
- Employee cancels a pending withdrawal if settlement should be deferred
- App performs proof-backed claim settlement into the wallet

### CoFHE usage

The app uses:
- `encryptInputs(...)` for salary and withdrawal requests
- `decryptForView(...).withPermit()` for private employee reads
- `decryptForTx(...).withoutPermit()` for claim settlement
- `FHE.allowThis`, `FHE.allow`, and `FHE.allowPublic` in the contract

Relevant docs:
- [Permits](https://cofhe-docs.fhenix.zone/client-sdk/guides/permits)
- [Decrypt to transact](https://cofhe-docs.fhenix.zone/client-sdk/guides/decrypt-to-tx)
- [Writing decrypt results to contract](https://cofhe-docs.fhenix.zone/client-sdk/guides/writing-decrypt-result)
- [Access control](https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control)

## User flows

### Employer

1. Connect the owner wallet on Sepolia.
2. Fund the treasury with ETH.
3. Set the payroll interval.
4. Add an employee address and encrypt the salary.
5. Pause/reactivate employees as needed.
6. Run payroll for one employee or use batch payroll.

### Employee

1. Connect the employee wallet on Sepolia.
2. Decrypt salary and balance locally.
3. Request a confidential withdrawal amount.
4. Claim ETH to the wallet with a verified proof.
5. Cancel a pending withdrawal if the claim should return to the encrypted balance.

## Repository layout

- `contracts/` Hardhat project, CoFHE contract, tests, deployment script
- `frontend/` Vite + React + wagmi + `@cofhe/sdk`
- `README.md` project overview and deployment notes

## Local development

### Contracts

```bash
cd contracts
npm install
npm run build
npm test
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

## Deploying to Sepolia

From the repo root:

```bash
cd contracts
npm run deploy:sepolia
```

Expected env vars:
- `PRIVATE_KEY` or `DEPLOYER_PRIVATE_KEY`
- `SEPOLIA_RPC_URL` (recommended, for example `https://ethereum-sepolia-rpc.publicnode.com`)

The deploy script updates `frontend/.env.local` by upserting:

```bash
VITE_FHEPAY_ADDRESS=0x...
```

## Verification performed

Local verification completed:
- `contracts`: build passed
- `contracts`: tests passed
- `frontend`: build passed
- `frontend`: preview responded with HTTP `200`

Live Sepolia smoke test completed against the deployed Wave 4 contract on May 12, 2026:
- funded treasury
- updated pay interval to 60 seconds
- set salary
- ran payroll
- decrypted salary and balance
- requested withdrawal
- decrypted pending settlement amount with `decryptForTx`
- claimed ETH on-chain
- confirmed the post-claim encrypted balance changed correctly

Smoke values:
- salary: `0.001 ETH`
- claimed: `0.0004 ETH`
- post-claim confidential balance: `0.0006 ETH`
- remaining treasury: `0.0016 ETH`

## Known limitations

This version is much closer to a real product, but a few production-hardening steps still remain:
- Treasury solvency is operational, not cryptographically enforced against encrypted liabilities
- Claims settle in public ETH, so the final payout amount becomes public at withdrawal time
- The frontend bundle is still large because of CoFHE worker/WASM payloads
- The current owner is a single wallet; multisig ownership is the right production next step

## Wave 5 backlog

- Auditor / compliance selective disclosure flow
- Multisig owner / treasury controls
- Payroll groups or departments
- Recurring payroll automation
- CSV employee import
- Confidential bonus and one-time grant flows
- Better analytics around treasury runway and upcoming payroll load

## Security note

Never commit private keys.

If a private key was shared in chat or in an issue, rotate it after use.
