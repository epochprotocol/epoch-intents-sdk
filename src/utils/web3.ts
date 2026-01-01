import { ethers } from "ethers";
import { SignAuthorizationReturnType } from "viem/_types/accounts/utils/signAuthorization";

import {
  Auth7702RLPType,
  AuthEntry7702RLPType,
  AuthorizationListEntryAny,
} from "../types";

const formatNumber = (_value: bigint | string | number): Uint8Array => {
  const value = typeof _value === "bigint" ? _value : BigInt(_value);
  // Convert bigint to hex string, then to bytes for RLP encoding
  const hexValue = ethers.toBeHex(value);
  return ethers.getBytes(hexValue);
};

export const encodeRLPAuthorizationEntryUnsigned = (
  chainId: number,
  address: any,
  nonce: bigint
): string => {
  // MAGIC = "0x05" defined in ERC-7702
  return ethers.concat([
    "0x05",
    ethers.encodeRlp([formatNumber(chainId), address, formatNumber(nonce)]),
  ]);
};

export const getAuthorizationList = async (
  chainId: number,
  nonce: bigint,
  authorizer: string,
  signer: ethers.Wallet | ethers.VoidSigner
): Promise<AuthorizationListEntryAny[]> => {
  const dataToSign = encodeRLPAuthorizationEntryUnsigned(
    chainId,
    authorizer,
    nonce
  );
  const authHash = ethers.keccak256(dataToSign);
  // TODO: should be signDigest
  const sig = await signer.signMessage(authHash);
  // In ethers v6, splitSignature is removed, we need to parse manually
  const sigBytes = ethers.getBytes(sig);
  const r = ethers.hexlify(sigBytes.slice(0, 32));
  const s = ethers.hexlify(sigBytes.slice(32, 64));
  const v = sigBytes[64];
  const yParity = v - 27;

  return [
    {
      chainId: chainId,
      address: authorizer,
      nonce: nonce,
      yParity: yParity,
      r: r,
      s: s,
    },
  ];
};

export const getSignedTransaction = async (
  provider: ethers.Provider,
  relayer: ethers.SigningKey,
  authorizationList: SignAuthorizationReturnType | AuthorizationListEntryAny[],
  to: string = ethers.ZeroAddress,
  value: bigint | number = 0,
  data: string = "0x",
  nonce?: number
) => {
  const relayerAddress = ethers.computeAddress(relayer.publicKey);
  const relayerNonce =
    nonce || (await provider.getTransactionCount(relayerAddress));

  const valueBigInt = typeof value === "bigint" ? value : BigInt(value);

  const tx = {
    from: relayerAddress,
    nonce: relayerNonce,
    gasLimit: 21000000,
    gasPrice: 3100,
    data: data,
    to: to,
    value: valueBigInt,
    chainId: (await provider.getNetwork()).chainId,
    type: 4,
    maxFeePerGas: 30000,
    maxPriorityFeePerGas: 30000,
    accessList: [],
    authorizationList: authorizationList,
  };

  const encodedTx = serializeEip7702(tx, null);
  const txHashToSign = ethers.keccak256(encodedTx);
  const signature = relayer.sign(txHashToSign);

  return serializeEip7702(tx, signature);
};

export const serializeEip7702 = (
  tx: any,
  _sig: null | ethers.Signature
): string => {
  const fields: Array<any> = [
    formatNumber(tx.chainId),
    formatNumber(tx.nonce),
    formatNumber(tx.maxPriorityFeePerGas || 0),
    formatNumber(tx.maxFeePerGas || 0),
    formatNumber(tx.gasLimit),
    tx.to,
    formatNumber(tx.value),
    tx.data,
    formatAccessList(tx.accessList || []),
    formatAuthorizationList(tx.authorizationList || []),
  ];

  if (_sig) {
    // In ethers v6, Signature object has r, s, v properties
    const yParity = _sig.v - 27;
    fields.push(formatNumber(yParity));
    fields.push(ethers.getBytes(_sig.r));
    fields.push(ethers.getBytes(_sig.s));
  }

  return ethers.concat(["0x04", ethers.encodeRlp(fields)]);
};

const formatAccessList = (
  value: ethers.AccessListish
): Array<[string, Array<string>]> => {
  return ethers
    .accessListify(value)
    .map((set) => [set.address, set.storageKeys]);
};

const formatAuthorizationList = (
  value: AuthorizationListEntryAny[]
): Auth7702RLPType => {
  return value.map((set: AuthorizationListEntryAny) =>
    formatAuthorizationEntry(set)
  );
};

const formatAuthorizationEntry = (
  set: AuthorizationListEntryAny
): AuthEntry7702RLPType => {
  return [
    formatNumber(set.chainId),
    set.address,
    formatNumber(set.nonce),
    formatNumber(set.yParity),
    ethers.getBytes(set.r),
    ethers.getBytes(set.s),
  ];
};

export const ACCOUNT_CODE_PREFIX = "0xef0100";

export const isAccountDelegatedToAddress = async (
  provider: ethers.Provider,
  account: string,
  authority: string
) => {
  const codeAtEOA = await provider.getCode(account);
  return (
    codeAtEOA.length === 48 &&
    codeAtEOA.startsWith(ACCOUNT_CODE_PREFIX) &&
    ethers.getAddress("0x" + codeAtEOA.slice(8)) === authority
  );
};
