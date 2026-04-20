import hre from 'hardhat';
import { CofheClient, Encryptable, FheTypes } from '@cofhe/sdk';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';

describe('FhePay', () => {
  let employerClient: CofheClient;
  let employeeClient: CofheClient;
  let secondEmployeeClient: CofheClient;
  let employer: HardhatEthersSigner;
  let employee: HardhatEthersSigner;
  let secondEmployee: HardhatEthersSigner;

  before(async () => {
    [employer, employee, secondEmployee] = await hre.ethers.getSigners();
    employerClient = await hre.cofhe.createClientWithBatteries(employer);
    employeeClient = await hre.cofhe.createClientWithBatteries(employee);
    secondEmployeeClient = await hre.cofhe.createClientWithBatteries(secondEmployee);
  });

  async function deployFhePay() {
    const Factory = await hre.ethers.getContractFactory('FhePay');
    const fhePay = await Factory.deploy(employer.address);
    await fhePay.waitForDeployment();
    return fhePay;
  }

  it('sets salary, funds treasury, pays, decrypts, and claims a withdrawal', async () => {
    const fhePay = await deployFhePay();

    const salary = hre.ethers.parseEther('0.01');
    const withdrawAmt = hre.ethers.parseEther('0.004');
    const treasuryFunding = hre.ethers.parseEther('1');

    await (await fhePay.connect(employer).fundTreasury({ value: treasuryFunding })).wait();

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(salary)])
      .execute();
    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();

    const salaryCt = await fhePay.salaryCiphertext(employee.address);
    const decryptedSalary = await employeeClient
      .decryptForView(salaryCt, FheTypes.Uint128)
      .execute();
    expect(decryptedSalary).to.equal(salary);

    await (await fhePay.connect(employer).paySalary(employee.address)).wait();

    const balanceCt = await fhePay.balanceCiphertext(employee.address);
    const decryptedBalance = await employeeClient
      .decryptForView(balanceCt, FheTypes.Uint128)
      .execute();
    expect(decryptedBalance).to.equal(salary);

    const [encWithdraw] = await employeeClient
      .encryptInputs([Encryptable.uint128(withdrawAmt)])
      .execute();
    await (await fhePay.connect(employee).requestWithdraw(encWithdraw)).wait();

    const pendingCt = await fhePay.pendingWithdrawalCiphertext(employee.address);
    const decryptResult = await employeeClient
      .decryptForTx(pendingCt)
      .withoutPermit()
      .execute();
    expect(decryptResult.decryptedValue).to.equal(withdrawAmt);

    const contractBalanceBefore = await hre.ethers.provider.getBalance(await fhePay.getAddress());
    await (
      await fhePay
        .connect(employee)
        .claimWithdrawal(decryptResult.decryptedValue, decryptResult.signature)
    ).wait();
    const contractBalanceAfter = await hre.ethers.provider.getBalance(await fhePay.getAddress());
    expect(contractBalanceAfter).to.equal(contractBalanceBefore - withdrawAmt);

    const postClaimBalanceCt = await fhePay.balanceCiphertext(employee.address);
    const postClaimBalance = await employeeClient
      .decryptForView(postClaimBalanceCt, FheTypes.Uint128)
      .execute();
    expect(postClaimBalance).to.equal(salary - withdrawAmt);

    expect(await fhePay.hasPendingWithdrawal(employee.address)).to.equal(false);
  });

  it('reverts setSalary from non-owner', async () => {
    const fhePay = await deployFhePay();

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(100n)])
      .execute();

    await expect(
      fhePay.connect(employee).setSalary(employee.address, encSal),
    ).to.be.revertedWithCustomError(fhePay, 'OwnableUnauthorizedAccount');
  });

  it('blocks double-paying within the configured pay interval', async () => {
    const fhePay = await deployFhePay();

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(500n)])
      .execute();
    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();
    await (await fhePay.connect(employer).paySalary(employee.address)).wait();

    await expect(
      fhePay.connect(employer).paySalary(employee.address),
    ).to.be.revertedWith('FhePay: period locked');
  });

  it('batch pays multiple employees in a single transaction', async () => {
    const fhePay = await deployFhePay();

    const [encSalOne] = await employerClient
      .encryptInputs([Encryptable.uint128(700n)])
      .execute();
    const [encSalTwo] = await employerClient
      .encryptInputs([Encryptable.uint128(900n)])
      .execute();

    await (await fhePay.connect(employer).setSalary(employee.address, encSalOne)).wait();
    await (await fhePay.connect(employer).setSalary(secondEmployee.address, encSalTwo)).wait();

    await (
      await fhePay
        .connect(employer)
        .batchPaySalary([employee.address, secondEmployee.address])
    ).wait();

    const employeeBalanceCt = await fhePay.balanceCiphertext(employee.address);
    const secondEmployeeBalanceCt = await fhePay.balanceCiphertext(secondEmployee.address);

    const employeeBalance = await employeeClient
      .decryptForView(employeeBalanceCt, FheTypes.Uint128)
      .execute();
    const secondEmployeeBalance = await secondEmployeeClient
      .decryptForView(secondEmployeeBalanceCt, FheTypes.Uint128)
      .execute();

    expect(employeeBalance).to.equal(700n);
    expect(secondEmployeeBalance).to.equal(900n);
  });
});
