import hre from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const Factory = await hre.ethers.getContractFactory('FhePay');
  const fhePay = await Factory.deploy(deployer.address);
  await fhePay.waitForDeployment();

  const address = await fhePay.getAddress();
  console.log('FhePay deployed to:', address);

  const envLine = `VITE_FHEPAY_ADDRESS=${address}\n`;
  const frontendEnv = path.join(__dirname, '..', '..', 'frontend', '.env.local');
  try {
    fs.writeFileSync(frontendEnv, envLine, { flag: 'w' });
    console.log('Wrote', frontendEnv);
  } catch {
    console.log('Could not write frontend/.env.local — set VITE_FHEPAY_ADDRESS manually.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
