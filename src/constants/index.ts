export const RPC_ENDPOINTS: { [key: number]: string } = {
  1: "https://rpc.ankr.com/eth/328f2943cccedcece01572bbf49bebb41a773bca7c6d1fdea5ca239f55e72a5b",
  10: "https://rpc.ankr.com/optimism/328f2943cccedcece01572bbf49bebb41a773bca7c6d1fdea5ca239f55e72a5b",
  8453: "https://rpc.ankr.com/base/328f2943cccedcece01572bbf49bebb41a773bca7c6d1fdea5ca239f55e72a5b",
  11155111:
    "https://rpc.ankr.com/eth_sepolia/328f2943cccedcece01572bbf49bebb41a773bca7c6d1fdea5ca239f55e72a5b",
  11155420:
    "https://rpc.ankr.com/optimism_sepolia/328f2943cccedcece01572bbf49bebb41a773bca7c6d1fdea5ca239f55e72a5b",
  31337: "http://127.0.0.1:8545",
};

export const INTENT_REGISTRY_ADDRESS: { [key: number]: string } = {
  1: "0xa40AE5052b11d1E7462e6Fb7d3f6d9b7c4A2c866",
  10: "0x4693Fc5ea2d0AF241ad2f408534aBE7f3C5B70bc",
  8453: "0x4693Fc5ea2d0AF241ad2f408534aBE7f3C5B70bc",
  31337: "0xa40AE5052b11d1E7462e6Fb7d3f6d9b7c4A2c866",
  11155111: "0x18e15F5DE7053Bd2Ed9A39FCE10baAF23E1aEF97",
  11155420: "0x18e15F5DE7053Bd2Ed9A39FCE10baAF23E1aEF97",
};

export const EPOCH_MODULE_ADDRESSES: { [key: number]: string } = {
  1: "0xF242afDD49D3A96CB4E4b3E4D3fD82865665131C",
  10: "0x51B36876aad9bdabB00fcE2765D021942477DDbe",
  8453: "0x51B36876aad9bdabB00fcE2765D021942477DDbe",
  31337: "0xF242afDD49D3A96CB4E4b3E4D3fD82865665131C",
  11155111: "0x9898f15D2a1406C66758ec6d9485b4d4F8C53284",
  11155420: "0x9898f15D2a1406C66758ec6d9485b4d4F8C53284",
};

export const DEFAULT_CHAIN_ID = 10;
