import { ethers } from "ethers";
import { Intent } from "../types";

export const getEncodedIntent = (intent: Intent) => {
  const abiCoder = new ethers.AbiCoder();
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
  return ethers.getBytes(encodedIntent);
};

export const getIntentHash = (intent: Intent) => {
  const encodedIntent = getEncodedIntent(intent);
  const messageHash = ethers.keccak256(encodedIntent);
  return messageHash;
};

export const getEIP191IntentHash = (intent: Intent) => {
  const encodedIntent = getEncodedIntent(intent);
  return ethers.hashMessage(encodedIntent);
};
