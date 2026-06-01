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
- Wave 5 delegated payroll/treasury admins, two-step Safe-ready ownership, payroll groups, CSV import, auditor disclosure, recurring payroll upkeep, confidential bonuses, and treasury runway alerts

Official CoFHE docs: [https://cofhe-docs.fhenix.zone/](https://cofhe-docs.fhenix.zone/)

Live app: [https://fhepaye.vercel.app](https://fhepaye.vercel.app)

## Live deployment

- Contract: [0x2d54375aef6cfdF0D0F696363b000119a26F5E8e](https://sepolia.etherscan.io/address/0x2d54375aef6cfdF0D0F696363b000119a26F5E8e)
- Owner: [0xB3A78E23993cc416DF79c8E954e427Ef15063b20](https://sepolia.etherscan.io/address/0xB3A78E23993cc416DF79c8E954e427Ef15063b20)
- Frontend env: `frontend/.env.local` is set to this address
- Vercel env: Production and Preview are set to this address
- Deployed package line: `@cofhe/sdk@^0.5.2`, `@cofhe/hardhat-plugin@^0.5.2`, `@fhenixprotocol/cofhe-contracts@^0.1.3`
- Wave 5 hardened deployment: deployed to Ethereum Sepolia on May 31, 2026.

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
  The site now opens to a clean product home page, with the payroll console at `/app`, clearer wallet/network readiness, roster views, transaction links, and safer action states.
- Completed Wave 5 governance and operations
  Ownership now uses OpenZeppelin two-step transfer for Safe handoff, while payroll and treasury actions can be delegated without transferring ownership.
- Added selective auditor disclosure
  Payroll admins can enable auditors, grant employee-scoped ciphertext access, and revoke app-level future disclosure; auditor wallets get a dedicated decrypt-only review panel.
- Added payroll groups and automation hooks
  Groups have independent cadences, member management, due-run checks, manual execution, and Chainlink/Gelato-style `checkUpkeep` / `performUpkeep`. Group runs skip inactive or locked members instead of reverting the whole group.
- Added CSV import and confidential bonuses
  Operators can import address/salary/group rows, encrypt each salary client-side, and grant one-time encrypted bonuses.
- Added treasury analytics and bundle splitting
  The app tracks alert thresholds and estimated runway, and the production build splits CoFHE, wallet, React, motion, icon, and query chunks.

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
- `transferOwnership(address)` / `acceptOwnership()`
- `setPayrollAdmin(address, bool)`
- `setTreasuryAdmin(address, bool)`
- `setAuditor(address, bool)`
- `grantAuditorAccess(address, address)`
- `revokeAuditorAccess(address, address)`
- `setSalary(address, InEuint128)`
- `paySalary(address)`
- `batchPaySalary(address[])`
- `createPayrollGroup(string, uint64)`
- `setPayrollGroup(uint256, string, uint64, bool)`
- `setPayrollGroupMember(uint256, address, bool)`
- `payPayrollGroup(uint256)`
- `checkUpkeep(bytes)` / `performUpkeep(bytes)`
- `grantBonus(address, InEuint128)`
- `setEmployeeActive(address, bool)`
- `setPayInterval(uint64)`
- `setTreasuryAlertThreshold(uint256)`
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
- delegated payroll and treasury admins
- auditor registry and employee-level disclosure grants
- payroll groups and recurring schedules
- treasury alert threshold
- maximum batch size
- last paid timestamp per employee

### Frontend

[`frontend/`](frontend/)

Main app flows:
- Employer funds treasury in ETH
- Employer sets confidential salary in ETH terms
- Employer manages the on-chain roster and active payroll status
- Employer runs payroll for one employee or a whole batch
- Employer delegates payroll/treasury roles and starts two-step ownership transfer to a Safe
- Employer creates payroll groups, imports CSV rows, grants bonuses, and configures treasury alerts
- Auditor decrypts only employee salary/balance/pending handles explicitly disclosed to the auditor wallet
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
6. Create payroll groups, import CSV rows, or grant confidential bonuses.
7. Run payroll for one employee, a batch, or a due payroll group.

### Auditor

1. Connect an enabled auditor wallet on Sepolia.
2. Enter an employee address with an active disclosure grant.
3. Decrypt only the salary, balance, or pending withdrawal handles granted to that auditor.

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
- `contracts`: build passed on May 31, 2026
- `contracts`: 17 tests passed on May 31, 2026
- `frontend`: TypeScript check passed on May 31, 2026
- `frontend`: production build passed on May 31, 2026
- `frontend`: preview responded with HTTP `200` on May 31, 2026
- `frontend`: in-app browser smoke test rendered the Wave 5 console with no console errors on May 31, 2026
- `frontend`: Vercel production deploy passed on June 1, 2026
- `frontend`: live Vercel routes `/`, `/app`, and `/how-it-works` returned HTTP `200` on June 1, 2026
- `frontend`: live Vercel smoke test rendered the new contract address with no console errors on June 1, 2026

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

Live Sepolia Wave 5 smoke test completed against the hardened contract on May 31, 2026:
- deployed bytecode matched the local artifact
- funded treasury
- configured the treasury alert threshold and pay interval
- set encrypted salary
- ran payroll
- decrypted salary and balance
- requested withdrawal
- decrypted pending settlement amount with `decryptForTx`
- claimed ETH on-chain
- granted a confidential bonus
- configured auditor access
- created a payroll group and assigned the employee

Smoke values:
- salary: `0.001 ETH`
- claimed: `0.0004 ETH`
- final confidential balance after claim and bonus: `0.0007 ETH`
- remaining treasury: `0.0096 ETH`
- employee count: `1`
- payroll group count: `1`
- treasury below alert: `false`

## Known limitations

This version is much closer to a real product, but a few production-hardening steps still remain:
- Treasury solvency is operational, not cryptographically enforced against encrypted liabilities
- Claims settle in public ETH, so the final payout amount becomes public at withdrawal time
- Disabling an auditor or revoking disclosure prevents future app-level access checks, but historical CoFHE `FHE.allow` grants on old ciphertext handles cannot be removed from the ACL. Rotate/update ciphertext handles for stricter post-revocation secrecy.
- The frontend bundle is still large because of CoFHE worker/WASM payloads
- Automation forwarders must be granted payroll admin before calling `performUpkeep`
- `npm audit` still reports transitive issues in the Hardhat/Vite toolchain; the available automatic fixes require breaking major-version upgrades and should be handled as a separate migration.

## Wave 5 backlog

Status: deployed to Ethereum Sepolia.

- Auditor / compliance selective disclosure flow
- Safe-ready two-step ownership and delegated treasury controls
- Payroll groups / departments
- Recurring payroll automation hooks
- CSV employee import
- Confidential bonus and one-time grant flows
- Better analytics around treasury runway and upcoming payroll load
- Bundle splitting for the CoFHE/WASM payload

## Security note

Never commit private keys.

If a private key was shared in chat or in an issue, rotate it after use.
