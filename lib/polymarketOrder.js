/**
 * Place a Polymarket order via CLOB client (Polygon).
 * Uses ethers v5 and @polymarket/clob-client; wallet must be on chain 137.
 *
 * Fee collection: Before placing the prediction order, a small USDC fee
 * is transferred on Polygon to the platform fee wallet.
 */
const CLOB_HOST = "https://clob.polymarket.com";
const POLYGON_CHAIN_ID = 137;

// Polygon USDC contract (PoS bridged)
const POLYGON_USDC = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359";
const ERC20_TRANSFER_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

/**
 * Transfer the platform fee (USDC on Polygon) to the fee wallet.
 * Amount is in USD (e.g. 0.025 = 2.5 cents).
 * Returns the tx hash or null if the amount rounds to zero.
 */
async function collectFee(signer, feeWallet, feeUsd) {
  if (!feeWallet || feeUsd <= 0) return null;
  // USDC has 6 decimals
  const amountWei = BigInt(Math.ceil(feeUsd * 1e6));
  if (amountWei === 0n) return null;
  try {
    const ethers5 = await import("ethers5");
    const { Contract } = ethers5;
    const usdc = new Contract(POLYGON_USDC, ERC20_TRANSFER_ABI, signer);
    const tx = await usdc.transfer(feeWallet, amountWei.toString());
    await tx.wait();
    return tx.hash;
  } catch (err) {
    console.warn("Fee collection failed (continuing with order):", err.message);
    // Don't block the order if fee transfer fails
    return null;
  }
}

export async function placePolymarketOrder(
  provider,
  { yesTokenId, noTokenId },
  side,
  price,
  size,
  feeWallet = null,
  feePct = 0
) {
  const tokenId = side === "yes" ? yesTokenId : noTokenId;
  if (!tokenId) throw new Error("This market doesn't support in-app orders yet.");

  const [{ ClobClient, Side }] = await Promise.all([
    import("@polymarket/clob-client"),
  ]);
  const ethers5 = await import("ethers5");
  const { providers } = ethers5;
  if (!providers?.Web3Provider) throw new Error("ethers5 Web3Provider not found");
  const prov = new providers.Web3Provider(provider);
  const signer = await prov.getSigner();

  // Collect fee before placing order
  if (feeWallet && feePct > 0) {
    const cost = Number(price) * Number(size);
    const feeUsd = cost * feePct;
    await collectFee(signer, feeWallet, feeUsd);
  }

  const tempClient = new ClobClient(CLOB_HOST, POLYGON_CHAIN_ID, signer);
  const apiCreds = await tempClient.createOrDeriveApiKey();
  const client = new ClobClient(CLOB_HOST, POLYGON_CHAIN_ID, signer, apiCreds, 0);

  const orderSide = side === "yes" ? Side.BUY : Side.BUY;
  const res = await client.createAndPostOrder({
    tokenID: tokenId,
    price: Math.max(0.01, Math.min(0.99, Number(price))),
    size: Math.max(1, Math.floor(Number(size))),
    side: orderSide,
  });
  return res;
}

export function getPolygonChainId() {
  return POLYGON_CHAIN_ID;
}
