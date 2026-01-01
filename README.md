# Blockchain Cab System

A simple, decentralized ride-hailing system built on Ethereum. This project uses a smart contract to handle driver registration, ride requests, and payments without a middleman.

## What it is
This is a final year project that demonstrates how blockchain can power a cab-hailing service. It ensures that payments are locked when a ride is requested and only released to the driver once the ride is completed.

## How it works
1.  **Driver Registration**: Anyone can register as a driver by giving their name and car model.
2.  **Requesting a Ride**: A rider requests a ride by specifying pickup/drop locations and sending ETH as the fare.
3.  **Accepting a Ride**: A registered driver can accept an available ride.
4.  **Completing the Ride**: Once the trip is over, the driver marks it as complete, and the locked ETH is automatically transferred to their wallet.

## How to run it

### 1. Install Dependencies
Make sure you have Node.js installed, then run:
```bash
npm install
```

### 2. Start a Local Blockchain
In a separate terminal, start the Hardhat network node:
```bash
npx hardhat node
```

### 3. Compile and Deploy
Compile the smart contract:
```bash
npx hardhat compile
```
Deploy to the local network:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Run Tests
To make sure everything is working correctly:
```bash
npx hardhat test
```

## How to use it
- **Smart Contract**: The logic is in `contracts/cabSystem.sol`.
- **Frontend**: Open `index.html` in a browser with a wallet like MetaMask. Connect to your local Hardhat network to interact with the system.
- **Testing**: Use `test/cabSystem.test.js` to see the full cycle in code.

## Technologies
- **Solidity**: Smart contract logic.
- **Hardhat**: Development environment.
- **Ethers.js**: Interaction between the frontend and the blockchain.
