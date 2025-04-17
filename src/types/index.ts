export type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
};

export type BlockchainData = {
  balance: bigint;
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
  target: string;
  value: string;
  data: string;
};

export type Intent = {
  sender: string;
  approvals: Approval[];
  task: string;
  nonce: string;
  constraint: Constraint;
  proposedFeeRewards: number;
  chainIds: number[];
  calldatas: Calldata[];
  recurring: boolean;
  signature?: string;
};

export type Task = {
  action: string;
  tokens: string[][];
  chainIds: number[][];
  protocol?: string;
};

export type NonceResponse = {
  nonce: string;
};

export type SolveIntentResponse = {
  success: boolean;
  transactionHash: string;
};

export type ErrorResponse = {
  error: string;
};

export type Transaction = {
  target: string;
  data: string;
  value: string;
};
