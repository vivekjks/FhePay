// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/// @title FhePay - confidential payroll with claimable on-chain ETH settlement
/// @notice Salaries, balances, and pending withdrawals are stored as encrypted handles (euint128).
contract FhePay is Ownable, ReentrancyGuard {
    uint256 public constant MAX_BATCH_SIZE = 50;

    mapping(address => euint128) private _salaries;
    mapping(address => euint128) private _balances;
    mapping(address => euint128) private _pendingWithdrawals;
    mapping(address => bool) private _hasSalary;
    mapping(address => bool) private _balanceInitialized;
    mapping(address => bool) private _hasPendingWithdrawal;
    mapping(address => bool) private _isEmployee;
    mapping(address => bool) private _activeEmployees;
    address[] private _employees;
    mapping(address => uint64) public lastPaidAt;

    uint64 public payInterval = 30 days;

    event EmployeeRegistered(address indexed employee);
    event EmployeeStatusUpdated(address indexed employee, bool active);
    event SalarySet(address indexed employee);
    event SalaryPaid(address indexed employee, uint64 paidAt);
    event BatchSalaryPaid(uint256 count, uint64 paidAt);
    event WithdrawalRequested(address indexed account);
    event WithdrawalCanceled(address indexed account);
    event WithdrawalClaimed(address indexed account, uint128 amount);
    event TreasuryFunded(address indexed from, uint256 amount);
    event PayIntervalUpdated(uint64 newInterval);

    constructor(address initialOwner) Ownable(initialOwner) {}

    receive() external payable {
        emit TreasuryFunded(msg.sender, msg.value);
    }

    function fundTreasury() external payable onlyOwner {
        require(msg.value > 0, 'FhePay: no value');
        emit TreasuryFunded(msg.sender, msg.value);
    }

    function setPayInterval(uint64 newInterval) external onlyOwner {
        require(newInterval > 0, 'FhePay: invalid interval');
        payInterval = newInterval;
        emit PayIntervalUpdated(newInterval);
    }

    function _zero() internal returns (euint128) {
        return FHE.asEuint128(0);
    }

    function _grantEmployeeAccess(euint128 handle, address employee) internal {
        FHE.allowThis(handle);
        FHE.allow(handle, employee);
    }

    function _registerEmployee(address employee) internal {
        if (!_isEmployee[employee]) {
            _isEmployee[employee] = true;
            _employees.push(employee);
            emit EmployeeRegistered(employee);
        }

        if (!_activeEmployees[employee]) {
            _activeEmployees[employee] = true;
            emit EmployeeStatusUpdated(employee, true);
        }
    }

    function _ensureBalanceInitialized(address employee) internal {
        if (!_balanceInitialized[employee]) {
            euint128 zero = _zero();
            _balances[employee] = zero;
            _grantEmployeeAccess(_balances[employee], employee);
            _balanceInitialized[employee] = true;
        }
    }

    function _ensureCanPay(address employee) internal view {
        require(_hasSalary[employee], 'FhePay: salary not set');
        require(_activeEmployees[employee], 'FhePay: employee inactive');
        uint64 lastPaid = lastPaidAt[employee];
        if (lastPaid != 0) {
            require(block.timestamp >= uint256(lastPaid) + payInterval, 'FhePay: period locked');
        }
    }

    function _payEmployee(address employee, uint64 paidAt) internal {
        _ensureCanPay(employee);
        _ensureBalanceInitialized(employee);

        euint128 newBal = FHE.add(_balances[employee], _salaries[employee]);
        _balances[employee] = newBal;
        _grantEmployeeAccess(_balances[employee], employee);
        lastPaidAt[employee] = paidAt;
        emit SalaryPaid(employee, paidAt);
    }

    /// @notice Employer sets encrypted salary for an employee (client encrypts plaintext before submission).
    function setSalary(address employee, InEuint128 calldata inSalary) external onlyOwner {
        require(employee != address(0), 'FhePay: zero employee');

        _registerEmployee(employee);
        _ensureBalanceInitialized(employee);
        euint128 encSal = FHE.asEuint128(inSalary);
        _salaries[employee] = encSal;
        _hasSalary[employee] = true;

        FHE.allowThis(_salaries[employee]);
        FHE.allowSender(_salaries[employee]);
        FHE.allow(_salaries[employee], employee);
        emit SalarySet(employee);
    }

    /// @notice Pay one payroll period for a single employee.
    function paySalary(address employee) external onlyOwner {
        _payEmployee(employee, uint64(block.timestamp));
    }

    /// @notice Pay a full payroll batch in a single transaction.
    function batchPaySalary(address[] calldata employees) external onlyOwner {
        require(employees.length > 0, 'FhePay: empty batch');
        require(employees.length <= MAX_BATCH_SIZE, 'FhePay: batch too large');
        uint64 paidAt = uint64(block.timestamp);
        for (uint256 i = 0; i < employees.length; ++i) {
            _payEmployee(employees[i], paidAt);
        }
        emit BatchSalaryPaid(employees.length, paidAt);
    }

    /// @notice Request a withdrawal using an encrypted amount. The claim amount becomes publicly decryptable for settlement.
    function requestWithdraw(InEuint128 calldata inAmount) external {
        require(!_hasPendingWithdrawal[msg.sender], 'FhePay: claim pending');

        _ensureBalanceInitialized(msg.sender);
        euint128 amount = FHE.asEuint128(inAmount);
        FHE.allowSender(amount);

        euint128 bal = _balances[msg.sender];
        ebool sufficient = FHE.gte(bal, amount);
        euint128 approvedAmount = FHE.select(sufficient, amount, _zero());
        euint128 newBal = FHE.select(sufficient, FHE.sub(bal, amount), bal);

        _balances[msg.sender] = newBal;
        _grantEmployeeAccess(_balances[msg.sender], msg.sender);

        _pendingWithdrawals[msg.sender] = approvedAmount;
        _hasPendingWithdrawal[msg.sender] = true;
        _grantEmployeeAccess(_pendingWithdrawals[msg.sender], msg.sender);
        FHE.allowPublic(_pendingWithdrawals[msg.sender]);

        emit WithdrawalRequested(msg.sender);
    }

    /// @notice Cancel a pending withdrawal and return the encrypted pending amount to the employee balance.
    function cancelWithdrawal() external {
        require(_hasPendingWithdrawal[msg.sender], 'FhePay: no pending claim');

        _ensureBalanceInitialized(msg.sender);
        euint128 restoredBalance = FHE.add(_balances[msg.sender], _pendingWithdrawals[msg.sender]);
        _balances[msg.sender] = restoredBalance;
        _grantEmployeeAccess(_balances[msg.sender], msg.sender);

        _pendingWithdrawals[msg.sender] = _zero();
        _hasPendingWithdrawal[msg.sender] = false;
        _grantEmployeeAccess(_pendingWithdrawals[msg.sender], msg.sender);

        emit WithdrawalCanceled(msg.sender);
    }

    /// @notice Finalize a requested withdrawal by verifying the threshold-network signature and sending ETH.
    function claimWithdrawal(uint128 clearAmount, bytes calldata decryptionSignature) external nonReentrant {
        require(_hasPendingWithdrawal[msg.sender], 'FhePay: no pending claim');
        require(
            FHE.verifyDecryptResult(_pendingWithdrawals[msg.sender], clearAmount, decryptionSignature),
            'FhePay: invalid decrypt signature'
        );
        _pendingWithdrawals[msg.sender] = _zero();
        _hasPendingWithdrawal[msg.sender] = false;
        _grantEmployeeAccess(_pendingWithdrawals[msg.sender], msg.sender);

        if (clearAmount == 0) {
            emit WithdrawalClaimed(msg.sender, 0);
            return;
        }

        require(address(this).balance >= clearAmount, 'FhePay: insufficient treasury');

        (bool ok,) = payable(msg.sender).call{value: clearAmount}('');
        require(ok, 'FhePay: transfer failed');

        emit WithdrawalClaimed(msg.sender, clearAmount);
    }

    function salaryCiphertext(address employee) external view returns (euint128) {
        return _salaries[employee];
    }

    function balanceCiphertext(address employee) external view returns (euint128) {
        return _balances[employee];
    }

    function pendingWithdrawalCiphertext(address employee) external view returns (euint128) {
        return _pendingWithdrawals[employee];
    }

    function hasSalary(address employee) external view returns (bool) {
        return _hasSalary[employee];
    }

    function hasPendingWithdrawal(address employee) external view returns (bool) {
        return _hasPendingWithdrawal[employee];
    }

    function employeeCount() external view returns (uint256) {
        return _employees.length;
    }

    function employeeAt(uint256 index) external view returns (address) {
        return _employees[index];
    }

    function isEmployee(address employee) external view returns (bool) {
        return _isEmployee[employee];
    }

    function isActiveEmployee(address employee) external view returns (bool) {
        return _activeEmployees[employee];
    }

    function setEmployeeActive(address employee, bool active) external onlyOwner {
        require(_isEmployee[employee], 'FhePay: unknown employee');
        require(_activeEmployees[employee] != active, 'FhePay: status unchanged');
        _activeEmployees[employee] = active;
        emit EmployeeStatusUpdated(employee, active);
    }

    function nextPayAt(address employee) external view returns (uint64) {
        uint64 lastPaid = lastPaidAt[employee];
        if (lastPaid == 0) return 0;
        return lastPaid + payInterval;
    }

    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
