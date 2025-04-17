import { Transaction } from "@/types";
import { ethers } from "ethers";

export const executeTransaction = async (
  transaction: Transaction,
  signer: ethers.VoidSigner | ethers.Signer | ethers.Wallet
) => {
  const tx = await signer.sendTransaction({
    to: transaction.target,
    data: transaction.data,
    value: transaction.value,
  });

  const receipt = await tx.wait();
  console.log("receipt: ", receipt);
  return receipt;
};
