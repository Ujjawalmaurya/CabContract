// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RideEscrow {
    mapping(address => uint256) public balances;
    
    struct Escrow {
        address rider;
        address driver;
        uint256 amount;
        bool isReleased;
    }
    
    mapping(uint256 => Escrow) public escrows;

    event MoneyAdded(address indexed user, uint256 amount);
    event RideReserved(uint256 indexed rideId, address indexed rider, address indexed driver, uint256 amount);
    event RideReleased(uint256 indexed rideId, address indexed driver, uint256 amount);

    function addMoney(uint256 amount) public {
        balances[msg.sender] += amount;
        emit MoneyAdded(msg.sender, amount);
    }

    function reserveForRide(uint256 rideId, address driver, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(escrows[rideId].rider == address(0), "Ride already reserved");
        
        balances[msg.sender] -= amount;
        escrows[rideId] = Escrow({
            rider: msg.sender,
            driver: driver,
            amount: amount,
            isReleased: false
        });
        
        emit RideReserved(rideId, msg.sender, driver, amount);
    }

    function releaseToDriver(uint256 rideId) public {
        Escrow storage escrow = escrows[rideId];
        require(escrow.rider != address(0), "No ride found");
        require(!escrow.isReleased, "Already released");
        require(msg.sender == escrow.rider, "Only rider can release");

        escrow.isReleased = true;
        balances[escrow.driver] += escrow.amount;
        
        emit RideReleased(rideId, escrow.driver, escrow.amount);
    }

    function getBalance(address user) public view returns (uint256) {
        return balances[user];
    }
}
