# PropertyRegistry Smart Contract

Production-grade decentralized property registry smart contract built with **Solidity**, **Foundry**, and **OpenZeppelin**, deployed to **Polygon Amoy testnet** and integrated into the REChain real estate platform.

---

## 🏛 Contract Architecture

- **Contract**: [`src/PropertyRegistry.sol`](src/PropertyRegistry.sol)
- **Interface**: [`src/interfaces/IPropertyRegistry.sol`](src/interfaces/IPropertyRegistry.sol)
- **Security**: OpenZeppelin `ReentrancyGuard` (`@openzeppelin/contracts/utils/ReentrancyGuard.sol`)
- **Gas Optimizations**: Custom errors instead of string requires, unchecked incrementing for monotonic IDs, tight struct representation.

### Core Functions

- `registerProperty(string memory _address, uint256 _price) external returns (uint256)`:
  Registers a property on-chain with its physical/legal location and listing price. Assigns ownership to `msg.sender`.
- `transferOwnership(uint256 _propertyId, address _newOwner) external`:
  Transfers property ownership. Protected by access control (only current owner can transfer) and input validation (`_newOwner != address(0)` and `_newOwner != currentOwner`).
- `getProperty(uint256 _propertyId) external view returns (Property memory)`:
  Returns full on-chain property metadata (`id`, `propertyAddress`, `owner`, `price`, `registeredTimestamp`, `exists`).
- `updatePrice(uint256 _propertyId, uint256 _newPrice) external`:
  Allows current property owner to update listing price.
- `totalProperties() external view returns (uint256)`:
  Returns total properties registered.
- `isPropertyRegistered(uint256 _propertyId) external view returns (bool)`:
  Checks whether a property ID is valid and registered.

---

## 🧪 Testing with Foundry

The test suite covers unit tests, edge cases, access control enforcement, and fuzzing:

```bash
# Run all tests
forge test -vvv

# Run gas snapshots
forge snapshot

# Run specific test
forge test --match-test test_TransferOwnership_Success -vvvv
```

### Test Coverage Summary (18 / 18 passing)
- ✅ `test_RegisterProperty_Success`
- ✅ `test_RegisterProperty_MultipleProperties`
- ✅ `test_RegisterProperty_RevertIfEmptyAddress`
- ✅ `test_RegisterProperty_RevertIfZeroPrice`
- ✅ `test_TransferOwnership_Success`
- ✅ `test_TransferOwnership_RevertIfNotOwner`
- ✅ `test_TransferOwnership_RevertIfPreviousOwnerAttemptsTransferAfterSelling`
- ✅ `test_TransferOwnership_RevertIfZeroAddress`
- ✅ `test_TransferOwnership_RevertIfSameOwner`
- ✅ `test_TransferOwnership_RevertIfPropertyNotFound`
- ✅ `test_GetProperty_RevertIfNotFound`
- ✅ `test_IsPropertyRegistered_NonExistent`
- ✅ `test_UpdatePrice_Success`
- ✅ `test_UpdatePrice_RevertIfNotOwner`
- ✅ `test_UpdatePrice_RevertIfZero`
- ✅ `testFuzz_RegisterProperty` (256 fuzz runs)
- ✅ `testFuzz_TransferOwnership` (256 fuzz runs)
- ✅ `testFuzz_TransferOwnership_RevertIfNotOwner` (256 fuzz runs)

---

## 🚀 Deployment to Polygon Amoy Testnet

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in:
- `AMOY_RPC_URL`: `https://rpc-amoy.polygon.technology`
- `PRIVATE_KEY`: Your wallet private key (funded with Amoy testnet POL from faucet)
- `POLYGONSCAN_API_KEY`: API key for automated verification

### 2. Simulate Deployment (Dry Run)
```bash
forge script script/DeployPropertyRegistry.s.sol:DeployPropertyRegistry --rpc-url amoy
```

### 3. Broadcast to Polygon Amoy
```bash
forge script script/DeployPropertyRegistry.s.sol:DeployPropertyRegistry \
  --rpc-url amoy \
  --broadcast \
  --verify \
  -vvvv
```

---

## 💻 Frontend Integration

The contract is integrated with the REChain React frontend:
- **Component**: `frontend/src/components/property-details/BlockchainRegistryCard.tsx`
- **Page**: `frontend/src/pages/PropertyDetailsPage.tsx`
- **Hook**: `frontend/src/hooks/usePropertyContract.ts` (powered by `ethers.js` v6)
- **Config**: `frontend/src/contracts/contractConfig.ts`

