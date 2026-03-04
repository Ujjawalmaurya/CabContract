console.log("Script started");
const ethers = require("ethers");
console.log("Ethers loaded");
const mongoose = require("mongoose");
console.log("Mongoose loaded");
const dotenv = require("dotenv");
console.log("Dotenv loaded");
dotenv.config();

const MONGO_URI = 'mongodb+srv://chocolateboyz0011_db_user:9VcebtZsmE3q0hMg@0.yfox3bo.mongodb.net/?appName=0';
const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = 'http://127.0.0.1:8545';

const ABI = [
    "function addMoney(address user, uint256 amount) public",
    "function getBalance(address user) public view returns (uint256)"
];

const userSchema = new mongoose.Schema({
    walletAddress: String,
    email: String
});

async function main() {
    console.log("Connecting to MongoDB...");
    try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        if (user.walletAddress) {
            try {
                process.stdout.write(`Adding 5000 to ${user.email} (${user.walletAddress})... `);
                const tx = await contract.addMoney(user.walletAddress, 5000);
                await tx.wait();
                console.log("✅");
            } catch (err) {
                console.log(`❌ Failed: ${err.message}`);
            }
        }
    }
    console.log("\nSeeding complete!");
    await mongoose.disconnect();
}
main().catch(console.error);
