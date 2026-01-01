import { ethers } from "ethers";
import {
  createPublicClient,
  extractChain,
  http,
  TransactionReceipt,
  WalletClient,
} from "viem";
import * as chains from "viem/chains";

import { RPC_ENDPOINTS } from "../constants";
import { Transaction } from "../types";

export const getProvider = (chainId: number) => {
  return new ethers.JsonRpcProvider(RPC_ENDPOINTS[chainId]);
};

export const executeTransaction = async (
  transaction: Transaction,
  signer: ethers.Wallet | ethers.VoidSigner | WalletClient
): Promise<TransactionReceipt | ethers.TransactionReceipt> => {
  if (signer instanceof ethers.VoidSigner || signer instanceof ethers.Wallet) {
    const tx = await signer.sendTransaction({
      to: transaction.target as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: BigInt(transaction.value),
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }
    return receipt;
  } else {
    const account = signer.account;
    if (!account) {
      throw new Error("WalletClient account not found");
    }
    const chainId = await signer.getChainId();

    const chain = extractChain({
      chains: Object.values(chains),
      id: chainId as any,
    });

    const publicClient = createPublicClient({
      transport: http(RPC_ENDPOINTS[chainId]),
      chain,
    });

    const hash = await (signer as WalletClient).sendTransaction({
      account,
      to: transaction.target as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: BigInt(transaction.value),
      chain: chain as chains.Chain,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    return receipt as TransactionReceipt;
  }
};
