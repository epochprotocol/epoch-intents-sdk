import { Transaction } from "../types";
import {
  DEFAULT_CHAIN_ID,
  EPOCH_MODULE_SAFE_ADDRESS,
  EPOCH_MODULE_SETUP,
  RPC_ENDPOINTS,
  SAFE_7579_MODULE_ADDRESS,
  SAFE_7579_REGISTRY_ADDRESS,
  SAFE_PROXY_FACTORY_ADDRESS,
  SAFE_SINGLETON_ADDRESS,
  ZERO_ADDRESS,
} from "@/constants";
import safeProxyFactoryAbi from "@/web3/abis/safeProxyFactory.json";
import { ethers } from "ethers";

export const getSafeProxyFactoryInstance = (chainId: number) => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS[chainId]);
  return new ethers.Contract(
    SAFE_PROXY_FACTORY_ADDRESS[chainId],
    safeProxyFactoryAbi,
    provider
  );
};

export const getCreateWalletData = async (
  userAddress: string
): Promise<Transaction> => {
  const abiCoder = new ethers.utils.AbiCoder();

  const safeOwners = [userAddress];
  const salt = Math.floor(Math.random() * 100000000);

  const erc7579Data = abiCoder.encode(
    [
      "tuple[]",
      "tuple[]",
      "tuple[]",
      "tuple[]",
      "tuple(address registry, address[] attesters, uint256 threshold)",
    ],
    [
      [],
      [],
      [],
      [],
      {
        registry: SAFE_7579_REGISTRY_ADDRESS[DEFAULT_CHAIN_ID],
        attesters: [],
        threshold: 0,
      },
    ]
  );
  const safeModuleSetupABI = [
    "function enableModules(address moduleSetup, address module, bytes calldata initData, address moduleAddress)",
  ];
  const safeModuleSetupInterface = new ethers.utils.Interface(
    safeModuleSetupABI
  );
  const safeModuleSetupData = safeModuleSetupInterface.encodeFunctionData(
    "enableModules",
    [
      SAFE_7579_MODULE_ADDRESS[DEFAULT_CHAIN_ID],
      SAFE_7579_MODULE_ADDRESS[DEFAULT_CHAIN_ID],
      erc7579Data,
      EPOCH_MODULE_SAFE_ADDRESS[DEFAULT_CHAIN_ID],
    ]
  );

  const safeSetupABI = [
    "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)",
  ];
  const safeSetupInterface = new ethers.utils.Interface(safeSetupABI);
  const initializerData = safeSetupInterface.encodeFunctionData("setup", [
    safeOwners,
    1,
    EPOCH_MODULE_SETUP[DEFAULT_CHAIN_ID],
    safeModuleSetupData,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    0,
    ZERO_ADDRESS,
  ]);

  const proxyFactory = getSafeProxyFactoryInstance(DEFAULT_CHAIN_ID);
  const proxyData = await proxyFactory.populateTransaction.createProxyWithNonce(
    SAFE_SINGLETON_ADDRESS[DEFAULT_CHAIN_ID],
    initializerData,
    salt
  );

  if (!proxyData.data) {
    throw new Error("Failed to create proxy data");
  }

  return {
    target: proxyFactory.address,
    data: proxyData.data,
    value: "0",
  };
};
