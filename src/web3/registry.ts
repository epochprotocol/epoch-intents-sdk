import { ethers } from "ethers";

import {
  DEFAULT_CHAIN_ID,
  EPOCH_MODULE_SAFE_ADDRESS,
  INTENT_REGISTRY_ADDRESS,
  RPC_ENDPOINTS,
} from "../constants";
import { Intent } from "../types";
import { getEncodedIntent } from "./intents";

import intentRegistryAbi from "./abis/intentRegistryAbi";

export const getIntentRegistryInstance = (chainId: number) => {
  const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[chainId]);
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
  const epochModule = EPOCH_MODULE_SAFE_ADDRESS[DEFAULT_CHAIN_ID];
  const encodedIntent = getEncodedIntent(intent);

  const isValid = await registry.validateSignature(
    epochModule,
    encodedIntent,
    signature
  );

  return isValid;
};
