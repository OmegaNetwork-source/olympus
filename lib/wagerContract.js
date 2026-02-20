/**
 * WagerEscrow contract helpers — create/fund/bet/resolve/claim.
 * Deploy with: npx hardhat run scripts/deploy-wager.js [--network <name>]
 * Addresses per chainId are in wager-addresses.json.
 */

import { ethers } from "ethers";

// Minimal ABI for WagerEscrow (match contracts/WagerEscrow.sol)
const WAGER_ABI = [
  "function createMarket(address token, uint256 endTime, string category, string title, string imageUrl, string description) returns (uint256 marketId)",
  "function fundMarket(uint256 marketId, uint256 amount)",
  "function bet(uint256 marketId, bool sideYes, uint256 amount)",
  "function resolve(uint256 marketId, bool outcomeYes)",
  "function claim(uint256 marketId)",
  "function nextMarketId() view returns (uint256)",
  "function markets(uint256) view returns (address creator, address token, uint256 endTime, uint256 yesTotal, uint256 noTotal, bool resolved, uint8 outcome, uint256 creatorFunds)",
  "function getMarketTotals(uint256 marketId) view returns (uint256 yesTotal, uint256 noTotal, bool resolved, uint8 outcome)",
  "function getMarketInfo(uint256 marketId) view returns (address creator, address token, uint256 endTime, uint256 creatorFunds)",
  "function getUserPosition(uint256 marketId, address user) view returns (uint256 yesBal, uint256 noBal)",
  "function yesBalance(uint256, address) view returns (uint256)",
  "function noBalance(uint256, address) view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, address indexed creator, address token, uint256 endTime, string category, string title, string imageUrl, string description)",
  "event Funded(uint256 indexed marketId, address indexed creator, uint256 amount)",
  "event Bet(uint256 indexed marketId, address indexed user, bool sideYes, uint256 amount)",
  "event Resolved(uint256 indexed marketId, bool outcomeYes)",
  "event Claimed(uint256 indexed marketId, address indexed user, uint256 amount)",
];

let addressesByChain = null;

async function getAddresses() {
  if (addressesByChain) return addressesByChain;
  try {
    // Served from public/wager-addresses.json (deploy script can write there too)
    const base = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
    const res = await fetch(`${base}/wager-addresses.json`);
    addressesByChain = await res.json();
  } catch {
    addressesByChain = {};
  }
  return addressesByChain;
}

export function getWagerAddress(chainId) {
  return addressesByChain?.[String(chainId)] || null;
}

export async function getWagerContract(providerOrSigner, chainId) {
  const addrs = await getAddresses();
  const address = addrs[String(chainId)];
  if (!address || address === "0x" || address === "") return null;
  return new ethers.Contract(address, WAGER_ABI, providerOrSigner);
}

export async function createMarket(signer, { token, endTime, category, title, imageUrl, description }) {
  const chainId = (await signer.provider.getNetwork()).chainId;
  const contract = await getWagerContract(signer, chainId);
  if (!contract) throw new Error("WagerEscrow not deployed on this network. Run: npx hardhat run scripts/deploy-wager.js --network <your-network>");
  const tx = await contract.createMarket(
    token || ethers.ZeroAddress,
    endTime,
    category || "",
    title || "",
    imageUrl || "",
    description || ""
  );
  const rec = await tx.wait();
  const created = rec?.logs?.find((l) => l.fragment?.name === "MarketCreated");
  const marketId = created ? BigInt(created.topics[1]) : (await contract.nextMarketId()) - 1n;
  return Number(marketId);
}

export async function fundMarket(signer, marketId, amountWei, useNative = false) {
  const chainId = (await signer.provider.getNetwork()).chainId;
  const contract = await getWagerContract(signer, chainId);
  if (!contract) throw new Error("WagerEscrow not deployed on this network");
  const overrides = useNative ? { value: amountWei } : {};
  const tx = await contract.fundMarket(marketId, amountWei, overrides);
  await tx.wait();
}

export async function placeBet(signer, marketId, sideYes, amountWei, useNative = false) {
  const chainId = (await signer.provider.getNetwork()).chainId;
  const contract = await getWagerContract(signer, chainId);
  if (!contract) throw new Error("WagerEscrow not deployed on this network");
  const overrides = useNative ? { value: amountWei } : {};
  const tx = await contract.bet(marketId, sideYes, amountWei, overrides);
  await tx.wait();
}

export async function resolveMarket(signer, marketId, outcomeYes) {
  const chainId = (await signer.provider.getNetwork()).chainId;
  const contract = await getWagerContract(signer, chainId);
  if (!contract) throw new Error("WagerEscrow not deployed on this network");
  const tx = await contract.resolve(marketId, outcomeYes);
  await tx.wait();
}

export async function claimWinnings(signer, marketId) {
  const chainId = (await signer.provider.getNetwork()).chainId;
  const contract = await getWagerContract(signer, chainId);
  if (!contract) throw new Error("WagerEscrow not deployed on this network");
  const tx = await contract.claim(marketId);
  await tx.wait();
}

export async function fetchMarketTotals(provider, chainId, marketId) {
  const contract = await getWagerContract(provider, chainId);
  if (!contract) return null;
  const [yesTotal, noTotal, resolved, outcome] = await contract.getMarketTotals(marketId);
  return { yesTotal, noTotal, resolved, outcome: Number(outcome) };
}

export async function fetchMarketInfo(provider, chainId, marketId) {
  const contract = await getWagerContract(provider, chainId);
  if (!contract) return null;
  const [creator, token, endTime, creatorFunds] = await contract.getMarketInfo(marketId);
  return { creator, token, endTime, creatorFunds };
}

export async function fetchUserPosition(provider, chainId, marketId, userAddress) {
  const contract = await getWagerContract(provider, chainId);
  if (!contract) return null;
  const [yesBal, noBal] = await contract.getUserPosition(marketId, userAddress);
  return { yesBal, noBal };
}

/** Compute implied Yes probability from totals (0–1) */
export function impliedYesProbability(yesTotal, noTotal) {
  const y = BigInt(yesTotal?.toString() ?? 0);
  const n = BigInt(noTotal?.toString() ?? 0);
  const sum = y + n;
  if (sum === 0n) return 0.5;
  return Number(y) / Number(sum);
}
