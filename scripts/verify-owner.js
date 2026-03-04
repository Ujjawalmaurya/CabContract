const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
    console.log(`Checking contract at: ${contractAddress}`);

    try {
        const RideEscrow = await hre.ethers.getContractAt("RideEscrow", contractAddress);
        const owner = await RideEscrow.owner();
        console.log(`Contract Owner: ${owner}`);

        const signers = await hre.ethers.getSigners();
        console.log(`Signer #0: ${await signers[0].getAddress()}`);

        if (owner.toLowerCase() === (await signers[0].getAddress()).toLowerCase()) {
            console.log("✅ Owner matches Signer #0");
        } else {
            console.log("❌ Owner does NOT match Signer #0");
        }
    } catch (e) {
        console.error("Failed to query contract:", e.message);
    }
}

main().catch(console.error);
