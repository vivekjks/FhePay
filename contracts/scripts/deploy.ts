import hre from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

function upsertEnvLine(filePath: string, key: string, value: string) {
  const nextLine = `${key}=${value}`;
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = current
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const withoutKey = lines.filter((line) => !line.startsWith(`${key}=`));
  withoutKey.push(nextLine);
  fs.writeFileSync(filePath, `${withoutKey.join('\n')}\n`, 'utf8');
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const Factory = await hre.ethers.getContractFactory('FhePay');
  const fhePay = await Factory.deploy(deployer.address);
  await fhePay.waitForDeployment();

  const address = await fhePay.getAddress();
  console.log('FhePay deployed to:', address);

  const frontendEnv = path.join(__dirname, '..', '..', 'frontend', '.env.local');
  try {
    upsertEnvLine(frontendEnv, 'VITE_FHEPAY_ADDRESS', address);
    console.log('Updated', frontendEnv);
  } catch {
    console.log('Could not write frontend/.env.local - set VITE_FHEPAY_ADDRESS manually.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
