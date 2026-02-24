# CabContract (Backend & Blockchain)

This folder contains the core logic for the P2P Cab system, including the Solidity smart contract and the Node.js API.

## Folder Structure

- **`contracts/`**: Contains `RideEscrow.sol`. This manages the fake INR balances and the ride escrow (reserve/release) logic.
- **`scripts/`**: Hardhat scripts for deployment (`deploy.js`) and testing (`interact.js`).
- **`src/`**: Node.js + TypeScript backend source code.
  - `config/`: Ethers and contract initialization.
  - `controllers/`: Logic for Auth, Wallet, and Rides.
  - `middleware/`: JWT authentication guards.
  - `routes/`: API endpoint definitions.
- **`artifacts/`**: Compiled contract data (ABI).
- **`.env`**: Configuration for ports, JWT, and blockchain RPC/Keys.

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Local Blockchain**:
   In a separate terminal:
   ```bash
   npx hardhat node
   ```

3. **Deploy Contract**:
   ```bash
   npm run deploy
   ```

4. **Run Backend API**:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:5000`.

## Key Endpoints

- `POST /api/auth/register`: Create a new user.
- `POST /api/wallet/add-money`: Add fake INR to your wallet.
- `POST /api/rides/create`: Rider requests a ride.
- `POST /api/rides/start/:rideId`: Rider locks funds for the ride.
- `POST /api/rides/end/:rideId`: Driver completes ride and receives funds.
