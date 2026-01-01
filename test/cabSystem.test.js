import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("CabSystem", function () {
    it("Should register driver and complete a ride", async function () {
        const [rider, driver] = await ethers.getSigners();

        const CabSystem = await ethers.getContractFactory("CabSystem");
        const cab = await CabSystem.deploy();

        // Driver registers
        await cab.connect(driver).registerDriver("John", "Toyota");

        // Rider requests ride with 1 ETH
        await cab.connect(rider).requestRide("A St", "B St", {
            value: ethers.parseEther("1.0")
        });

        // Driver accepts
        await cab.connect(driver).acceptRide(1);

        // Driver completes and gets paid
        await cab.connect(driver).completeRide(1);

        const driverInfo = await cab.drivers(driver.address);
        expect(driverInfo.totalRides).to.equal(1n);
    });
});
