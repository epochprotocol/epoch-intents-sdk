import axios from "axios";
import {
  Config,
  Intent,
  NonceResponse,
  SolveIntentResponse,
  Task,
} from "./types";
import { Signer, VoidSigner } from "ethers";
import { getEIP191IntentHash, getEncodedIntent, getIntentHash } from "./web3";
import { encodeBase64 } from "./utils";

/**
 * Creates a new SDK instance with the given configuration
 */
export const EpochIntents = (config: Config) => {
  const sdk = {
    /**
     * Encodes a task object to base64
     */
    encodeTask: (task: Task): string => {
      return encodeBase64(task);
    },

    /**
     * Gets a nonce for a new intent
     */
    getNonce: async (intent: Intent): Promise<string> => {
      try {
        const response = await axios.post<NonceResponse>(
          `${config.apiUrl}/getNonce`,
          intent
        );
        return response.data.nonce;
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new Error(`Failed to get nonce: ${error.message}`);
        }
        throw new Error("Failed to get nonce: Unknown error");
      }
    },

    /**
     * Submits a signed intent for execution
     */
    submitIntent: async (intent: Intent): Promise<SolveIntentResponse> => {
      try {
        const response = await axios.post<SolveIntentResponse>(
          `${config.apiUrl}/solveIntent`,
          intent
        );
        return response.data;
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new Error(`Failed to submit intent: ${error.message}`);
        }
        throw new Error("Failed to submit intent: Unknown error");
      }
    },

    /**
     * Creates a new intent with the given parameters
     */
    createIntent: (
      sender: string,
      task: Task,
      approvals: Intent["approvals"],
      nonce?: string
    ): Intent => {
      const chainIds: number[] = [];
      const constraint: Intent["constraint"] = {
        constraintData: "0x",
        constraintResponse: "0x",
        constraints: "",
        optimizationFactor: 1,
        deadline: Math.floor(Date.now() / 1000) + 600, // 1 hour from now
        triggers: "",
        preferredSolvers: [],
      };

      return {
        sender,
        approvals,
        task: encodeBase64(task),
        nonce: nonce || "0",
        constraint,
        proposedFeeRewards: 0,
        recurring: false,
        chainIds,
        calldatas: [],
      };
    },

    /**
     * Signs an intent with the given account
     */
    signIntent: async (
      intent: Intent,
      signer: VoidSigner | Signer
    ): Promise<string> => {
      if (!signer) {
        throw new Error("Signer not provided");
      }

      try {
        const message = getEIP191IntentHash(intent);
        const signature = await signer.signMessage(message);
        return signature;
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new Error(`Failed to sign intent: ${error.message}`);
        }
        throw new Error("Failed to sign intent: Unknown error");
      }
    },

    /**
     * Gets the hash of an intent
     */
    getIntentHash: (intent: Intent): string => {
      return getIntentHash(intent);
    },

    /**
     * Gets the EIP-191 hash of an intent
     */
    getEIP191IntentHash: (intent: Intent): string => {
      return getEIP191IntentHash(intent);
    },
  };

  return sdk;
};

// Export types
export * from "./types";
