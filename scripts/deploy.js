import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const CabSystem = await ethers.getContractFactory("CabSystem");
    const cab = await CabSystem.deploy();
    await cab.waitForDeployment();

    console.log("Contract deployed to:", await cab.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});