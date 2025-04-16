import { ethers } from "ethers";
import { Intent } from "../types";
import {
  DEFAULT_CHAIN_ID,
  EPOCH_MODULE_ADDRESSES,
  INTENT_REGISTRY_ADDRESS,
  RPC_ENDPOINTS,
} from "@/constants";
import intentRegistryAbi from "@/web3/abis/intentRegistry.json";

export const getIntentRegistryInstance = (chainId: number) => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS[chainId]);
  return new ethers.Contract(
    INTENT_REGISTRY_ADDRESS[chainId],
    intentRegistryAbi,
    provider
  );
};

export const getEIP191IntentHashFromRegistry = async (intent: Intent) => {
  const registry = getIntentRegistryInstance(DEFAULT_CHAIN_ID);
  const hash = await registry.getIntentEIP191Hash(intent);
  return hash;
};

export const validateSignatureFromRegistry = async (
  intent: Intent,
  signature: string
) => {
  const registry = getIntentRegistryInstance(DEFAULT_CHAIN_ID);
  const epochModule = EPOCH_MODULE_ADDRESSES[DEFAULT_CHAIN_ID];
  const encodedIntent = getEncodedIntent(intent);

  const isValid = await registry.validateSignature(
    epochModule,
    encodedIntent,
    signature
  );

  return isValid;
};

export const getEncodedIntent = (intent: Intent) => {
  const abiCoder = new ethers.utils.AbiCoder();
  const intentParamsType = `tuple(
        address sender,
        tuple(address tokenAddress, address spenderAddress, uint256 amount, uint256 chainId)[] approvals,
        string task,
        uint256 nonce,
        tuple(bytes constraintData, bytes constraintResponse, string constraints, uint256 optimizationFactor, address[] preferredSolvers, uint256 deadline, string triggers) constraint,
        uint256 proposedFeeRewards,
        bool recurring,
        uint32[] chainIds,
        tuple(address target, uint256 value, bytes data)[] calldatas
      )`;
  const encodedIntent = abiCoder.encode([intentParamsType], [intent]);
  return ethers.utils.arrayify(encodedIntent);
};

export const getIntentHash = (intent: Intent) => {
  const encodedIntent = getEncodedIntent(intent);
  const messageHash = ethers.utils.keccak256(encodedIntent);
  return messageHash;
};

export const getEIP191IntentHash = (intent: Intent) => {
  const encodedIntent = getEncodedIntent(intent);
  return ethers.utils.hashMessage(encodedIntent);
};
