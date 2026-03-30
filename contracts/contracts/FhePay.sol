// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

/// @title FhePay — confidential payroll balances and salaries (Fhenix CoFHE)
/// @notice Amounts are euint32 handles; represent values in a fixed unit (e.g. whole USD). Max ~4e9.
contract FhePay is Ownable {
    mapping(address => euint32) private _salaries;
    mapping(address => euint32) private _balances;
    mapping(address => bool) private _hasSalary;
    mapping(address => bool) private _balanceInitialized;

    event SalarySet(address indexed employee);
    event SalaryPaid(address indexed employee);
    event Withdrawn(address indexed account);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function _ensureBalanceInitialized(address employee) internal {
        if (!_balanceInitialized[employee]) {
            euint32 zero = FHE.asEuint32(0);
            _balances[employee] = zero;
            FHE.allowThis(_balances[employee]);
            FHE.allow(_balances[employee], employee);
            _balanceInitialized[employee] = true;
        }
    }

    /// @notice Employer sets encrypted salary for an employee (client encrypts plaintext).
    function setSalary(address employee, InEuint32 calldata inSalary) external onlyOwner {
        require(employee != address(0), 'FhePay: zero employee');
        _ensureBalanceInitialized(employee);
        euint32 encSal = FHE.asEuint32(inSalary);
        _salaries[employee] = encSal;
        _hasSalary[employee] = true;
        FHE.allowThis(_salaries[employee]);
        FHE.allowSender(_salaries[employee]);
        FHE.allow(_salaries[employee], employee);
        emit SalarySet(employee);
    }

    /// @notice Pay one period: homomorphically adds encrypted salary to employee encrypted balance.
    function paySalary(address employee) external onlyOwner {
        require(_hasSalary[employee], 'FhePay: salary not set');
        _ensureBalanceInitialized(employee);
        euint32 sal = _salaries[employee];
        euint32 bal = _balances[employee];
        euint32 newBal = FHE.add(bal, sal);
        _balances[employee] = newBal;
        FHE.allowThis(_balances[employee]);
        FHE.allow(_balances[employee], employee);
        emit SalaryPaid(employee);
    }

    /// @notice Employee withdraws up to encrypted amount; insufficient funds leave balance unchanged (FHE select).
    function withdraw(InEuint32 calldata inAmount) external {
        euint32 amount = FHE.asEuint32(inAmount);
        FHE.allowSender(amount);
        euint32 bal = _balances[msg.sender];
        ebool sufficient = FHE.gte(bal, amount);
        euint32 newBal = FHE.select(sufficient, FHE.sub(bal, amount), bal);
        _balances[msg.sender] = newBal;
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        emit Withdrawn(msg.sender);
    }

    function salaryCiphertext(address employee) external view returns (euint32) {
        return _salaries[employee];
    }

    function balanceCiphertext(address employee) external view returns (euint32) {
        return _balances[employee];
    }

    function hasSalary(address employee) external view returns (bool) {
        return _hasSalary[employee];
    }
}
