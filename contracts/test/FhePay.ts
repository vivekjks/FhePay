import hre from 'hardhat';
import { CofheClient, Encryptable, FheTypes } from '@cofhe/sdk';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';

describe('FhePay', () => {
  let employerClient: CofheClient;
  let employeeClient: CofheClient;
  let employer: HardhatEthersSigner;
  let employee: HardhatEthersSigner;

  before(async () => {
    [employer, employee] = await hre.ethers.getSigners();
    employerClient = await hre.cofhe.createClientWithBatteries(employer);
    employeeClient = await hre.cofhe.createClientWithBatteries(employee);
  });

  it('sets salary, pays, employee decrypts balance, withdraws', async () => {
    const Factory = await hre.ethers.getContractFactory('FhePay');
    const fhePay = await Factory.deploy(employer.address);
    await fhePay.waitForDeployment();

    const salary = 5000n;
    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint32(salary)])
      .execute();

    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();

    const salCt = await fhePay.salaryCiphertext(employee.address);
    const decSal = await employerClient
      .decryptForView(salCt, FheTypes.Uint32)
      .execute();
    expect(decSal).to.equal(salary);

    await (await fhePay.connect(employer).paySalary(employee.address)).wait();

    let balCt = await fhePay.balanceCiphertext(employee.address);
    let decBal = await employeeClient.decryptForView(balCt, FheTypes.Uint32).execute();
    expect(decBal).to.equal(salary);

    const withdrawAmt = 2000n;
    const [encWd] = await employeeClient
      .encryptInputs([Encryptable.uint32(withdrawAmt)])
      .execute();
    await (await fhePay.connect(employee).withdraw(encWd)).wait();

    balCt = await fhePay.balanceCiphertext(employee.address);
    decBal = await employeeClient.decryptForView(balCt, FheTypes.Uint32).execute();
    expect(decBal).to.equal(salary - withdrawAmt);
  });

  it('reverts setSalary from non-owner', async () => {
    const Factory = await hre.ethers.getContractFactory('FhePay');
    const fhePay = await Factory.deploy(employer.address);
    await fhePay.waitForDeployment();

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint32(100n)])
      .execute();

    await expect(
      fhePay.connect(employee).setSalary(employee.address, encSal),
    ).to.be.revertedWithCustomError(fhePay, 'OwnableUnauthorizedAccount');
  });
});
