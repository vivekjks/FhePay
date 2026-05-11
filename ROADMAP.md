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

## Wave 5 - Next Hardening

Status: planned

- Multisig ownership and treasury administration
- Auditor/compliance selective-disclosure permits
- Payroll groups, departments, and CSV import
- Recurring payroll automation
- Confidential bonus and one-time grant flows
- Treasury runway analytics and funding alerts
- Bundle splitting for the CoFHE/WASM payload
