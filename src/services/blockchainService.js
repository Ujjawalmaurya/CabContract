import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BlockchainService {
    constructor() {
        this.web3 = new Web3(process.env.BLOCKCHAIN_RPC || 'http://127.0.0.1:8545');
        this.contract = null;
        this.initialized = false;

        // Try to initialize contract if address is provided
        if (process.env.CONTRACT_ADDRESS) {
            this.initContract().catch(err => {
                console.error('Failed to initialize contract:', err.message);
            });
        }
    }

    async initContract() {
        try {
            const artifactPath = path.resolve(__dirname, '../../artifacts/contracts/RideManager.sol/RideManager.json');
            if (!fs.existsSync(artifactPath)) {
                console.warn('RideManager artifact not found at:', artifactPath);
                return;
            }

            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            this.contract = new this.web3.eth.Contract(artifact.abi, process.env.CONTRACT_ADDRESS);
            this.initialized = true;
            console.log('Blockchain contract initialized at:', process.env.CONTRACT_ADDRESS);
        } catch (error) {
            console.error('Error loading contract artifact:', error.message);
        }
    }

    async createWallet() {
        const account = this.web3.eth.accounts.create();
        return {
            address: account.address,
            privateKey: account.privateKey
        };
    }

    async getBalance(address) {
        if (!this.initialized) throw new Error('Contract not initialized');
        const balance = await this.contract.methods.getBalance(address).call();
        return this.web3.utils.fromWei(balance.toString(), 'ether');
    }

    async depositFunds(privateKey, amount) {
        if (!this.initialized) throw new Error('Contract not initialized');
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        const userAddress = account.address;
        const amountInWei = this.web3.utils.toWei(amount.toString(), 'ether');

        const tx = this.contract.methods.depositFunds(amountInWei);
        const gas = await tx.estimateGas({ from: userAddress });

        const signedTx = await this.web3.eth.accounts.signTransaction({
            to: process.env.CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas
        }, privateKey);

        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        return receipt.transactionHash;
    }

    async requestRide(privateKey, fare) {
        if (!this.initialized) throw new Error('Contract not initialized');
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        const riderAddress = account.address;
        const fareInWei = this.web3.utils.toWei(fare.toString(), 'ether');

        const tx = this.contract.methods.requestRide(fareInWei);
        const gas = await tx.estimateGas({ from: riderAddress });

        const signedTx = await this.web3.eth.accounts.signTransaction({
            to: process.env.CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas
        }, privateKey);

        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        // Extract rideId from events
        const event = receipt.events.RideRequested;
        const rideId = event ? event.returnValues.rideId : null;

        return {
            rideId,
            txHash: receipt.transactionHash
        };
    }

    async acceptRide(privateKey, rideId) {
        if (!this.initialized) throw new Error('Contract not initialized');
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        const driverAddress = account.address;
        const tx = this.contract.methods.acceptRide(rideId);
        const gas = await tx.estimateGas({ from: driverAddress });

        const signedTx = await this.web3.eth.accounts.signTransaction({
            to: process.env.CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas
        }, privateKey);

        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        return receipt.transactionHash;
    }

    async startRide(privateKey, rideId) {
        if (!this.initialized) throw new Error('Contract not initialized');
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        const driverAddress = account.address;
        const tx = this.contract.methods.startRide(rideId);
        const gas = await tx.estimateGas({ from: driverAddress });

        const signedTx = await this.web3.eth.accounts.signTransaction({
            to: process.env.CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas
        }, privateKey);

        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        return receipt.transactionHash;
    }

    async completeRide(privateKey, rideId) {
        if (!this.initialized) throw new Error('Contract not initialized');
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        const driverAddress = account.address;
        const tx = this.contract.methods.completeRide(rideId);
        const gas = await tx.estimateGas({ from: driverAddress });

        const signedTx = await this.web3.eth.accounts.signTransaction({
            to: process.env.CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas
        }, privateKey);

        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        return receipt.transactionHash;
    }
}

export default new BlockchainService();
