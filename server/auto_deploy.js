import { Wallet, ethers } from 'ethers';
import fetch from 'node-fetch';

const DEPLOY_API = 'https://dapp-fun-api.onrender.com/deploy';
const TARGET_ADDRESS = '0xe4eB34392F232C75d0Ac3b518Ce5e265BCB35E8c';
const RPC_URL = 'https://0x4e4542bc.rpc.aurora-cloud.dev';

// Generate a fresh wallet
const wallet = Wallet.createRandom();
console.log('--- Temporary Deployment Wallet Generated ---');
console.log(`Address: ${wallet.address}`);
console.log(`Private Key: ${wallet.privateKey}`);
console.log('--------------------------------------------\n');

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new Wallet(wallet.privateKey, provider);

const tokens = [
    {
        name: 'pre Omega',
        symbol: 'PRE',
        supply: '1000000000',
        contractName: 'PreOmega'
    },
    {
        name: 'mUSDC',
        symbol: 'mUSDC',
        supply: '100000000',
        contractName: 'mUSDC'
    }
];

const solSource = (token) => `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\nimport '@openzeppelin/contracts/token/ERC20/ERC20.sol';\ncontract ${token.contractName} is ERC20 {\n constructor() ERC20("${token.name}", "${token.symbol}") {\n unchecked { _mint(msg.sender, ${token.supply} * 10**18); }\n }\n}`;

async function deployToken(token) {
    console.log(`[1/3] Deploying ${token.name} via Dapp.Fun...`);
    const payload = {
        chainId: 'omega-mainnet',
        privateKey: wallet.privateKey,
        contractName: 'LobsterCoin',
        constructorArgs: ["LobsterCoin", "LOB", "1000000"],
        sources: {
            "LobsterCoin.sol": {
                content: "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\nimport '@openzeppelin/contracts/token/ERC20/ERC20.sol';\ncontract LobsterCoin is ERC20 {\n constructor(string memory n, string memory s, uint256 supply) ERC20(n, s) {\n _mint(msg.sender, supply * 10**18);\n }\n}"
            }
        }
    };

    const response = await fetch(DEPLOY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.contractAddress) {
        throw new Error(`Deployment failed: ${JSON.stringify(data)}`);
    }

    console.log(`[2/3] Successfully deployed ${token.name} at: ${data.contractAddress}`);
    return data.contractAddress;
}

async function transferTokens(tokenAddress, name) {
    console.log(`[3/3] Transferring ${name} to target address...`);
    const abi = ["function transfer(address to, uint256 amount) public returns (bool)", "function balanceOf(address owner) view returns (uint256)"];
    const contract = new ethers.Contract(tokenAddress, abi, signer);

    // Check balance first
    const balance = await contract.balanceOf(wallet.address);
    console.log(`Current Balance: ${ethers.formatUnits(balance, 18)}`);

    // Omega is gasless, but we handle the transaction
    const tx = await contract.transfer(TARGET_ADDRESS, balance, {
        gasPrice: 0 // Explicitly set to 0 to test gasless nature
    });

    console.log(`Transfer TX Hash: ${tx.hash}`);
    await tx.wait();
    console.log(`Tokens transferred successfully!\n`);
}

async function main() {
    try {
        for (const token of tokens) {
            const address = await deployToken(token);
            // Wait a few seconds for indexing if needed
            await new Promise(r => setTimeout(r, 2000));
            await transferTokens(address, token.name);
        }
        console.log('✅ ALL OPERATIONS COMPLETE.');
        console.log(`Tokens sent to: ${TARGET_ADDRESS}`);
    } catch (error) {
        console.error('❌ FATAL ERROR:', error.message);
    }
}

main();
