# Epoch Intent SDK

A TypeScript SDK for interacting with the Epoch Intent protocol, providing utilities for blockchain interactions and API calls.

## Features

- Blockchain interaction using ethers.js
- Epoch Node integration
- Type-safe interfaces
- Intent creation and submission
- Intent hash generation and validation
- Automatic nonce retrieval
- EIP-191 compliant signing

## Installation

```bash
npm install @epoch-protocol/epoch-intents-sdk
```

## Usage

```typescript
import { EpochIntents } from "@epoch-protocol/epoch-intents-sdk";
import { ethers } from "ethers";

// Initialize the SDK
const sdk = EpochIntents({
  apiUrl: "SIO_URL",
});

// Create a task
const task = {
  action: "lending:deposit",
  tokens: [["ETH"]],
  chainIds: [[10]],
};
// Create an intent
const intent = sdk.createIntent(
  "0x47C3E8E3607E01FF09FD98571c9cc2150aF4d6b9", // sender SCW address
  task,
  [
    {
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      spenderAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      amount: "100",
      chainId: 8453,
    },
  ]
);
// Get a nonce for the intent
const nonce = await sdk.getNonce(intent);
const intentWithNonce = { ...intent, nonce };

// Sign the intent
// Any ethers.js signer will work
const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
const signature = await sdk.signIntent(intentWithNonce, signer);
const signedIntent = { ...intentWithNonce, signature };
// Submit the signed intent
const result = await sdk.submitIntent(signedIntent);

console.log(result.transactionHash);
```

## API Reference

### 1. Creating Intents

```typescript
const intent = sdk.createIntent(
  sender: string,
  task: Task,
  approvals: Approval[],
  nonce?: string
);
```

### 2. Getting Nonce

```typescript
const nonce = await sdk.getNonce(intent);
```

### 3. Signing Intents

```typescript
const signature = await sdk.signIntent(intent, signer);
```

### 4. Submitting Intents

```typescript
const result = await sdk.submitIntent(signedIntent);
```

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run tests:
   ```bash
   npm test
   ```

## License

MIT
