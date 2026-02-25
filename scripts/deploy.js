const hre = require("hardhat");

async function main() {
    console.log("\n========================================");
    console.log("  P2P Cab - Smart Contract Deployment");
    console.log("========================================\n");

    // Deploy contract
    const RideEscrow = await hre.ethers.getContractFactory("RideEscrow");
    const rideEscrow = await RideEscrow.deploy();
    await rideEscrow.waitForDeployment();

    const contractAddress = await rideEscrow.getAddress();
    console.log(`✅ RideEscrow deployed to: ${contractAddress}`);
    console.log(`\n→ Copy this to your .env file:`);
    console.log(`  CONTRACT_ADDRESS=${contractAddress}\n`);

    // Print test accounts
    const signers = await hre.ethers.getSigners();
    const count = Math.min(signers.length, 5);

    console.log("========================================");
    console.log("  Test Accounts (Hardhat Network)");
    console.log("========================================\n");

    // Hardhat default private keys (well-known, safe to print)
    const defaultKeys = [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    ];

    for (let i = 0; i < count; i++) {
        const address = await signers[i].getAddress();
        const balance = hre.ethers.formatEther(await hre.ethers.provider.getBalance(address));
        console.log(`Account #${i}:`);
        console.log(`  Address:     ${address}`);
        console.log(`  Private Key: ${defaultKeys[i]}`);
        console.log(`  Balance:     ${balance} ETH`);

        if (i === 0) console.log(`  → Use as CONTRACT_OWNER_PRIVATE_KEY in .env`);
        if (i === 1) console.log(`  → Use as DRIVER_WALLET in .env`);
        console.log("");
    }

    console.log("========================================");
    console.log("  Setup Complete! Next steps:");
    console.log("  1. Copy CONTRACT_ADDRESS to .env");
    console.log("  2. Run: npm run dev");
    console.log("  3. Run: flutter run (in cab/)");
    console.log("========================================\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
