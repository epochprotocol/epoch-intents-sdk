import { ethers } from "ethers";
import { SignAuthorizationReturnType } from "viem/_types/accounts/utils/signAuthorization";

import {
  Auth7702RLPType,
  AuthEntry7702RLPType,
  AuthorizationListEntryAny,
} from "../types";

const formatNumber = (
  _value: ethers.BigNumber | string | number
): Uint8Array => {
  const value = ethers.BigNumber.from(_value);
  return ethers.utils.arrayify(value);
};

export const encodeRLPAuthorizationEntryUnsigned = (
  chainId: number,
  address: any,
  nonce: ethers.BigNumber
): string => {
  // MAGIC = "0x05" defined in ERC-7702
  return ethers.utils.hexConcat([
    "0x05",
    ethers.utils.RLP.encode([
      formatNumber(chainId),
      address,
      formatNumber(nonce),
    ]),
  ]);
};

export const getAuthorizationList = async (
  chainId: number,
  nonce: ethers.BigNumber,
  authorizer: string,
  signer: ethers.Signer | ethers.Wallet | ethers.VoidSigner
): Promise<AuthorizationListEntryAny[]> => {
  const dataToSign = encodeRLPAuthorizationEntryUnsigned(
    chainId,
    authorizer,
    nonce
  );
  const authHash = ethers.utils.keccak256(dataToSign);
  // TODO: should be signDigest
  const sig = await signer.signMessage(authHash);
  const authSignature = ethers.utils.splitSignature(sig);

  return [
    {
      chainId: chainId,
      address: authorizer,
      nonce: nonce,
      yParity: authSignature.yParityAndS,
      r: authSignature.r,
      s: authSignature.s,
    },
  ];
};

export const getSignedTransaction = async (
  provider: ethers.providers.Provider,
  relayer: ethers.utils.SigningKey,
  authorizationList: SignAuthorizationReturnType | AuthorizationListEntryAny[],
  to: string = ethers.constants.AddressZero,
  value: ethers.BigNumber | number = 0,
  data: string = "0x",
  nonce?: number
) => {
  const relayerAddress = ethers.utils.computeAddress(relayer.publicKey);
  const relayerNonce =
    nonce || (await provider.getTransactionCount(relayerAddress));

  const tx = {
    from: relayerAddress,
    nonce: relayerNonce,
    gasLimit: 21000000,
    gasPrice: 3100,
    data: data,
    to: to,
    value: value,
    chainId: (await provider.getNetwork()).chainId,
    type: 4,
    maxFeePerGas: 30000,
    maxPriorityFeePerGas: 30000,
    accessList: [],
    authorizationList: authorizationList,
  };

  const encodedTx = serializeEip7702(tx, null);
  const txHashToSign = ethers.utils.keccak256(encodedTx);
  const signature = relayer.signDigest(txHashToSign);

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
    const sig = ethers.utils.splitSignature(_sig);
    fields.push(formatNumber(sig.yParityAndS));
    fields.push(ethers.utils.arrayify(sig.r));
    fields.push(ethers.utils.arrayify(sig.s));
  }

  return ethers.utils.hexConcat(["0x04", ethers.utils.RLP.encode(fields)]);
};

const formatAccessList = (
  value: ethers.utils.AccessListish
): Array<[string, Array<string>]> => {
  return ethers.utils
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
    ethers.utils.arrayify(set.r),
    ethers.utils.arrayify(set.s),
  ];
};

export const ACCOUNT_CODE_PREFIX = "0xef0100";

export const isAccountDelegatedToAddress = async (
  provider: ethers.providers.Provider,
  account: string,
  authority: string
) => {
  const codeAtEOA = await provider.getCode(account);
  return (
    codeAtEOA.length === 48 &&
    codeAtEOA.startsWith(ACCOUNT_CODE_PREFIX) &&
    ethers.utils.getAddress("0x" + codeAtEOA.slice(8)) === authority
  );
};
