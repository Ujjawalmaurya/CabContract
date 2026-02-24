import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL);
const wallet = new ethers.Wallet(process.env.CONTRACT_OWNER_PRIVATE_KEY as string, provider);

const CONTRACT_ABI = [
    "function addMoney(uint256 amount) public",
    "function reserveForRide(uint256 rideId, address driver, uint256 amount) public",
    "function releaseToDriver(uint256 rideId) public",
    "function getBalance(address user) public view returns (uint256)",
    "event MoneyAdded(address indexed user, uint256 amount)",
    "event RideReserved(uint256 indexed rideId, address indexed rider, address indexed driver, uint256 amount)",
    "event RideReleased(uint256 indexed rideId, address indexed driver, uint256 amount)"
];

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS as string, CONTRACT_ABI, wallet);

export { provider, wallet, contract };
