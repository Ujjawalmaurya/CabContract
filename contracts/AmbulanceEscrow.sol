// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AmbulanceEscrow is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status { NONE, LOCKED, RELEASED, REFUNDED, INSURANCE }

    struct Escrow {
        address rider;
        address driver;
        uint256 amount;
    }

    mapping(address => uint256) public balances;
    mapping(bytes32 => Escrow) public escrows;
    mapping(bytes32 => Status) public rideStatus;

    event MoneyAdded(address indexed user, uint256 amount);
    event RideBooked(bytes32 indexed rideId, address indexed user, uint256 amount);
    event FareReleased(bytes32 indexed rideId, address indexed driver);
    event InsuranceCovered(bytes32 indexed rideId);
    event FareRefunded(bytes32 indexed rideId, address indexed rider);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "Caller is not an operator");
        _;
    }

    function addMoney(address user, uint256 amount) public onlyOperator {
        balances[user] += amount;
        emit MoneyAdded(user, amount);
    }

    function getBalance(address user) public view returns (uint256) {
        return balances[user];
    }

    function lockFare(
        bytes32 rideId,
        address rider,
        address driver,
        uint256 amount
    ) public onlyOperator {
        require(balances[rider] >= amount, "Insufficient balance");
        require(rideStatus[rideId] == Status.NONE, "Ride already has a status");

        balances[rider] -= amount;
        escrows[rideId] = Escrow({
            rider: rider,
            driver: driver,
            amount: amount
        });
        rideStatus[rideId] = Status.LOCKED;

        emit RideBooked(rideId, rider, amount);
    }

    function releaseToDriver(bytes32 rideId) public onlyOperator {
        require(rideStatus[rideId] == Status.LOCKED, "Ride not locked");
        Escrow storage escrow = escrows[rideId];
        
        rideStatus[rideId] = Status.RELEASED;
        balances[escrow.driver] += escrow.amount;

        emit FareReleased(rideId, escrow.driver);
    }

    function refund(bytes32 rideId) public onlyOperator {
        require(rideStatus[rideId] == Status.LOCKED, "Ride not locked");
        Escrow storage escrow = escrows[rideId];

        rideStatus[rideId] = Status.REFUNDED;
        balances[escrow.rider] += escrow.amount;

        emit FareRefunded(rideId, escrow.rider);
    }

    function markInsuranceCovered(bytes32 rideId) public onlyOperator {
        require(rideStatus[rideId] == Status.NONE, "Ride already has a status");
        rideStatus[rideId] = Status.INSURANCE;

        emit InsuranceCovered(rideId);
    }
}
