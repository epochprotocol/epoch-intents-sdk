import axios from "axios";
import { ethers } from "ethers";
import { createWalletClient, extractChain, http, WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";
import { EpochIntents } from "..";
import { RPC_ENDPOINTS } from "../constants";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("EpochIntent", () => {
  let sdk: ReturnType<typeof EpochIntents>;
  let mockSigner: ethers.Wallet;
  let mockWalletClient: WalletClient;
  let relayerSigningKey: ethers.SigningKey;
  const chainId = 10;

  beforeEach(async () => {
    sdk = EpochIntents({
      apiUrl: "http://localhost:8080",
    });

    const privateKey = process.env.PRIVATE_KEY;
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY is not set");
    }
    if (!relayerPrivateKey) {
      throw new Error("RELAYER_PRIVATE_KEY is not set");
    }

    const chain = extractChain({
      chains: Object.values(chains),
      id: chainId as any,
    });

    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[chainId]);
    mockSigner = new ethers.Wallet(privateKey, provider);
    relayerSigningKey = new ethers.SigningKey(relayerPrivateKey);

    mockWalletClient = createWalletClient({
      account: privateKeyToAccount(privateKey as `0x${string}`),
      chain,
      transport: http(RPC_ENDPOINTS[chainId]),
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("createWallet", () => {
    it("should get the smart contract wallet address", async () => {
      const userAddress = await mockSigner.getAddress();
      console.log("userAddress: ", userAddress);
      const proxyAddress = await sdk.getUserSCWalletAddress(
        userAddress,
        await mockSigner.getChainId(),
        false
      );
      console.log("proxyAddress: ", proxyAddress);

      expect(proxyAddress).toBe("0xAd5A35DdBeE1dC40B9b8de21e4b6b106278dc287");
    });

    // it("should create a wallet", async () => {
    //   const userAddress = await mockSigner.getAddress();
    //   const proxyAddress = await sdk.createWallet(
    //     userAddress,
    //     await mockSigner.getChainId(),
    //     relayerSigningKey,
    //     {
    //       is7702: true,
    //       userSigner: mockWalletClient,
    //     }
    //   );

    //   const codeAtUserAddress = await mockSigner.provider?.getCode(userAddress);

    //   expect(proxyAddress).toBe("0xAd5A35DdBeE1dC40B9b8de21e4b6b106278dc287");
    //   expect(codeAtUserAddress).not.toBe("0x");
    // }, 100000000);
  });
});
