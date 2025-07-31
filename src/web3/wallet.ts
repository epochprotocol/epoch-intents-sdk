import { ethers } from "ethers";
import {
  createPublicClient,
  createWalletClient,
  extractChain,
  http,
  PrivateKeyAccount,
  WalletClient,
  Client,
  Account,
  encodeFunctionData,
  publicActions,
  toHex,
} from "viem";
import { SignAuthorizationReturnType } from "viem/_types/accounts/utils/signAuthorization";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";

import {
  EIP7702_SAFE_PROXY_ADDRESS,
  EPOCH_MODULE_SAFE_ADDRESS,
  EPOCH_SAFE_INIT_SETUP,
  FCLP256Verifier,
  RPC_ENDPOINTS,
  SAFE_7579_MODULE_ADDRESS,
  SAFE_7579_REGISTRY_ADDRESS,
  SAFE_7702_SINGLETON_ADDRESS,
  SAFE_INIT_SETUP_FORWARDER,
  SAFE_PROXY_FACTORY_ADDRESS,
  SAFE_SINGLETON_ADDRESS,
  SAFE_WEBAUTHN_SHARED_SIGNER,
} from "../constants";
import {
  getAuthorizationList,
  getSignedTransaction,
  isAccountDelegatedToAddress,
} from "../utils/web3";
import {
  AuthorizationListEntryAny,
  CreateWalletData,
  CreateWalletOptions,
  WalletType,
} from "../types";
import { getProvider } from "../web3";

import safe7702ProxyFactoryAbi from "./abis/safe7702ProxyFactoryAbi";
import safeProxyFactoryAbi from "./abis/safeProxyFactoryAbi";
import {
  Implementation,
  toMetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";

export const getSafeProxyFactoryInstance = (
  chainId: number,
  is7702?: boolean
) => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS[chainId]);
  return new ethers.Contract(
    is7702
      ? EIP7702_SAFE_PROXY_ADDRESS[chainId]
      : SAFE_PROXY_FACTORY_ADDRESS[chainId],
    is7702 ? safe7702ProxyFactoryAbi : safeProxyFactoryAbi,
    provider
  );
};

export const calculateProxyAddress = async (
  walletType: WalletType,
  options?: {
    safeOptions?: {
      factory: ethers.Contract;
      singleton: string;
      inititalizer: string;
      nonce: number | string;
    };
    metamaskOptions?: {
      userAddress: string;
      userSigner: WalletClient;
    };
  }
) => {
  if (walletType === WalletType.metamask) {
    if (!options?.metamaskOptions) {
      throw new Error("Metamask options are required");
    }
    const delegatorSmartAccount = await getMetamaskDelegatorInstance(
      options?.metamaskOptions?.userAddress,
      options?.metamaskOptions?.userSigner as WalletClient
    );

    return delegatorSmartAccount.address;
  } else if (walletType === WalletType.safe) {
    if (!options?.safeOptions) {
      throw new Error("Safe options are required");
    }
    const salt = ethers.utils.solidityKeccak256(
      ["bytes32", "uint256"],
      [
        ethers.utils.solidityKeccak256(
          ["bytes"],
          [options.safeOptions.inititalizer]
        ),
        options.safeOptions.nonce,
      ]
    );
    const factoryAddress = options.safeOptions.factory.address;
    const proxyCreationCode =
      await options.safeOptions.factory.proxyCreationCode();

    const deploymentCode = ethers.utils.solidityPack(
      ["bytes", "uint256", "uint256"],
      [
        proxyCreationCode,
        ethers.utils.keccak256(options.safeOptions.inititalizer),
        options.safeOptions.singleton,
      ]
    );
    return ethers.utils.getCreate2Address(
      factoryAddress,
      salt,
      ethers.utils.keccak256(deploymentCode)
    );
  } else {
    throw new Error("Invalid wallet type");
  }
};

export const getMetamaskDelegatorInstance = async (
  userAddress: string,
  userSigner: WalletClient,
  is7702?: boolean,
  isPasskey?: boolean,
  passkey?: any
) => {
  const walletClientwithPublic = userSigner.extend(publicActions);
  const deployParams = [userAddress as `0x${string}`, [], [], []];

  if (is7702) {
    return await toMetaMaskSmartAccount({
      client: walletClientwithPublic,
      implementation: Implementation.Stateless7702,
      address: userAddress as `0x${string}`,
      signatory: { walletClient: walletClientwithPublic as any },
    });
  }

  if (isPasskey) {
    return await toMetaMaskSmartAccount({
      client: walletClientwithPublic,
      implementation: Implementation.Hybrid,
      deployParams: [
        userAddress as `0x${string}`,
        [passkey.credential.id],
        [passkey.publicKey.x],
        [passkey.publicKey.y],
      ],
      deploySalt: "0x",
      signatory: {
        webAuthnAccount: passkey.webAuthnAccount,
        keyId: toHex(passkey.credential.id),
      },
    });
  }

  return await toMetaMaskSmartAccount({
    client: walletClientwithPublic,
    implementation: Implementation.Hybrid,
    deployParams: deployParams as any,
    deploySalt: "0x",
    signatory: { walletClient: walletClientwithPublic as any },
  });
};

export const getCreateWalletData = async (
  userAddress: string,
  chainId: number,
  walletType: WalletType,
  options?: CreateWalletOptions
): Promise<CreateWalletData> => {
  console.log("walletType: ", walletType);
  if (walletType === WalletType.metamask) {
    console.log("WalletType.metamask: ", WalletType.metamask);

    if (!options?.userSigner) {
      throw new Error("only viem Client supported for Metamask");
    }
    const delegatorSmartAccount = await getMetamaskDelegatorInstance(
      userAddress,
      options?.userSigner as WalletClient,
      options.is7702
    );
    console.log("delegatorSmartAccount: ", delegatorSmartAccount);
    const deployParams = [userAddress as `0x${string}`, [], [], []];
    console.log("deployParams: ", deployParams);
    return {
      txnData: {
        target: delegatorSmartAccount.address,
        data: "0x",
        value: "0",
      },
      proxyAddress: delegatorSmartAccount.address,
      initializerData: encodeFunctionData({
        abi: delegatorSmartAccount.abi,
        functionName: "initialize",
        args: deployParams as any,
      }),
      isAlreadyDeployed: await delegatorSmartAccount.isDeployed(),
    };
  } else if (walletType === WalletType.safe) {
    const { is7702 } = { ...options };
    const abiCoder = new ethers.utils.AbiCoder();

    let safeOwners = [userAddress];
    const salt = 123665432;

    const safeInitSetupABI = [
      "function forwardSetup(address safeInitSetup, bool triggerFaucet, bytes extraData)",
    ];
    const safeInitSetupInterface = new ethers.utils.Interface(safeInitSetupABI);

    let extraData = "0x";

    if (options?.passkey) {
      safeOwners = [SAFE_WEBAUTHN_SHARED_SIGNER[chainId]];
      const signer = {
        x: options?.passkey?.publicKey.x,
        y: options?.passkey?.publicKey.y,
        verifiers: FCLP256Verifier[chainId],
      };
      const signerData = abiCoder.encode(
        ["tuple(bytes32 x, bytes32 y, uint176 verifiers)"],
        [
          {
            x: signer.x,
            y: signer.y,
            verifiers: signer.verifiers,
          },
        ]
      );
      extraData = signerData;
    }

    const safeInitSetupData = safeInitSetupInterface.encodeFunctionData(
      "forwardSetup",
      [EPOCH_SAFE_INIT_SETUP[chainId], true, extraData]
    );

    const safeSetupABI = [
      "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)",
    ];
    const safeSetupInterface = new ethers.utils.Interface(safeSetupABI);
    const initializerData = safeSetupInterface.encodeFunctionData("setup", [
      safeOwners,
      1,
      SAFE_INIT_SETUP_FORWARDER[chainId],
      safeInitSetupData,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      0,
      ethers.constants.AddressZero,
    ]);

    const safeEIP7702ProxyFactory = getSafeProxyFactoryInstance(chainId, true);
    const proxyFactory = getSafeProxyFactoryInstance(chainId);

    const proxyAddress = await calculateProxyAddress(walletType, {
      safeOptions: {
        factory: is7702 ? safeEIP7702ProxyFactory : proxyFactory,
        singleton: is7702
          ? SAFE_7702_SINGLETON_ADDRESS[chainId]
          : SAFE_SINGLETON_ADDRESS[chainId],
        inititalizer: initializerData,
        nonce: 0,
      },
    });

    if (!proxyAddress) {
      throw new Error("Failed to calculate proxy address");
    }

    const provider = getProvider(chainId);
    const isContract = await provider.getCode(proxyAddress);
    if (isContract !== "0x") {
      return {
        txnData: {
          target: "",
          data: "",
          value: "0",
        },
        proxyAddress,
        initializerData,
        isAlreadyDeployed: true,
      };
    }

    if (is7702) {
      const proxyData =
        await safeEIP7702ProxyFactory.populateTransaction.createProxyWithNonce(
          SAFE_7702_SINGLETON_ADDRESS[chainId],
          initializerData,
          0
        );

      if (!proxyData.data) {
        throw new Error("Failed to create proxy data");
      }

      return {
        txnData: {
          target: safeEIP7702ProxyFactory.address,
          data: proxyData.data,
          value: "0",
        },
        proxyAddress,
        initializerData,
        isAlreadyDeployed: false,
      };
    } else {
      const proxyData =
        await proxyFactory.populateTransaction.createProxyWithNonce(
          SAFE_SINGLETON_ADDRESS[chainId],
          initializerData,
          salt
        );

      if (!proxyData.data) {
        throw new Error("Failed to create proxy data");
      }

      return {
        txnData: {
          target: proxyFactory.address,
          data: proxyData.data,
          value: "0",
        },
        proxyAddress,
        initializerData,
        isAlreadyDeployed: false,
      };
    }
  }
  throw new Error("Invalid wallet type");
};

export const set7702Delegator = async (
  chainId: number,
  userAddress: string,
  userSafeAddress: string,
  initializerData: string,
  userWalletClient: WalletClient,
  relayer: ethers.utils.SigningKey
) => {
  const publicClient = createPublicClient({
    transport: http(RPC_ENDPOINTS[chainId]),
  });

  const account = userWalletClient.account;
  if (!account) {
    throw new Error("Account not found");
  }
  const transactionCount = await publicClient.getTransactionCount({
    address: account.address,
  });
  const relayerAddress = ethers.utils.computeAddress(relayer.publicKey);

  let authorizationList;
  if (account.address === relayerAddress) {
    authorizationList = await userWalletClient.signAuthorization({
      account: account as PrivateKeyAccount,
      contractAddress: userSafeAddress as `0x${string}`,
      chainId: chainId,
      executor: "self",
    });
  } else {
    authorizationList = await userWalletClient.signAuthorization({
      account: account as PrivateKeyAccount,
      contractAddress: userSafeAddress as `0x${string}`,
      nonce: transactionCount,
      chainId: chainId,
    });
  }
  if (!authorizationList) {
    throw new Error("Failed to sign authorization for 7702 delegator");
  }

  await set7702DelegatorFromAuthorizationList(
    chainId,
    userAddress,
    authorizationList,
    initializerData,
    relayer
  );
};

export const set7702DelegatorFromAuthorizationList = async (
  chainId: number,
  userAddress: string,
  authorizationList: SignAuthorizationReturnType | AuthorizationListEntryAny[],
  initializerData: string,
  relayer: ethers.utils.SigningKey
) => {
  const chain = extractChain({
    chains: Object.values(chains),
    id: chainId as any,
  });
  const account = privateKeyToAccount(relayer.privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    transport: http(RPC_ENDPOINTS[chainId]),
    chain,
  });
  const relayerWalletClient = createWalletClient({
    account,
    transport: http(RPC_ENDPOINTS[chainId]),
    chain,
  });

  const hash = await relayerWalletClient.sendTransaction({
    account,
    chain: chain as chains.Chain,
    to: userAddress as `0x${string}`,
    data: initializerData as `0x${string}`,
    value: BigInt(0),
    authorizationList: [authorizationList as SignAuthorizationReturnType],
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: hash as `0x${string}`,
  });

  if (receipt.status !== "success") {
    throw new Error("Failed to set 7702 delegator");
  }
};

export const set7702DelegatorManually = async (
  chainId: number,
  userAddress: string,
  userSafeAddress: string,
  userSigner: ethers.Signer | ethers.Wallet | ethers.VoidSigner,
  relayer: ethers.utils.SigningKey,
  initializerData: string
) => {
  const provider = getProvider(chainId);
  const authNonce = await provider.getTransactionCount(userAddress, "pending");

  const authAddress = userSafeAddress;

  const authorizationList = await getAuthorizationList(
    chainId,
    ethers.BigNumber.from(authNonce),
    authAddress,
    userSigner
  );

  await set7702DelegatorFromAuthorizationListManually(
    chainId,
    userAddress,
    userSafeAddress,
    authorizationList,
    initializerData,
    relayer
  );

  return true;
};

export const set7702DelegatorFromAuthorizationListManually = async (
  chainId: number,
  userAddress: string,
  userSafeAddress: string,
  authorizationList: SignAuthorizationReturnType | AuthorizationListEntryAny[],
  initializerData: string,
  relayer: ethers.utils.SigningKey
) => {
  try {
    const provider = getProvider(chainId);
    const encodedSignedTx = await getSignedTransaction(
      provider,
      relayer,
      authorizationList
    );
    const authAddress = userSafeAddress;

    const isAlreadyDelegated = await isAccountDelegatedToAddress(
      provider,
      userAddress,
      authAddress
    );
    if (
      isAlreadyDelegated &&
      (await provider.getStorageAt(userAddress, 4)) ==
        ethers.utils.hexZeroPad("0x01", 32)
    ) {
      throw new Error(
        "Account already delegated to Safe Proxy and storage is setup. Returning"
      );
    }

    const response = await provider.send("eth_sendRawTransaction", [
      encodedSignedTx,
    ]);
    await (await provider.getTransaction(response))?.wait();

    const relayerWallet = new ethers.Wallet(relayer.privateKey, provider);

    const setupTxResponse = await relayerWallet.sendTransaction({
      to: userAddress,
      data: initializerData,
    });
    await setupTxResponse.wait();
  } catch (error) {
    throw error;
  }
};

export const getProxyAddressFromReceipt = (
  txnReceipt: ethers.providers.TransactionReceipt
) => {
  const proxyCreationEvent = `event ProxyCreation(address indexed proxy, address singleton)`;
  const proxyCreationEventAbi = new ethers.utils.Interface([
    proxyCreationEvent,
  ]);

  let proxyAddress;
  for (const log of txnReceipt.logs) {
    try {
      const parsedLog = proxyCreationEventAbi.parseLog(log);
      if (parsedLog && parsedLog.name === "ProxyCreation") {
        proxyAddress = parsedLog.args.proxy;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  return proxyAddress;
};
