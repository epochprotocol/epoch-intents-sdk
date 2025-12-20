import { ethers } from "ethers";
import { WalletClient } from "viem";

export type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
};

export type BlockchainData = {
  balance: string;
  // Add more blockchain data types as needed
};

export type ContractInteraction = {
  address: string;
  functionName: string;
  args: any[];
  // Add more contract interaction types as needed
};

export type Config = {
  apiUrl: string;
};

export type ChainEntity<
  T extends Chain | Protocol | Token = Chain | Protocol | Token,
> = {
  name: string;
  data: T;
};

export type Task = {
  action?: ProtocolType;
  tokens?: string[][];
  chainIds?: number[][];
  protocol?: string;
  recipient?: string;
  extraData?: string;
};

export type NonceResponse = {
  nonce: string;
};
//suggested by advice of @manank
export type SolveIntentResponse = {
  success: boolean;
  path: Path[];
};

export type ErrorResponse = {
  error: string;
};

export type Transaction = {
  target: string;
  data: string;
  value: string;
};

export enum WalletType {
  safe = "safe",
  metamask = "metamask",
}

export type CreateWalletOptions = {
  is7702?: boolean;
  userSigner?: ethers.VoidSigner | ethers.Signer | WalletClient;
  passkey?: any;
};

export type AuthorizationListEntryAny = {
  chainId: number;
  address: string;
  nonce: ethers.BigNumber;
  yParity: any;
  r: any;
  s: any;
};

export type AuthEntry7702RLPType = [
  Uint8Array,
  string,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  Uint8Array,
];

export type Auth7702RLPType = Array<AuthEntry7702RLPType>;

export type CreateWalletData = {
  txnData: Transaction;
  proxyAddress: string;
  initializerData: string;
  isAlreadyDeployed: boolean;
};

// Define types for various entities

export enum ProtocolType {
  lending = "lending:deposit",
  bridge = "bridge",
  swap = "swap",
  restaking = "restaking",
  yield = "yield",
  swapandbridge = "swapandbridge",
  protocolInteraction = "protocol-interaction",
}

export interface IntentTaskData {
  action?: ProtocolType;
  tokens?: string[][];
  chainIds?: string[][];
  protocol?: string;
  extraData?: any;
}

export type Protocol = {
  contractAddress: {
    [chainName: string]: string;
  };
  type: ProtocolType[];
};

export type Token = {
  contractAddress: {
    [chainName: string]: string;
  };
  decimals: number;
};

export type Chain = {
  chainId: number;
  explorer: string;
};

export type Relationships = {
  protocolTokensByChain: {
    [protocolName: string]: {
      [chainName: string]: {
        tokensIn?: string[];
        tokensOut?: string[];
        tokensInAndOut?: string[];
      }; // List of tokens a protocol supports on a specific chain
    };
  };
};

// Define the Graph type
export type Graph = {
  protocols: {
    [protocolName: string]: Protocol;
  };
  tokens: {
    [tokenName: string]: Token;
  };
  chains: {
    [chainName: string]: Chain;
  };
  relationships: Relationships;
};

// Define the types for the function parameters
// export type QuoteParams = {
//   assets: string[];
//   amount: string;
//   wallet: string;
//   chainId: number;
//   protocol?: string;
// };

// export type CalldataParams = QuoteParams;

export type Solver = {
  solverAddress: string;
  url: string;
  modules: string[];
  status: number;
};

export type Approval = {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
  chainId: number;
};

export type Constraint = {
  constraintData: string;
  constraintResponse: string;
  constraints: string;
  optimizationFactor: number;
  deadline: number;
  triggers: string;
  preferredSolvers: string[];
};

export type Calldata = {
  data: string;
  target: string;
  value: string;
};

export type Intent = {
  sender: string;
  approvals: Approval[];
  task: string;
  constraint: Constraint;
  nonce: string;
  proposedFeeRewards: number;
  chainIds: number[];
  calldatas: Calldata[];
  recurring: boolean;
  signature?: string;
  // Params to be updated after user input
  executor?: string;
  completed?: boolean;
};

export type PathItem = {
  name: string;
  chain?: Chain;
  protocol?: Protocol;
  token?: Token & { amount: string };
  calldata?: CalldataReturnInterface;
};

export type Path = PathItem[][][];

export interface QuoteReturnInterface {
  asset: string;
  tokenIn: string;
  tokenOut: string;
  optionalData: string;
  quoteId: string;
  quoteData: string;
  callData: CalldataReturnInterface;
}

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export type ExecutionTransaction = {
  target: string;
  value: string;
  callData: string;
};

export type IntermediaryApprovals = {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
  chainId: string;
};

export interface IntentEvent {
  user: string;
  intentIndex: number;
}

export interface EventData {
  abi: string[];
  data: string[];
  contractAddress: string;
  chainId: string;
}

export interface ExecutionTransactionWithEventData {
  userSCWalletAddress: string;
  nonce: string;
  transaction: ExecutionTransaction[];
  eventData: EventData;
  approvals: IntermediaryApprovals[];
  fillerTokenDatas: FillerTokenData[];
}

export interface CalldataReturnInterface {
  executionTransactions: ExecutionTransaction[];
  eventData: EventData;
}

export interface MultisendTransaction {
  to: string;
  value: string;
  data: string;
}

/// @title GaslessCrossChainOrder CrossChainOrder type
/// @notice Standard order struct to be signed by users, disseminated to fillers, and submitted to origin settler contracts
export interface IntentQuoteInterface {
  /// @dev The contract address that the order is meant to be settled by.
  /// Fillers send this order to this contract address on the origin chain
  originSettler: string;
  /// @dev The address of the user who is initiating the swap,
  /// whose input tokens will be taken and escrowed
  user: string;
  /// @dev Nonce to be used as replay protection for the order
  nonce: string;
  /// @dev The chainId of the origin chain
  originChainId: string;
  /// @dev The timestamp by which the order must be opened
  openDeadline: number;
  /// @dev The timestamp by which the order must be filled on the destination chain
  fillDeadline: number;
  /// @dev Type identifier for the order data. This is an EIP-712 typehash.
  orderDataType: string;
  /// @dev Arbitrary implementation-specific data
  /// Can be used to define tokens, amounts, destination chains, fees, settlement parameters,
  /// or any other order-type specific information
  orderData: string;
}

export type FillerTokenData = {
  filler: string;
  user: string;
  token: string;
  amount: string;
  nonce: string;
  fillChainId: string;
  redeemChainId: string;
};

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export type QueuedTransactionForIntent = {
  nonce: string;
  transactions: ExecutionTransaction[];
  chainId: number;
  userSCWalletAddress: string;
  intentNonce: string;
  approvals: IntermediaryApprovals[];
  fillerTokenDatas: FillerTokenData[];
  executionType: QueueExecutionType;
  status: TransactionStatus;
  dependenciesTransactions: string[];
  transactionHash: string | null;
};

export enum QueueExecutionType {
  ADD_AND_EXECUTE = "addAndExecute",
  ADD_INTENT = "addIntent",
  SIMPLE_EXECUTION = "simpleExecution",
}
