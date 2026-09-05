# PropertyRegistry Smart Contract

Production-grade decentralized property registry smart contract built with **Solidity (0.8.20)**, **Foundry**, and **OpenZeppelin**, targeting **Polygon Amoy testnet** (Chain ID: `80002`).

---

## 🏛 Contract Architecture

- **Contract**: [`src/PropertyRegistry.sol`](src/PropertyRegistry.sol)
- **Interface**: [`src/interfaces/IPropertyRegistry.sol`](src/interfaces/IPropertyRegistry.sol)
- **Security**: OpenZeppelin `ReentrancyGuard` (`@openzeppelin/contracts/utils/ReentrancyGuard.sol`)
- **Gas Optimizations**: Custom errors instead of string requires, unchecked incrementing for monotonic IDs, tight struct representation.

### Core Functions

- `registerProperty(string memory _address, uint256 _price) external returns (uint256)`:
  Registers a property on-chain with its physical/legal location and listing price in USD/USDT (18 decimals). Assigns ownership to `msg.sender`.
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

## 💵 Valuation Architecture: USD / USDT Base Units

Real estate properties are physical Real World Assets (RWAs) valued in fiat currency (USD).
- The contract stores `uint256 price` denominated in **USD / USDT base units (18 decimals)**:
  `1 unit = 1e18` (e.g., `$12,500,000` is represented on-chain as `12_500_000 ether`).
- **Why this design**:
  - **Eliminates Volatility Risk**: Real estate valuations do not fluctuate erratically with native crypto gas tokens (POL/ETH).
  - **1:1 Off-Chain Alignment**: Directly synchronizes with real-world listing prices.
  - **Stablecoin Compatible**: Ready for 1:1 settlement with USD-pegged stablecoins (USDT/USDC).

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

## 🚀 Deployment & Seeding (Polygon Amoy Testnet)

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
AMOY_RPC_URL=https://polygon-amoy-bor-rpc.publicnode.com
PROPERTY_REGISTRY_ADDRESS=0x...
PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

### 2. Deploy Contract
```bash
forge script script/DeployPropertyRegistry.s.sol:DeployPropertyRegistry \
  --rpc-url amoy \
  --broadcast \
  --verify \
  -vvvv
```
After deployment, update `PROPERTY_REGISTRY_ADDRESS` in `.env` with the deployed address.

### 3. Seed Sample Properties
Populates initial sample properties:
- **Property #1**: "Montecito, Santa Barbara, California" ($12,500,000 USD/USDT)
- **Property #2**: "Tribeca, New York, NY" ($8,950,000 USD/USDT)

Using Foundry Keystore:
```bash
forge script script/SeedPropertyRegistry.s.sol:SeedPropertyRegistry \
  --rpc-url amoy \
  --broadcast \
  --account <KEYSTORE_NAME> \
  --sender <YOUR_WALLET_ADDRESS> \
  -vvvv
```

Or using private key:
```bash
forge script script/SeedPropertyRegistry.s.sol:SeedPropertyRegistry \
  --rpc-url amoy \
  --broadcast \
  --private-key $PRIVATE_KEY \
  -vvvv
```

---

## 🔍 On-Chain Verification with Cast

Query contract state directly from the terminal:

```bash
# 1. Check total registered properties
cast call $PROPERTY_REGISTRY_ADDRESS "totalProperties()(uint256)" --rpc-url amoy

# 2. Inspect a property by ID (e.g. Property #1)
cast call $PROPERTY_REGISTRY_ADDRESS \
  "getProperty(uint256)((uint256,string,address,uint256,uint256,bool))" 1 \
  --rpc-url amoy
```
