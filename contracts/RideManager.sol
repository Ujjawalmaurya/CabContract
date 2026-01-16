// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RideManager {
    
    enum RideStatus { 
        REQUESTED,      // 0 - Rider requested ride
        ACCEPTED,       // 1 - Driver accepted
        STARTED,        // 2 - Ride started
        COMPLETED,      // 3 - Ride completed
        CANCELLED       // 4 - Ride cancelled
    }
    
    struct Ride {
        uint256 rideId;
        address rider;
        address driver;
        uint256 fare;           // Fare in INR (wei representation)
        RideStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }
    
    // State variables
    uint256 public rideCounter;
    mapping(uint256 => Ride) public rides;
    mapping(address => uint256) public balances;  // User balances in INR tokens
    
    // Events
    event RideRequested(uint256 indexed rideId, address indexed rider, uint256 fare);
    event RideAccepted(uint256 indexed rideId, address indexed driver);
    event RideStarted(uint256 indexed rideId);
    event RideCompleted(uint256 indexed rideId, uint256 fare);
    event RideCancelled(uint256 indexed rideId);
    event FundsDeposited(address indexed user, uint256 amount);
    
    // Modifiers
    modifier onlyRider(uint256 _rideId) {
        require(rides[_rideId].rider == msg.sender, "Only rider can call");
        _;
    }
    
    modifier onlyDriver(uint256 _rideId) {
        require(rides[_rideId].driver == msg.sender, "Only driver can call");
        _;
    }
    
    // Deposit funds (simulate INR token deposit)
    function depositFunds(uint256 _amount) external {
        balances[msg.sender] += _amount;
        emit FundsDeposited(msg.sender, _amount);
    }
    
    // Request a ride
    function requestRide(uint256 _fare) external returns (uint256) {
        require(balances[msg.sender] >= _fare, "Insufficient balance");
        
        rideCounter++;
        
        rides[rideCounter] = Ride({
            rideId: rideCounter,
            rider: msg.sender,
            driver: address(0),
            fare: _fare,
            status: RideStatus.REQUESTED,
            createdAt: block.timestamp,
            completedAt: 0
        });
        
        // Lock the fare amount
        balances[msg.sender] -= _fare;
        
        emit RideRequested(rideCounter, msg.sender, _fare);
        return rideCounter;
    }
    
    // Accept ride (by driver)
    function acceptRide(uint256 _rideId) external {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.REQUESTED, "Ride not available");
        require(ride.rider != msg.sender, "Cannot accept own ride");
        
        ride.driver = msg.sender;
        ride.status = RideStatus.ACCEPTED;
        
        emit RideAccepted(_rideId, msg.sender);
    }
    
    // Start ride
    function startRide(uint256 _rideId) external onlyDriver(_rideId) {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.ACCEPTED, "Ride not accepted");
        
        ride.status = RideStatus.STARTED;
        emit RideStarted(_rideId);
    }
    
    // Complete ride and release payment
    function completeRide(uint256 _rideId) external onlyDriver(_rideId) {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.STARTED, "Ride not started");
        
        ride.status = RideStatus.COMPLETED;
        ride.completedAt = block.timestamp;
        
        // Transfer fare to driver
        balances[ride.driver] += ride.fare;
        
        emit RideCompleted(_rideId, ride.fare);
    }
    
    // Cancel ride (by rider before acceptance)
    function cancelRide(uint256 _rideId) external onlyRider(_rideId) {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.REQUESTED, "Cannot cancel ride");
        
        ride.status = RideStatus.CANCELLED;
        
        // Refund fare to rider
        balances[ride.rider] += ride.fare;
        
        emit RideCancelled(_rideId);
    }
    
    // Get ride details
    function getRide(uint256 _rideId) external view returns (Ride memory) {
        return rides[_rideId];
    }
    
    // Get user balance
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }
}
