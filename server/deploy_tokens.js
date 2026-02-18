import fetch from 'node-fetch';

const DEPLOY_API = 'https://dapp-fun-api.onrender.com/deploy';
const PRIVATE_KEY = process.env.PRIVATE_KEY; // User must provide this

if (!PRIVATE_KEY) {
    console.error('Error: PRIVATE_KEY environment variable is required.');
    process.exit(1);
}

const tokens = [
    {
        name: 'pre Omega',
        symbol: 'PRE',
        supply: '1000000000' // 1 Billion
    },
    {
        name: 'mUSDC',
        symbol: 'mUSDC',
        supply: '100000000' // 100 Million
    }
];

const solSource = (name) => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
contract ${name.replace(/\s+/g, '')} is ERC20 {
 constructor(string memory n, string memory s, uint256 supply) ERC20(n, s) {
 _mint(msg.sender, supply * 10**18);
 }
}`;

async function deployToken(token) {
    console.log(`Deploying ${token.name}...`);
    const payload = {
        chainId: 'omega-mainnet',
        privateKey: PRIVATE_KEY,
        contractName: token.name.replace(/\s+/g, ''),
        constructorArgs: [token.name, token.symbol, token.supply],
        sources: {
            [`${token.name.replace(/\s+/g, '')}.sol`]: {
                content: solSource(token.name)
            }
        }
    };

    try {
        const response = await fetch(DEPLOY_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.contractAddress) {
            console.log(`Successfully deployed ${token.name} at: ${data.contractAddress}`);
            return data.contractAddress;
        } else {
            console.error(`Failed to deploy ${token.name}:`, data);
        }
    } catch (error) {
        console.error(`Error deploying ${token.name}:`, error.message);
    }
}

async function main() {
    const results = {};
    for (const token of tokens) {
        const address = await deployToken(token);
        results[token.symbol] = address;
    }
    console.log('\nDeployment Complete:');
    console.log(JSON.stringify(results, null, 2));
}

main();
