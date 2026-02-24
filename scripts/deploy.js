const hre = require("hardhat");

async function main() {
    const RideEscrow = await hre.ethers.getContractFactory("RideEscrow");
    const rideEscrow = await RideEscrow.deploy();

    await rideEscrow.waitForDeployment();

    console.log(`RideEscrow deployed to: ${await rideEscrow.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
