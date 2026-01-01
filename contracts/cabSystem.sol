// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CabSystem {
    
    struct Driver {
        address driverAddress;
        string name;
        string carModel;
        bool isAvailable;
        uint256 totalRides;
    }
    
    struct Ride {
        uint256 rideId;
        address rider;
        address driver;
        string pickupLocation;
        string dropLocation;
        uint256 fare;
        bool isCompleted;
        bool isPaid;
    }
    
    mapping(address => Driver) public drivers;
    mapping(uint256 => Ride) public rides;
    uint256 public rideCounter;
    
    // Register as a driver
    function registerDriver(string memory _name, string memory _carModel) public {
        drivers[msg.sender] = Driver(msg.sender, _name, _carModel, true, 0);
    }
    
    // Request a ride (rider pays upfront)
    function requestRide(string memory _pickup, string memory _drop) public payable {
        require(msg.value > 0, "Send some ETH for the ride");
        
        rideCounter++;
        rides[rideCounter] = Ride(
            rideCounter,
            msg.sender,
            address(0), // No driver yet
            _pickup,
            _drop,
            msg.value,
            false,
            false
        );
    }
    
    // Driver accepts the ride
    function acceptRide(uint256 _rideId) public {
        Ride storage ride = rides[_rideId];
        require(ride.driver == address(0), "Ride already taken");
        require(drivers[msg.sender].isAvailable, "You're not available");
        
        ride.driver = msg.sender;
        drivers[msg.sender].isAvailable = false;
    }
    
    // Complete ride and pay driver
    function completeRide(uint256 _rideId) public {
        Ride storage ride = rides[_rideId];
        require(ride.driver == msg.sender, "You're not the driver");
        require(!ride.isCompleted, "Already completed");
        
        ride.isCompleted = true;
        ride.isPaid = true;
        
        // Pay the driver
        payable(msg.sender).transfer(ride.fare);
        
        drivers[msg.sender].isAvailable = true;
        drivers[msg.sender].totalRides++;
    }
}