# 🚖 P2PRide: Decentralized Cab System

This is a peer-to-peer ride-hailing system that cuts out the middleman. It uses Ethereum smart contracts for money handling and a Node.js backend for the business logic.

## 🏗 How It Works

The system is split into three main layers:

1.  **Blockchain (`contracts/RideManager.sol`)**: This is the source of truth for money and ride status. It holds the fare in escrow and releases it to the driver only when the ride is done.
2.  **Backend (`src/`)**: A Node.js server that talks to the blockchain. It handles user accounts, maps out-of-chain data (like pickup addresses) to blockchain IDs, and manages the API for the mobile app.
3.  **Database (MongoDB)**: Stores off-chain info like user profiles, encrypted keys, and ride history that doesn't need to be on the expensive blockchain.

## 🛠 Tech Stack

-   **Solidity & Hardhat**: Smart contract logic and local dev network.
-   **Node.js & Express**: Backend API.
-   **Ethers.js**: The bridge between Node.js and the Smart Contract.
-   **Mongoose & MongoDB**: Off-chain data storage.
-   **JWT**: Secure user authentication.

## 🚀 Getting Started

### 1. Setup
Install everything first:
```bash
npm install
```

### 2. Configure Environment
Copy the example env file and make sure your details are in `.env`:
```bash
cp .env.example .env
```
*Note: For local development, I've already pre-configured `.env` to work with a local Hardhat node.*

### 3. Start Local Blockchain
Open a new terminal and run:
```bash
npx hardhat node
```
This gives you local accounts with fake ETH for testing.

### 4. Deploy the Contract
In another terminal, deploy the `RideManager` contract:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Copy the contract address from the output and update `CONTRACT_ADDRESS` in your `.env`.

### 5. Start the Backend
Make sure you have MongoDB running locally, then start the server:
```bash
node server.js
```

## 📂 Project Structure

-   `contracts/`: The Solidity smart contract that handles payments.
-   `src/models/`: Database schemas for Users and Rides.
-   `src/services/`: The `blockchainService.js` which is the most important part—it translates API calls into blockchain transactions.
-   `src/controllers/`: The brains of the API (Auth and Ride logic).
-   `src/routes/`: API endpoint definitions.
-   `server.js`: The entry point that ties everything together.

## 🛡 Security
We store user private keys in the database to automate transactions. For a real production app, these **must** be encrypted. Never share your `.env` file.

---
*Built to show how decentralized finance can fix real-world problems like ride-sharing.*

