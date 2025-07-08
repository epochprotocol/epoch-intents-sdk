import axios from "axios";
import { ethers } from "ethers";
import { WalletClient } from "viem";

import {
  Calldata,
  Config,
  CreateWalletOptions,
  Intent,
  NonceResponse,
  Path,
  SolveIntentResponse,
  Task,
  WalletType,
} from "./types";
import { encodeBase64 } from "./utils";
import { executeTransaction, getProvider } from "./web3";
import { getEIP191IntentHash, getIntentHash } from "./web3/intents";
import {
  getCreateWalletData,
  getMetamaskDelegatorInstance,
  set7702Delegator,
} from "./web3/wallet";
import { createDelegation, Delegation } from "@metamask/delegation-toolkit";
import { CONTRACT_ADDRESSES, METAMASK_EXEC_MANAGER } from "./constants";
import mainnetGraph from "./data/epochgraphmainnet.json";
import testnetGraph from "./data/epochgraphtestnet.json";

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

    createWallet: async (
      userAddress: string,
      chainId: number,
      walletType: WalletType,
      relayer:
        | ethers.utils.SigningKey
        | ethers.VoidSigner
        | ethers.Signer
        | WalletClient,
      options?: CreateWalletOptions
    ): Promise<string> => {
      if (options?.is7702) {
        if (walletType === WalletType.metamask) {
          throw new Error(
            "Metamask Wallet is not supported at the moment for 7702"
          );
        }
        if (
          options.userSigner instanceof ethers.VoidSigner ||
          options.userSigner instanceof ethers.Signer
        ) {
          throw new Error(
            "User signer must be an WalletClient, ethers Signer not supported at the moment for 7702"
          );
        }
        if (!(relayer instanceof ethers.utils.SigningKey)) {
          throw new Error(
            "Relayer must be an SigningKey, ethers Signer not supported at the moment for 7702"
          );
        }
      }

      const { txnData, proxyAddress, initializerData, isAlreadyDeployed } =
        await getCreateWalletData(userAddress, chainId, walletType, options);
      if (!proxyAddress) {
        throw new Error("Could not deploy proxy.");
      }

      if (!isAlreadyDeployed) {
        let relayerSigner = relayer;
        if (relayer instanceof ethers.utils.SigningKey) {
          relayerSigner = new ethers.Wallet(
            relayer.privateKey,
            getProvider(chainId)
          );
        }
        await executeTransaction(
          txnData,
          relayerSigner as ethers.Signer | ethers.VoidSigner | WalletClient
        );
      }

      if (options?.is7702 && options?.userSigner) {
        await set7702Delegator(
          chainId,
          userAddress,
          proxyAddress,
          initializerData,
          options.userSigner as WalletClient,
          relayer as ethers.utils.SigningKey
        );
      }

      return proxyAddress;
    },

    getUserSCWalletAddress: async (
      userAddress: string,
      chainId: number,
      walletType: WalletType,
      is7702?: boolean,
      options?: CreateWalletOptions
    ): Promise<string> => {
      const { proxyAddress } = await getCreateWalletData(
        userAddress,
        chainId,
        walletType,
        {
          is7702,
          ...options,
        }
      );

      if (!proxyAddress) {
        throw new Error("Could not deploy proxy.");
      }

      return proxyAddress;
    },

    /**
     * Gets a nonce for a new intent
     */
    getNonce: async (intent: Intent): Promise<string> => {
      try {
        const response = await axios.post<NonceResponse>(
          `${config.apiUrl}/getNonce`,
          { ...intent }
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
          { ...intent }
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
     * Gets paths for an intent
     */
    getPathsForIntent: async (intent: Intent): Promise<Path[]> => {
      try {
        const response = await axios.post<Path[]>(
          `${config.apiUrl}/findPathsForIntent`,
          { ...intent }
        );
        return response.data;
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new Error(`Failed to get paths for intent: ${error.message}`);
        }
        throw new Error("Failed to get paths for intent: Unknown error");
      }
    },

    /**
     * Creates a new intent with the given parameters
     */
    createIntent: (
      sender: string,
      task: Task,
      approvals: Intent["approvals"],
      nonce?: string,
      calldatas?: Calldata[]
    ): Intent => {
      let chainIds: number[] = [];
      approvals.forEach((approval) => {
        chainIds.push(approval.chainId);
      });

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
        calldatas: calldatas || [],
      };
    },

    /**
     * Signs an intent with the given account
     */
    signIntent: async (
      intent: Intent,
      signer: ethers.VoidSigner | ethers.Signer | WalletClient,
      walletType?: WalletType
    ): Promise<string> => {
      if (!signer) {
        throw new Error("Signer not provided");
      }

      try {
        const message = getEIP191IntentHash(intent);

        if (
          signer instanceof ethers.VoidSigner ||
          signer instanceof ethers.Signer
        ) {
          const signature = await signer.signMessage(message);
          return signature;
        } else if (walletType === WalletType.metamask) {
          const metamaskDelegator = await getMetamaskDelegatorInstance(
            signer.account?.address as string,
            signer as WalletClient
          );
          const signature = await metamaskDelegator.signMessage({
            message,
          });
          return signature;
        } else {
          const account = signer.account;
          if (!account) {
            throw new Error("WalletClient account not found");
          }
          const signature = await signer.signMessage({
            message,
            account,
          });
          return signature;
        }
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

    signDelegation: async (
      signer: WalletClient
    ): Promise<Delegation & { signature: `0x${string}` }> => {
      const metamaskDelegatorInstance = await getMetamaskDelegatorInstance(
        signer.account?.address as string,
        signer
      );

      const chainId = await signer.getChainId();

      const delegation = createDelegation({
        to: METAMASK_EXEC_MANAGER[chainId] as `0x${string}`,
        from: metamaskDelegatorInstance.address,
        caveats: [], // Empty caveats array - we recommend adding appropriate restrictions.
      });

      const signature = await metamaskDelegatorInstance.signDelegation({
        delegation,
      });

      const signedDelegation = {
        ...delegation,
        signature,
      };

      return signedDelegation;
    },

    getContractAddresses: (): { [key: string]: { [key: number]: string } } => {
      return CONTRACT_ADDRESSES;
    },

    getDelegatorInstance: async (
      address: string,
      signer: WalletClient
    ): Promise<any> => {
      return await getMetamaskDelegatorInstance(address, signer);
    },
  };

  return sdk;
};

// Export types
export * from "./types";
export { mainnetGraph, testnetGraph };
