// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RideEscrow {
    address public owner;
    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    struct Escrow {
        address rider;
        address driver;
        uint256 amount;
        bool isReleased;
    }

    mapping(uint256 => Escrow) public escrows;

    event MoneyAdded(address indexed user, uint256 amount);
    event RideReserved(
        uint256 indexed rideId,
        address indexed rider,
        address indexed driver,
        uint256 amount
    );
    event RideReleased(
        uint256 indexed rideId,
        address indexed driver,
        uint256 amount
    );

    function addMoney(address user, uint256 amount) public {
        balances[user] += amount;
        emit MoneyAdded(user, amount);
    }

    function reserveForRide(
        uint256 rideId,
        address user,
        address driver,
        uint256 amount
    ) public {
        require(balances[user] >= amount, "Insufficient balance");
        require(escrows[rideId].rider == address(0), "Ride already reserved");

        balances[user] -= amount;
        escrows[rideId] = Escrow({
            rider: user,
            driver: driver,
            amount: amount,
            isReleased: false
        });

        emit RideReserved(rideId, user, driver, amount);
    }

    function releaseToDriver(uint256 rideId) public {
        Escrow storage escrow = escrows[rideId];
        require(escrow.rider != address(0), "No ride found");
        require(!escrow.isReleased, "Already released");
        require(
            msg.sender == escrow.rider || msg.sender == owner,
            "Only rider or owner can release"
        );

        escrow.isReleased = true;
        balances[escrow.driver] += escrow.amount;

        emit RideReleased(rideId, escrow.driver, escrow.amount);
    }

    function getBalance(address user) public view returns (uint256) {
        return balances[user];
    }
}
