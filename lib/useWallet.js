import { useState, useEffect, useCallback } from "react";

/**
 * When multiple wallet extensions are installed (MetaMask + Phantom),
 * Phantom overrides window.ethereum. We need to find the real MetaMask
 * provider from the providers array.
 */
function getMetaMaskProvider() {
  if (!window.ethereum) return null;

  // If there's a providers array (multiple wallets), find the real MetaMask
  if (window.ethereum.providers?.length) {
    const metaMask = window.ethereum.providers.find(
      (p) => p.isMetaMask && !p.isPhantom
    );
    if (metaMask) return metaMask;
  }

  // Single provider — check it's actually MetaMask
  if (window.ethereum.isMetaMask && !window.ethereum.isPhantom) {
    return window.ethereum;
  }

  // Fallback: just use whatever is available
  return window.ethereum;
}

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const switchToOmega = useCallback(async () => {
    const provider = getMetaMaskProvider();
    if (!provider) return;
    const chainId = "0x4e4542bc"; // 1313161916 in hex
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId,
                chainName: "Omega Network",
                nativeCurrency: { name: "Omega", symbol: "OMEGA", decimals: 18 },
                rpcUrls: ["https://0x4e4542bc.rpc.aurora-cloud.dev"],
                blockExplorerUrls: ["https://0x4e4542bc.explorer.aurora-cloud.dev"],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Omega Network", addError);
        }
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const provider = getMetaMaskProvider();
    if (!provider) {
      setError("Please install MetaMask to connect");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      if (accounts?.[0]) {
        setAddress(accounts[0]);
        setTimeout(() => switchToOmega(), 500);
      }
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, [switchToOmega]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  useEffect(() => {
    const provider = getMetaMaskProvider();
    if (!provider) return;
    const handler = (accounts) => {
      setAddress(accounts?.[0] || null);
    };
    provider.on("accountsChanged", handler);
    provider.on("chainChanged", () => window.location.reload());
    return () => {
      provider.removeListener?.("accountsChanged", handler);
    };
  }, []);

  useEffect(() => {
    const provider = getMetaMaskProvider();
    if (!provider) return;
    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts?.[0]) setAddress(accounts[0]);
      })
      .catch(() => { });
  }, []);

  return {
    address,
    shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
    connected: !!address,
    connect,
    disconnect,
    switchToOmega,
    connecting,
    error,
    getProvider: getMetaMaskProvider,
  };
}
