# 🚖 Decentralized Cab System (CabContract)

A Peer-to-Peer ride-hailing platform built on the Ethereum blockchain. This project eliminates traditional middlemen by using smart contracts to manage the entire lifecycle of a ride—from driver registration to automated payment settlements.

## 🌟 Key Features

- **Decentralized Escrow**: Payments are locked in the smart contract when a ride is requested and only released upon successful completion.
- **Transparent Driver Registry**: Drivers register with their car models and availability status, ensuring full transparency.
- **Automated Settlements**: Once a driver marks a ride as complete, the funds are instantly transferred to their wallet by the contract logic.
- **Zero Middlemen**: No central authority controls the data or the money—it's all on-chain.

## 🛠 Tech Stack

- **Solidity**: Smart contract logic (EVM-compatible).
- **Hardhat**: Development environment for compiling, testing, and deploying.
- **Ethers.js**: Library for interacting with the Ethereum blockchain via JavaScript.
- **Dotenv**: Secure environment variable management.
- **Vanilla web (HTML/JS)**: Simple frontend for user interaction.

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed.
- A crypto wallet like **MetaMask**.

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Setup
Copy the example environment file and add your keys (for testnet deployment):
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `SEPOLIA_RPC_URL`: Your Alchemy/Infura endpoint.
- `PRIVATE_KEY`: Your wallet's private key.
- `ETHERSCAN_API_KEY`: For contract verification.

### 4. Running Locally
Start a local Hardhat node in a separate terminal:
```bash
npx hardhat node
```

Compile the contracts:
```bash
npx hardhat compile
```

Deploy to your local node:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 5. Running Tests
Ensure everything is working with the automated test suite:
```bash
npx hardhat test
```

## 🏗 Project Structure

- `contracts/cabSystem.sol`: The core smart contract logic.
- `scripts/deploy.js`: Automation script for deploying the contract.
- `test/`: Mocha/Chai tests to verify contract behavior.
- `index.html`: Web interface for interacting with the contract.
- `hardhat.config.cjs`: Main configuration for the Hardhat environment.

## 🛡 Security Note

This project uses a `.env` file to store sensitive keys. **Never commit your `.env` file to version control.** It is already included in the `.gitignore` for your safety.

---
*Built as a Final Year Project to explore the power of decentralized applications (dApps).*
