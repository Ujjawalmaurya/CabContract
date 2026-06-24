import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ABI = [
    "function addMoney(address user, uint256 amount) public",
    "function lockFare(bytes32 rideId, address rider, address driver, uint256 amount) public",
    "function releaseToDriver(bytes32 rideId) public",
    "function refund(bytes32 rideId) public",
    "function markInsuranceCovered(bytes32 rideId) public",
    "function getBalance(address user) public view returns (uint256)",
    "event MoneyAdded(address indexed user, uint256 amount)",
    "event RideBooked(bytes32 indexed rideId, address indexed user, uint256 amount)",
    "event FareReleased(bytes32 indexed rideId, address indexed driver)",
    "event InsuranceCovered(bytes32 indexed rideId)",
    "event FareRefunded(bytes32 indexed rideId, address indexed rider)"
];

let _contract: any = null;

async function initContract() {
    if (_contract) return _contract;

    console.log('[CONFIG] Loading ethers...');
    const { ethers } = await import('ethers');

    const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL);
    console.log('[CONFIG] Provider connected →', process.env.HARDHAT_RPC_URL);

    const wallet = new ethers.Wallet(process.env.CONTRACT_OWNER_PRIVATE_KEY as string, provider);
    console.log('[CONFIG] Wallet loaded');

    _contract = new ethers.Contract(process.env.CONTRACT_ADDRESS as string, CONTRACT_ABI, wallet);
    console.log('[CONFIG] Contract initialized →', process.env.CONTRACT_ADDRESS);

    return _contract;
}

// Proxy that lazily initializes the contract on first method call
export const contract = new Proxy({} as any, {
    get(_target, prop) {
        if (prop === 'then') return undefined; // prevent Promise detection
        return async (...args: any[]) => {
            const c = await initContract();
            return c[prop](...args);
        };
    }
});
