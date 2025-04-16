import { EpochIntent } from "../";
import { ethers } from "ethers";
import axios from "axios";
import { RPC_ENDPOINTS } from "../constants";
import {
  getEIP191IntentHashFromRegistry,
  validateSignatureFromRegistry,
} from "../web3";
import { encodeBase64 } from "../utils";
// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("EpochIntent", () => {
  let sdk: ReturnType<typeof EpochIntent>;
  let mockSigner: ethers.Signer;

  const mockIntent = {
    sender: "0x47C3E8E3607E01FF09FD98571c9cc2150aF4d6b9",
    approvals: [
      {
        tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        spenderAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "100",
        chainId: 8453,
      },
    ],
    task: {
      action: "lending:deposit",
      tokens: [["ETH"]],
      chainIds: [[10]],
    },
  };

  beforeEach(async () => {
    sdk = EpochIntent({
      apiUrl: "http://localhost:8080",
    });

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY is not set");
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS[10]);
    const wallet = new ethers.Wallet(privateKey, provider);
    // Remove redundant connect since wallet is already connected to provider
    mockSigner = wallet;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("createIntent", () => {
    it("should create an intent with the correct structure", () => {
      const intent = sdk.createIntent(
        mockIntent.sender,
        mockIntent.task,
        mockIntent.approvals
      );

      expect(intent).toEqual({
        sender: mockIntent.sender,
        approvals: mockIntent.approvals,
        task: encodeBase64(mockIntent.task),
        constraint: {
          constraintData: "0x",
          constraintResponse: "0x",
          constraints: "",
          optimizationFactor: 1,
          deadline: expect.any(Number),
          triggers: "",
          preferredSolvers: [],
        },
        proposedFeeRewards: 0,
        chainIds: [],
        recurring: false,
        calldatas: [],
        nonce: "0",
      });
    });
  });

  describe("getNonce", () => {
    it("should fetch nonce from SIO", async () => {
      const intent = sdk.createIntent(
        mockIntent.sender,
        mockIntent.task,
        mockIntent.approvals
      );

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        headers: {},
        config: { url: "http://localhost:8080/getNonce" },
        data: { nonce: "1" },
      });

      const nonce = await sdk.getNonce(intent);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://localhost:8080/getNonce",
        intent
      );
      expect(nonce).toBe("1");
    });
  });

  describe("signIntent", () => {
    it("should get correct intent hash", async () => {
      const intent = sdk.createIntent(
        mockIntent.sender,
        mockIntent.task,
        mockIntent.approvals
      );

      const eip191Hash = sdk.getEIP191IntentHash(intent);
      const eip191HashFromContract =
        await getEIP191IntentHashFromRegistry(intent);

      expect(eip191Hash).toBe(eip191HashFromContract);
    });

    it("should sign the intent correctly and get correct signature", async () => {
      const intent = sdk.createIntent(
        mockIntent.sender,
        mockIntent.task,
        mockIntent.approvals
      );

      const signature = await sdk.signIntent(intent, mockSigner);

      const eip191HashFromContract =
        await getEIP191IntentHashFromRegistry(intent);
      const signatureFromContract = await mockSigner.signMessage(
        eip191HashFromContract
      );

      const isLocalSignatureValid = await validateSignatureFromRegistry(
        intent,
        signature
      );
      const isContractSignatureValid = await validateSignatureFromRegistry(
        intent,
        signatureFromContract
      );

      expect(signature).toBe(signatureFromContract);
      expect(isLocalSignatureValid).toBe(true);
      expect(isContractSignatureValid).toBe(true);
    });
  });

  describe("submitIntent", () => {
    it("should submit intent to SIO", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        headers: {},
        config: { url: "http://localhost:8080/solveIntent" },
        data: { success: true, transactionHash: "0x123" },
      });

      const intent = sdk.createIntent(
        mockIntent.sender,
        mockIntent.task,
        mockIntent.approvals
      );
      const signature = await sdk.signIntent(intent, mockSigner);
      const intentWithSignature = { ...intent, signature };
      const result = await sdk.submitIntent(intentWithSignature);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://localhost:8080/solveIntent",
        intentWithSignature
      );

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe("0x123");
    });
  });
});
