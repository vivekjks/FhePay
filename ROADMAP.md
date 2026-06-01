# FhePay Roadmap

## Wave 3 - Confidential Payroll Settlement

Status: complete

- `euint128` salaries, balances, and withdrawal requests
- ETH treasury funding and claim settlement
- Pay interval guard against accidental duplicate payroll
- Single-transaction batch payroll
- `decryptForView` employee reads with self permits
- `decryptForTx` claim flow with on-chain `verifyDecryptResult`

## Wave 4 - Production Readiness Pass

Status: complete

- Upgraded CoFHE packages to the current `0.5.x` SDK/plugin line
- Deployed the Wave 4 contract to Ethereum Sepolia
- Added public on-chain employee directory
- Added active/inactive employee payroll status
- Added `MAX_BATCH_SIZE` batch guard
- Added `cancelWithdrawal()` to return pending encrypted claims to confidential balance
- Reworked the frontend into an app-first payroll console
- Added roster loading, batch validation, safer amount parsing, and Etherscan transaction links
- Verified the full encrypted Sepolia smoke flow on May 12, 2026

## Wave 5 - Final Hardening

Status: deployed to Ethereum Sepolia

- Safe-ready two-step ownership transfer with delegated payroll and treasury admins
- Auditor/compliance selective disclosure with employee-scoped ciphertext grants
- Auditor app-level disclosure revoke for future access checks, with documented CoFHE historical-grant limits
- Payroll groups/departments with independent cadence, member management, due-run checks, and skipped inactive/locked members
- Chainlink/Gelato-style `checkUpkeep` and `performUpkeep` hooks for recurring payroll groups
- CSV employee import from the operator console
- Confidential bonus and one-time grant flow
- Treasury runway analytics and funding alerts
- Bundle splitting for CoFHE, wallet, React, motion, icons, and query dependencies
- Expanded contract coverage to 17 passing tests

## Live Wave 5 Deployment

Status: complete

- Contract: `0xd36A6AA303b4c17eCBDB5c0f47B9f216683436CC`
- Owner: `0x5170da78525944160e88B0071342ECAcF9dc47a2`
- Frontend env updated to the Wave 5 address
- Vercel Production and Preview env updated to the Wave 5 address
- Vercel production deployment completed at `https://fhepaye.vercel.app`
- SPA route fallback added so `/app` and `/how-it-works` load directly on Vercel
- Home and proof-flow pages polished with a final product visual and clearer WaveHack story
- Hardened redeploy blocks payroll when the treasury is below the configured alert threshold
- Batch payroll skips inactive, locked, or not-due employees instead of reverting the full batch
- Live encrypted Sepolia smoke passed salary, payroll, withdrawal, claim, bonus, auditor, group, and treasury alert flows
