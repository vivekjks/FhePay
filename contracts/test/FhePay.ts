import hre from 'hardhat';
import { CofheClient, Encryptable, FheTypes } from '@cofhe/sdk';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';

describe('FhePay', () => {
  let employerClient: CofheClient;
  let employeeClient: CofheClient;
  let secondEmployeeClient: CofheClient;
  let auditorClient: CofheClient;
  let employer: HardhatEthersSigner;
  let employee: HardhatEthersSigner;
  let secondEmployee: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;

  before(async () => {
    [employer, employee, secondEmployee, auditor] = await hre.ethers.getSigners();
    employerClient = await hre.cofhe.createClientWithBatteries(employer);
    employeeClient = await hre.cofhe.createClientWithBatteries(employee);
    secondEmployeeClient = await hre.cofhe.createClientWithBatteries(secondEmployee);
    auditorClient = await hre.cofhe.createClientWithBatteries(auditor);
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
    ).to.be.revertedWith('FhePay: payroll admin only');
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
    ).to.be.revertedWith('FhePay: employee not payable');
  });

  it('tracks employee directory and active status on-chain', async () => {
    const fhePay = await deployFhePay();

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(600n)])
      .execute();

    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();
    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();

    expect(await fhePay.employeeCount()).to.equal(1n);
    expect(await fhePay.employeeAt(0)).to.equal(employee.address);
    expect(await fhePay.isEmployee(employee.address)).to.equal(true);
    expect(await fhePay.isActiveEmployee(employee.address)).to.equal(true);

    await (await fhePay.connect(employer).setEmployeeActive(employee.address, false)).wait();
    expect(await fhePay.isActiveEmployee(employee.address)).to.equal(false);
    await (await fhePay.connect(employer).setEmployeeActive(employee.address, false)).wait();

    await expect(
      fhePay.connect(employer).paySalary(employee.address),
    ).to.be.revertedWith('FhePay: employee not payable');

    await (await fhePay.connect(employer).setEmployeeActive(employee.address, true)).wait();
    await (await fhePay.connect(employer).paySalary(employee.address)).wait();
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

  it('skips inactive or locked employees during batch payroll', async () => {
    const fhePay = await deployFhePay();

    const [encSalOne] = await employerClient
      .encryptInputs([Encryptable.uint128(700n)])
      .execute();
    const [encSalTwo] = await employerClient
      .encryptInputs([Encryptable.uint128(900n)])
      .execute();

    await (await fhePay.connect(employer).setSalary(employee.address, encSalOne)).wait();
    await (await fhePay.connect(employer).setSalary(secondEmployee.address, encSalTwo)).wait();
    await (await fhePay.connect(employer).setEmployeeActive(secondEmployee.address, false)).wait();
    await (await fhePay.connect(employer).batchPaySalary([employee.address, secondEmployee.address])).wait();

    const employeeBalanceCt = await fhePay.balanceCiphertext(employee.address);
    const secondEmployeeBalanceCt = await fhePay.balanceCiphertext(secondEmployee.address);

    const employeeBalance = await employeeClient
      .decryptForView(employeeBalanceCt, FheTypes.Uint128)
      .execute();
    const secondEmployeeBalance = await secondEmployeeClient
      .decryptForView(secondEmployeeBalanceCt, FheTypes.Uint128)
      .execute();

    expect(employeeBalance).to.equal(700n);
    expect(secondEmployeeBalance).to.equal(0n);
  });

  it('allows delegated payroll and treasury admins without transferring ownership', async () => {
    const fhePay = await deployFhePay();

    await expect(
      fhePay.connect(employee).fundTreasury({ value: hre.ethers.parseEther('0.1') }),
    ).to.be.revertedWith('FhePay: treasury admin only');

    await (await fhePay.connect(employer).setTreasuryAdmin(employee.address, true)).wait();
    await (await fhePay.connect(employer).setTreasuryAdmin(employee.address, true)).wait();
    await (await fhePay.connect(employee).fundTreasury({ value: hre.ethers.parseEther('0.1') })).wait();
    expect(await fhePay.treasuryBalance()).to.equal(hre.ethers.parseEther('0.1'));

    await (await fhePay.connect(employer).setPayrollAdmin(secondEmployee.address, true)).wait();
    await (await fhePay.connect(employer).setPayrollAdmin(secondEmployee.address, true)).wait();
    const [encSal] = await secondEmployeeClient
      .encryptInputs([Encryptable.uint128(1000n)])
      .execute();
    await (await fhePay.connect(secondEmployee).setSalary(employee.address, encSal)).wait();

    expect(await fhePay.isPayrollAdmin(secondEmployee.address)).to.equal(true);
    expect(await fhePay.hasSalary(employee.address)).to.equal(true);
  });

  it('uses two-step ownership transfers for Safe-ready administration', async () => {
    const fhePay = await deployFhePay();

    await expect(fhePay.connect(employer).renounceOwnership()).to.be.revertedWith('FhePay: ownership required');

    await (await fhePay.connect(employer).transferOwnership(employee.address)).wait();
    expect(await fhePay.owner()).to.equal(employer.address);
    expect(await fhePay.pendingOwner()).to.equal(employee.address);

    await expect(fhePay.connect(secondEmployee).acceptOwnership())
      .to.be.revertedWithCustomError(fhePay, 'OwnableUnauthorizedAccount')
      .withArgs(secondEmployee.address);

    await (await fhePay.connect(employee).acceptOwnership()).wait();
    expect(await fhePay.owner()).to.equal(employee.address);
    expect(await fhePay.pendingOwner()).to.equal(hre.ethers.ZeroAddress);
  });

  it('grants confidential one-time bonuses to employee balances', async () => {
    const fhePay = await deployFhePay();

    const bonus = hre.ethers.parseEther('0.015');
    const [encBonus] = await employerClient
      .encryptInputs([Encryptable.uint128(bonus)])
      .execute();

    await (await fhePay.connect(employer).grantBonus(employee.address, encBonus)).wait();

    const balanceCt = await fhePay.balanceCiphertext(employee.address);
    const balance = await employeeClient
      .decryptForView(balanceCt, FheTypes.Uint128)
      .execute();

    expect(balance).to.equal(bonus);
    expect(await fhePay.isEmployee(employee.address)).to.equal(true);
  });

  it('supports auditor selective disclosure grants that continue across balance updates', async () => {
    const fhePay = await deployFhePay();

    const salary = 1200n;
    const bonus = 300n;
    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(salary)])
      .execute();
    const [encBonus] = await employerClient
      .encryptInputs([Encryptable.uint128(bonus)])
      .execute();

    await (await fhePay.connect(employer).setAuditor(auditor.address, true)).wait();
    await (await fhePay.connect(employer).setAuditor(auditor.address, true)).wait();
    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();
    await (await fhePay.connect(employer).grantAuditorAccess(auditor.address, employee.address)).wait();

    const salaryCt = await fhePay.salaryCiphertext(employee.address);
    const auditorSalary = await auditorClient
      .decryptForView(salaryCt, FheTypes.Uint128)
      .execute();
    expect(auditorSalary).to.equal(salary);

    await (await fhePay.connect(employer).paySalary(employee.address)).wait();
    await (await fhePay.connect(employer).grantBonus(employee.address, encBonus)).wait();

    const balanceCt = await fhePay.balanceCiphertext(employee.address);
    const auditorBalance = await auditorClient
      .decryptForView(balanceCt, FheTypes.Uint128)
      .execute();
    expect(auditorBalance).to.equal(salary + bonus);
    expect(await fhePay.canAuditEmployee(auditor.address, employee.address)).to.equal(true);

    await (await fhePay.connect(employer).revokeAuditorAccess(auditor.address, employee.address)).wait();
    expect(await fhePay.canAuditEmployee(auditor.address, employee.address)).to.equal(false);
  });

  it('runs due payroll groups and blocks early group runs', async () => {
    const fhePay = await deployFhePay();

    const [encSalOne] = await employerClient
      .encryptInputs([Encryptable.uint128(400n)])
      .execute();
    const [encSalTwo] = await employerClient
      .encryptInputs([Encryptable.uint128(500n)])
      .execute();

    await (await fhePay.connect(employer).setPayInterval(60)).wait();
    await (await fhePay.connect(employer).setSalary(employee.address, encSalOne)).wait();
    await (await fhePay.connect(employer).setSalary(secondEmployee.address, encSalTwo)).wait();
    await (await fhePay.connect(employer).createPayrollGroup('Engineering', 60)).wait();
    await (await fhePay.connect(employer).setPayrollGroupMember(0, employee.address, true)).wait();
    await (await fhePay.connect(employer).setPayrollGroupMember(0, employee.address, true)).wait();
    await (await fhePay.connect(employer).setPayrollGroupMember(0, secondEmployee.address, true)).wait();

    const info = await fhePay.payrollGroupInfo(0);
    expect(info.name).to.equal('Engineering');
    expect(info.memberCount).to.equal(2n);
    expect(await fhePay.isPayrollGroupDue(0)).to.equal(true);

    await (await fhePay.connect(employer).payPayrollGroup(0)).wait();
    await expect(fhePay.connect(employer).payPayrollGroup(0)).to.be.revertedWith('FhePay: group not due');

    await hre.network.provider.send('evm_increaseTime', [61]);
    await hre.network.provider.send('evm_mine');
    expect(await fhePay.isPayrollGroupDue(0)).to.equal(true);

    await (await fhePay.connect(employer).payPayrollGroup(0)).wait();

    const employeeBalanceCt = await fhePay.balanceCiphertext(employee.address);
    const secondEmployeeBalanceCt = await fhePay.balanceCiphertext(secondEmployee.address);
    const employeeBalance = await employeeClient
      .decryptForView(employeeBalanceCt, FheTypes.Uint128)
      .execute();
    const secondEmployeeBalance = await secondEmployeeClient
      .decryptForView(secondEmployeeBalanceCt, FheTypes.Uint128)
      .execute();

    expect(employeeBalance).to.equal(800n);
    expect(secondEmployeeBalance).to.equal(1000n);
  });

  it('skips inactive members during group payroll instead of reverting the whole group', async () => {
    const fhePay = await deployFhePay();

    const [encSalOne] = await employerClient
      .encryptInputs([Encryptable.uint128(400n)])
      .execute();
    const [encSalTwo] = await employerClient
      .encryptInputs([Encryptable.uint128(500n)])
      .execute();

    await (await fhePay.connect(employer).setSalary(employee.address, encSalOne)).wait();
    await (await fhePay.connect(employer).setSalary(secondEmployee.address, encSalTwo)).wait();
    await (await fhePay.connect(employer).setEmployeeActive(secondEmployee.address, false)).wait();
    await (await fhePay.connect(employer).createPayrollGroup('Support', 60)).wait();
    await (await fhePay.connect(employer).setPayrollGroupMember(0, employee.address, true)).wait();
    await (await fhePay.connect(employer).setPayrollGroupMember(0, secondEmployee.address, true)).wait();

    const coder = hre.ethers.AbiCoder.defaultAbiCoder();
    const [needed] = await fhePay.checkUpkeep(coder.encode(['uint256'], [0]));
    expect(needed).to.equal(true);

    await (await fhePay.connect(employer).payPayrollGroup(0)).wait();

    const employeeBalanceCt = await fhePay.balanceCiphertext(employee.address);
    const employeeBalance = await employeeClient
      .decryptForView(employeeBalanceCt, FheTypes.Uint128)
      .execute();
    expect(employeeBalance).to.equal(400n);

    const secondEmployeeBalanceCt = await fhePay.balanceCiphertext(secondEmployee.address);
    const secondEmployeeBalance = await secondEmployeeClient
      .decryptForView(secondEmployeeBalanceCt, FheTypes.Uint128)
      .execute();
    expect(secondEmployeeBalance).to.equal(0n);
  });

  it('uses the payroll group cadence for recurring group runs', async () => {
    const fhePay = await deployFhePay();

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(400n)])
      .execute();

    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();
    await (await fhePay.connect(employer).createPayrollGroup('Weekly', 60)).wait();
    await (await fhePay.connect(employer).setPayrollGroupMember(0, employee.address, true)).wait();

    await (await fhePay.connect(employer).payPayrollGroup(0)).wait();
    await hre.network.provider.send('evm_increaseTime', [61]);
    await hre.network.provider.send('evm_mine');
    await (await fhePay.connect(employer).payPayrollGroup(0)).wait();

    const balanceCt = await fhePay.balanceCiphertext(employee.address);
    const balance = await employeeClient
      .decryptForView(balanceCt, FheTypes.Uint128)
      .execute();

    expect(balance).to.equal(800n);
  });

  it('exposes automation-compatible upkeep for due payroll groups', async () => {
    const fhePay = await deployFhePay();

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(250n)])
      .execute();
    const coder = hre.ethers.AbiCoder.defaultAbiCoder();
    const checkData = coder.encode(['uint256'], [0]);

    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();
    await (await fhePay.connect(employer).createPayrollGroup('Ops', 60)).wait();
    await (await fhePay.connect(employer).setPayrollGroupMember(0, employee.address, true)).wait();

    const [neededBefore, performData] = await fhePay.checkUpkeep(checkData);
    expect(neededBefore).to.equal(true);
    expect(performData).to.equal(checkData);

    await (await fhePay.connect(employer).performUpkeep(performData)).wait();

    const [neededAfter] = await fhePay.checkUpkeep(checkData);
    expect(neededAfter).to.equal(false);

    const balanceCt = await fhePay.balanceCiphertext(employee.address);
    const balance = await employeeClient
      .decryptForView(balanceCt, FheTypes.Uint128)
      .execute();
    expect(balance).to.equal(250n);
  });

  it('tracks treasury alert thresholds on-chain', async () => {
    const fhePay = await deployFhePay();

    await (await fhePay.connect(employer).setTreasuryAlertThreshold(hre.ethers.parseEther('1'))).wait();
    expect(await fhePay.treasuryBelowAlert()).to.equal(true);

    await (await fhePay.connect(employer).fundTreasury({ value: hre.ethers.parseEther('1.1') })).wait();
    expect(await fhePay.treasuryBelowAlert()).to.equal(false);
  });

  it('blocks payroll while the treasury is below the configured alert threshold', async () => {
    const fhePay = await deployFhePay();

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(100n)])
      .execute();

    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();
    await (await fhePay.connect(employer).setTreasuryAlertThreshold(hre.ethers.parseEther('0.1'))).wait();

    await expect(
      fhePay.connect(employer).paySalary(employee.address),
    ).to.be.revertedWith('FhePay: treasury below threshold');

    await (await fhePay.connect(employer).fundTreasury({ value: hre.ethers.parseEther('0.1') })).wait();
    await (await fhePay.connect(employer).paySalary(employee.address)).wait();
  });

  it('lets employees cancel a pending withdrawal and restore encrypted balance', async () => {
    const fhePay = await deployFhePay();

    const salary = hre.ethers.parseEther('0.02');
    const withdrawAmt = hre.ethers.parseEther('0.007');

    const [encSal] = await employerClient
      .encryptInputs([Encryptable.uint128(salary)])
      .execute();
    await (await fhePay.connect(employer).setSalary(employee.address, encSal)).wait();
    await (await fhePay.connect(employer).paySalary(employee.address)).wait();

    const [encWithdraw] = await employeeClient
      .encryptInputs([Encryptable.uint128(withdrawAmt)])
      .execute();
    await (await fhePay.connect(employee).requestWithdraw(encWithdraw)).wait();
    expect(await fhePay.hasPendingWithdrawal(employee.address)).to.equal(true);

    await (await fhePay.connect(employee).cancelWithdrawal()).wait();
    expect(await fhePay.hasPendingWithdrawal(employee.address)).to.equal(false);

    const balanceCt = await fhePay.balanceCiphertext(employee.address);
    const balance = await employeeClient
      .decryptForView(balanceCt, FheTypes.Uint128)
      .execute();
    expect(balance).to.equal(salary);
  });
});
