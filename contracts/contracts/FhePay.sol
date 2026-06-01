// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Ownable2Step} from '@openzeppelin/contracts/access/Ownable2Step.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/// @title FhePay - confidential payroll with claimable on-chain ETH settlement
/// @notice Salaries, balances, and pending withdrawals are stored as encrypted handles (euint128).
contract FhePay is Ownable2Step, ReentrancyGuard {
    uint256 public constant MAX_BATCH_SIZE = 50;

    struct PayrollGroup {
        string name;
        uint64 interval;
        uint64 lastRunAt;
        bool active;
        address[] members;
        mapping(address => uint256) memberIndex;
    }

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

    mapping(address => bool) private _payrollAdmins;
    mapping(address => bool) private _treasuryAdmins;
    mapping(address => bool) private _auditors;
    mapping(address => bool) private _knownAuditors;
    address[] private _auditorList;
    mapping(address => mapping(address => bool)) private _auditorEmployeeAccess;
    mapping(address => address[]) private _employeeAuditors;

    mapping(uint256 => PayrollGroup) private _payrollGroups;
    uint256 private _payrollGroupCount;

    uint64 public payInterval = 30 days;
    uint256 public treasuryAlertThreshold;

    event EmployeeRegistered(address indexed employee);
    event EmployeeStatusUpdated(address indexed employee, bool active);
    event SalarySet(address indexed employee);
    event SalaryPaid(address indexed employee, uint64 paidAt);
    event BatchSalaryPaid(uint256 count, uint64 paidAt);
    event BonusGranted(address indexed employee);
    event WithdrawalRequested(address indexed account);
    event WithdrawalCanceled(address indexed account);
    event WithdrawalClaimed(address indexed account, uint128 amount);
    event TreasuryFunded(address indexed from, uint256 amount);
    event PayIntervalUpdated(uint64 newInterval);
    event TreasuryAlertThresholdUpdated(uint256 threshold);
    event PayrollAdminUpdated(address indexed account, bool allowed);
    event TreasuryAdminUpdated(address indexed account, bool allowed);
    event AuditorUpdated(address indexed auditor, bool allowed);
    event AuditorAccessGranted(address indexed auditor, address indexed employee);
    event AuditorAccessRevoked(address indexed auditor, address indexed employee);
    event PayrollGroupCreated(uint256 indexed groupId, string name, uint64 interval);
    event PayrollGroupUpdated(uint256 indexed groupId, string name, uint64 interval, bool active);
    event PayrollGroupMemberUpdated(uint256 indexed groupId, address indexed employee, bool included);
    event PayrollGroupPaid(uint256 indexed groupId, uint256 count, uint64 paidAt);
    event PayrollGroupUpkeepPerformed(uint256 indexed groupId, uint256 count, uint64 paidAt);

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyPayrollAdmin() {
        require(msg.sender == owner() || _payrollAdmins[msg.sender], 'FhePay: payroll admin only');
        _;
    }

    modifier onlyTreasuryAdmin() {
        require(msg.sender == owner() || _treasuryAdmins[msg.sender], 'FhePay: treasury admin only');
        _;
    }

    receive() external payable {
        emit TreasuryFunded(msg.sender, msg.value);
    }

    function renounceOwnership() public view override onlyOwner {
        revert('FhePay: ownership required');
    }

    function fundTreasury() external payable onlyTreasuryAdmin {
        require(msg.value > 0, 'FhePay: no value');
        emit TreasuryFunded(msg.sender, msg.value);
    }

    function setPayInterval(uint64 newInterval) external onlyPayrollAdmin {
        require(newInterval > 0, 'FhePay: invalid interval');
        payInterval = newInterval;
        emit PayIntervalUpdated(newInterval);
    }

    function setTreasuryAlertThreshold(uint256 threshold) external onlyTreasuryAdmin {
        treasuryAlertThreshold = threshold;
        emit TreasuryAlertThresholdUpdated(threshold);
    }

    function setPayrollAdmin(address account, bool allowed) external onlyOwner {
        require(account != address(0), 'FhePay: zero account');
        if (_payrollAdmins[account] == allowed) return;
        _payrollAdmins[account] = allowed;
        emit PayrollAdminUpdated(account, allowed);
    }

    function setTreasuryAdmin(address account, bool allowed) external onlyOwner {
        require(account != address(0), 'FhePay: zero account');
        if (_treasuryAdmins[account] == allowed) return;
        _treasuryAdmins[account] = allowed;
        emit TreasuryAdminUpdated(account, allowed);
    }

    function setAuditor(address auditor, bool allowed) external onlyOwner {
        require(auditor != address(0), 'FhePay: zero auditor');
        if (_auditors[auditor] == allowed) return;
        _auditors[auditor] = allowed;
        if (allowed && !_knownAuditors[auditor]) {
            _knownAuditors[auditor] = true;
            _auditorList.push(auditor);
        }
        emit AuditorUpdated(auditor, allowed);
    }

    function _zero() internal returns (euint128) {
        return FHE.asEuint128(0);
    }

    function _grantEmployeeAccess(euint128 handle, address employee) internal {
        FHE.allowThis(handle);
        FHE.allow(handle, employee);
        _grantCurrentAuditorAccess(employee, handle);
    }

    function _grantCurrentAuditorAccess(address employee, euint128 handle) internal {
        address[] storage auditors = _employeeAuditors[employee];
        for (uint256 i = 0; i < auditors.length; ++i) {
            address auditor = auditors[i];
            if (_auditors[auditor] && _auditorEmployeeAccess[auditor][employee]) {
                FHE.allow(handle, auditor);
            }
        }
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

    function _ensureCanPay(address employee, uint64 interval) internal view {
        require(_canPay(employee, interval), 'FhePay: employee not payable');
    }

    function _canPay(address employee, uint64 interval) internal view returns (bool) {
        if (!_hasSalary[employee] || !_activeEmployees[employee]) return false;
        uint64 lastPaid = lastPaidAt[employee];
        return lastPaid == 0 || block.timestamp >= uint256(lastPaid) + interval;
    }

    function _ensureTreasuryHealthy() internal view {
        if (treasuryAlertThreshold > 0) {
            require(address(this).balance >= treasuryAlertThreshold, 'FhePay: treasury below threshold');
        }
    }

    function _payEmployee(address employee, uint64 paidAt, uint64 interval) internal {
        _ensureCanPay(employee, interval);
        _ensureBalanceInitialized(employee);

        euint128 newBal = FHE.add(_balances[employee], _salaries[employee]);
        _balances[employee] = newBal;
        _grantEmployeeAccess(_balances[employee], employee);
        lastPaidAt[employee] = paidAt;
        emit SalaryPaid(employee, paidAt);
    }

    /// @notice Employer sets encrypted salary for an employee (client encrypts plaintext before submission).
    function setSalary(address employee, InEuint128 calldata inSalary) external onlyPayrollAdmin {
        require(employee != address(0), 'FhePay: zero employee');

        _registerEmployee(employee);
        _ensureBalanceInitialized(employee);
        euint128 encSal = FHE.asEuint128(inSalary);
        _salaries[employee] = encSal;
        _hasSalary[employee] = true;

        FHE.allowThis(_salaries[employee]);
        FHE.allowSender(_salaries[employee]);
        FHE.allow(_salaries[employee], employee);
        _grantCurrentAuditorAccess(employee, _salaries[employee]);
        emit SalarySet(employee);
    }

    /// @notice Pay one payroll period for a single employee.
    function paySalary(address employee) external onlyPayrollAdmin {
        _ensureTreasuryHealthy();
        _payEmployee(employee, uint64(block.timestamp), payInterval);
    }

    /// @notice Pay a full payroll batch in a single transaction.
    function batchPaySalary(address[] calldata employees) external onlyPayrollAdmin {
        require(employees.length > 0, 'FhePay: empty batch');
        require(employees.length <= MAX_BATCH_SIZE, 'FhePay: batch too large');
        _ensureTreasuryHealthy();
        uint64 paidAt = uint64(block.timestamp);
        uint256 paidCount;
        for (uint256 i = 0; i < employees.length; ++i) {
            if (_canPay(employees[i], payInterval)) {
                _payEmployee(employees[i], paidAt, payInterval);
                paidCount += 1;
            }
        }
        require(paidCount > 0, 'FhePay: no payable employees');
        emit BatchSalaryPaid(paidCount, paidAt);
    }

    /// @notice Add a one-time encrypted bonus or grant to an employee's confidential balance.
    function grantBonus(address employee, InEuint128 calldata inAmount) external onlyPayrollAdmin {
        require(employee != address(0), 'FhePay: zero employee');

        _registerEmployee(employee);
        _ensureBalanceInitialized(employee);

        euint128 amount = FHE.asEuint128(inAmount);
        FHE.allowSender(amount);

        euint128 newBal = FHE.add(_balances[employee], amount);
        _balances[employee] = newBal;
        _grantEmployeeAccess(_balances[employee], employee);
        emit BonusGranted(employee);
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

    function createPayrollGroup(string calldata name, uint64 interval) external onlyPayrollAdmin returns (uint256 groupId) {
        require(bytes(name).length > 0, 'FhePay: empty group name');
        require(interval > 0, 'FhePay: invalid interval');

        groupId = _payrollGroupCount;
        _payrollGroupCount += 1;

        PayrollGroup storage group = _payrollGroups[groupId];
        group.name = name;
        group.interval = interval;
        group.active = true;

        emit PayrollGroupCreated(groupId, name, interval);
    }

    function setPayrollGroup(uint256 groupId, string calldata name, uint64 interval, bool active) external onlyPayrollAdmin {
        require(groupId < _payrollGroupCount, 'FhePay: unknown group');
        require(bytes(name).length > 0, 'FhePay: empty group name');
        require(interval > 0, 'FhePay: invalid interval');

        PayrollGroup storage group = _payrollGroups[groupId];
        group.name = name;
        group.interval = interval;
        group.active = active;

        emit PayrollGroupUpdated(groupId, name, interval, active);
    }

    function setPayrollGroupMember(uint256 groupId, address employee, bool included) external onlyPayrollAdmin {
        require(groupId < _payrollGroupCount, 'FhePay: unknown group');
        require(_isEmployee[employee], 'FhePay: unknown employee');

        PayrollGroup storage group = _payrollGroups[groupId];
        uint256 currentIndex = group.memberIndex[employee];

        if (included) {
            if (currentIndex != 0) return;
            group.members.push(employee);
            group.memberIndex[employee] = group.members.length;
        } else {
            if (currentIndex == 0) return;
            uint256 index = currentIndex - 1;
            uint256 lastIndex = group.members.length - 1;
            if (index != lastIndex) {
                address moved = group.members[lastIndex];
                group.members[index] = moved;
                group.memberIndex[moved] = currentIndex;
            }
            group.members.pop();
            delete group.memberIndex[employee];
        }

        emit PayrollGroupMemberUpdated(groupId, employee, included);
    }

    function payPayrollGroup(uint256 groupId) external onlyPayrollAdmin {
        _payPayrollGroup(groupId, uint64(block.timestamp), false);
    }

    function _payPayrollGroup(uint256 groupId, uint64 paidAt, bool fromUpkeep) internal {
        require(isPayrollGroupDue(groupId), 'FhePay: group not due');
        _ensureTreasuryHealthy();
        PayrollGroup storage group = _payrollGroups[groupId];
        uint256 count = group.members.length;
        require(count > 0, 'FhePay: empty group');
        require(count <= MAX_BATCH_SIZE, 'FhePay: group too large');

        uint256 paidCount;
        for (uint256 i = 0; i < count; ++i) {
            address employee = group.members[i];
            if (_canPay(employee, group.interval)) {
                _payEmployee(employee, paidAt, group.interval);
                paidCount += 1;
            }
        }
        require(paidCount > 0, 'FhePay: no payable members');
        group.lastRunAt = paidAt;

        if (fromUpkeep) {
            emit PayrollGroupUpkeepPerformed(groupId, paidCount, paidAt);
        } else {
            emit PayrollGroupPaid(groupId, paidCount, paidAt);
        }
    }

    /// @notice Chainlink/Gelato-style check hook for recurring payroll group automation.
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData) {
        if (checkData.length != 32) return (false, bytes(''));
        uint256 groupId = abi.decode(checkData, (uint256));
        if (groupId >= _payrollGroupCount) return (false, bytes(''));

        PayrollGroup storage group = _payrollGroups[groupId];
        upkeepNeeded = _isPayrollGroupRunnable(group);
        performData = upkeepNeeded ? abi.encode(groupId) : bytes('');
    }

    /// @notice Execute a due recurring payroll group through an authorized automation forwarder/admin.
    function performUpkeep(bytes calldata performData) external onlyPayrollAdmin {
        require(performData.length == 32, 'FhePay: bad upkeep data');
        uint256 groupId = abi.decode(performData, (uint256));
        _payPayrollGroup(groupId, uint64(block.timestamp), true);
    }

    function grantAuditorAccess(address auditor, address employee) external onlyPayrollAdmin {
        require(_auditors[auditor], 'FhePay: auditor inactive');
        require(_isEmployee[employee], 'FhePay: unknown employee');

        if (!_auditorEmployeeAccess[auditor][employee]) {
            _auditorEmployeeAccess[auditor][employee] = true;
            bool knownEmployeeAuditor;
            address[] storage employeeAuditors = _employeeAuditors[employee];
            for (uint256 i = 0; i < employeeAuditors.length; ++i) {
                if (employeeAuditors[i] == auditor) {
                    knownEmployeeAuditor = true;
                    break;
                }
            }
            if (!knownEmployeeAuditor) {
                employeeAuditors.push(auditor);
            }
        }

        if (_hasSalary[employee]) {
            FHE.allow(_salaries[employee], auditor);
        }
        if (_balanceInitialized[employee]) {
            FHE.allow(_balances[employee], auditor);
        }
        if (_hasPendingWithdrawal[employee]) {
            FHE.allow(_pendingWithdrawals[employee], auditor);
        }

        emit AuditorAccessGranted(auditor, employee);
    }

    function revokeAuditorAccess(address auditor, address employee) external onlyPayrollAdmin {
        require(_auditorEmployeeAccess[auditor][employee], 'FhePay: access not granted');
        _auditorEmployeeAccess[auditor][employee] = false;
        emit AuditorAccessRevoked(auditor, employee);
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

    function isPayrollAdmin(address account) external view returns (bool) {
        return account == owner() || _payrollAdmins[account];
    }

    function isTreasuryAdmin(address account) external view returns (bool) {
        return account == owner() || _treasuryAdmins[account];
    }

    function isAuditor(address auditor) external view returns (bool) {
        return _auditors[auditor];
    }

    function auditorCount() external view returns (uint256) {
        return _auditorList.length;
    }

    function auditorAt(uint256 index) external view returns (address) {
        return _auditorList[index];
    }

    function canAuditEmployee(address auditor, address employee) external view returns (bool) {
        return _auditors[auditor] && _auditorEmployeeAccess[auditor][employee];
    }

    function payrollGroupCount() external view returns (uint256) {
        return _payrollGroupCount;
    }

    function payrollGroupInfo(uint256 groupId)
        external
        view
        returns (string memory name, uint64 interval, uint64 lastRunAt, bool active, uint256 memberCount, uint64 nextRunAt)
    {
        require(groupId < _payrollGroupCount, 'FhePay: unknown group');
        PayrollGroup storage group = _payrollGroups[groupId];
        name = group.name;
        interval = group.interval;
        lastRunAt = group.lastRunAt;
        active = group.active;
        memberCount = group.members.length;
        nextRunAt = _nextPayrollGroupPayAt(group);
    }

    function payrollGroupMemberCount(uint256 groupId) external view returns (uint256) {
        require(groupId < _payrollGroupCount, 'FhePay: unknown group');
        return _payrollGroups[groupId].members.length;
    }

    function payrollGroupMemberAt(uint256 groupId, uint256 index) external view returns (address) {
        require(groupId < _payrollGroupCount, 'FhePay: unknown group');
        return _payrollGroups[groupId].members[index];
    }

    function isPayrollGroupMember(uint256 groupId, address employee) external view returns (bool) {
        require(groupId < _payrollGroupCount, 'FhePay: unknown group');
        return _payrollGroups[groupId].memberIndex[employee] != 0;
    }

    function isPayrollGroupDue(uint256 groupId) public view returns (bool) {
        require(groupId < _payrollGroupCount, 'FhePay: unknown group');
        PayrollGroup storage group = _payrollGroups[groupId];
        return _isPayrollGroupDue(group);
    }

    function nextPayrollGroupPayAt(uint256 groupId) external view returns (uint64) {
        require(groupId < _payrollGroupCount, 'FhePay: unknown group');
        return _nextPayrollGroupPayAt(_payrollGroups[groupId]);
    }

    function _nextPayrollGroupPayAt(PayrollGroup storage group) internal view returns (uint64) {
        if (!group.active) return 0;
        if (group.lastRunAt == 0) return 0;
        return group.lastRunAt + group.interval;
    }

    function _isPayrollGroupDue(PayrollGroup storage group) internal view returns (bool) {
        if (!group.active) return false;
        if (group.lastRunAt == 0) return true;
        return block.timestamp >= uint256(group.lastRunAt) + group.interval;
    }

    function _isPayrollGroupRunnable(PayrollGroup storage group) internal view returns (bool) {
        uint256 count = group.members.length;
        if (!_isPayrollGroupDue(group) || count == 0 || count > MAX_BATCH_SIZE) return false;
        for (uint256 i = 0; i < count; ++i) {
            if (_canPay(group.members[i], group.interval)) return true;
        }
        return false;
    }

    function setEmployeeActive(address employee, bool active) external onlyPayrollAdmin {
        require(_isEmployee[employee], 'FhePay: unknown employee');
        if (_activeEmployees[employee] == active) return;
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

    function treasuryBelowAlert() external view returns (bool) {
        return treasuryAlertThreshold > 0 && address(this).balance < treasuryAlertThreshold;
    }
}
