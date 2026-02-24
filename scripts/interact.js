const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    const [owner, rider, driver] = await hre.ethers.getSigners();
    const RideEscrow = await hre.ethers.getContractFactory("RideEscrow");
    const rideEscrow = await RideEscrow.deploy();
    await rideEscrow.waitForDeployment();

    const contractAddress = await rideEscrow.getAddress();
    console.log("Contract Address:", contractAddress);

    const artifactPath = path.join(__dirname, "../artifacts/contracts/RideEscrow.sol/RideEscrow.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // 1. Add money
    const addMoneyTx = await rideEscrow.connect(rider).addMoney(1000);
    await addMoneyTx.wait();
    console.log("Add Money Tx Hash:", addMoneyTx.hash);

    // 2. Reserve for ride
    const rideId = 123;
    const reserveTx = await rideEscrow.connect(rider).reserveForRide(rideId, driver.address, 500);
    await reserveTx.wait();
    console.log("Reserve Ride Tx Hash:", reserveTx.hash);

    // 3. Release to driver
    const releaseTx = await rideEscrow.connect(rider).releaseToDriver(rideId);
    await releaseTx.wait();
    console.log("Release Ride Tx Hash:", releaseTx.hash);

    // Check final balances
    const riderBalance = await rideEscrow.getBalance(rider.address);
    const driverBalance = await rideEscrow.getBalance(driver.address);
    console.log("Rider Balance:", riderBalance.toString());
    console.log("Driver Balance:", driverBalance.toString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
