# 🎬 Loom Video Presentation Script: PropertyRegistry DApp
**Candidate Evaluation Guide • Target Score: 95%+ • Duration: 10–12 Minutes**

---

## 📋 Quick Setup Before Recording

Before hitting "Record" on Loom:
1. **Tab 1**: Open [`http://localhost:5173/architecture.html`](http://localhost:5173/architecture.html) (Architecture Graphic).
2. **Tab 2**: Open [`http://localhost:5173/properties`](http://localhost:5173/properties) (REChain Properties Catalog).
3. **Tab 3**: Open [PolygonScan Amoy Explorer](https://amoy.polygonscan.com/) (your deployed contract or a recent transaction).
4. **VS Code**: Have [`PropertyRegistry.sol`](property-registry/src/PropertyRegistry.sol) and [`PropertyRegistry.t.sol`](property-registry/test/PropertyRegistry.t.sol) open.
5. **Terminal**: Have a split terminal ready in `property-registry` to run `forge test -vvv`.
6. **MetaMask**: Connected to **Polygon Amoy Testnet** (`Chain ID: 80002`).

---

## ⏱️ Minute-by-Minute Speaking Script

### 0:00 – 1:30 | Introduction & System Architecture
**📺 Screen to Show:** `architecture.html` ([`http://localhost:5173/architecture.html`](http://localhost:5173/architecture.html))

> "Hello Block Sherpa team! My name is [Your Name], and this is my walkthrough and technical demonstration for the Smart Contract Developer Technical Assessment.
> 
> Today, I'll be walking you through the complete decentralized Property Registry system I built for the REChain real estate platform.
> 
> As you can see on screen in this architecture diagram, the system is designed in three cohesive layers:
> 1. **Smart Contract Core**: Built with Solidity 0.8.20 and OpenZeppelin v5 standards, incorporating `ReentrancyGuard`, custom errors for gas optimization, strict access controls, and a robust USD/USDT valuation architecture.
> 2. **Foundry Testing & Deployment Pipeline**: A comprehensive test suite with 18 passing tests covering unit logic, edge cases, access control reverts, and 256-run fuzz tests, deployed and seeded on Polygon Amoy testnet using Foundry scripts.
> 3. **Frontend Integration**: An ethers.js v6 integration directly into the REChain React/TypeScript application, featuring automatic network detection, on-chain verification badges, real-time transaction feedback with PolygonScan links, and multi-RPC failover resilience.
> 
> Let's dive straight into the Solidity code."

---

### 1:30 – 5:00 | Solidity Code Quality & Architecture
**📺 Screen to Show:** VS Code — [`src/interfaces/IPropertyRegistry.sol`](property-registry/src/interfaces/IPropertyRegistry.sol) followed by [`src/PropertyRegistry.sol`](property-registry/src/PropertyRegistry.sol)

> "Let's look at the contract architecture. Following Web3 best practices, I started by separating concerns with a dedicated interface: `IPropertyRegistry.sol`.
> 
> Here, you can see our core `Property` struct:
> - It tracks the sequential property ID, the physical or legal location address, the owner address, the listing price denominated in USD / USDT base units (18 decimals), registration timestamp, and an existence flag.
> 
> **An essential architectural decision here**: Real estate properties are Real World Assets (RWAs) appraised in fiat currency (USD). Storing prices in USD / USDT base units (where `12_500_000 ether` represents $12.5M USD/USDT) eliminates the volatility risk of native gas tokens like POL or ETH. This ensures the on-chain registry always stays 100% synchronized with real-world valuations, perfectly matches our off-chain MongoDB database, and is immediately compatible with stablecoin settlements.
> 
> Notice how we define our custom errors: `NotPropertyOwner`, `PropertyNotFound`, `EmptyPropertyAddress`, `InvalidPrice`, and `InvalidNewOwner`. Using custom errors rather than string reverts saves significant deployment and execution gas while providing rich debug parameters.
> 
> Now jumping into `PropertyRegistry.sol`:
> - Notice our inheritance: we inherit both `IPropertyRegistry` and OpenZeppelin's `ReentrancyGuard`.
> - For storage, we use a monotonic `_propertyCounter` and a mapping from property ID to the `Property` struct.
> 
> Let's look at the functions:
> 1. **`registerProperty`**: Marked `nonReentrant`. It validates that the address string isn't empty and price is greater than zero. It uses an `unchecked` block for incrementing the counter because integer overflow on a sequential ID is impossible in practical EVM lifecycles. It records the asset, sets `msg.sender` as the initial owner, and emits the indexed `PropertyRegistered` event.
> 2. **`transferOwnership`**: Also protected by `nonReentrant`. Crucially, it enforces strict access control: it checks that the property exists, verifies that `msg.sender == prop.owner`, ensures the new owner is not the zero address, and prevents accidental transfers to the same owner. It then reassigns the owner and emits `OwnershipTransferred`.
> 3. **`getProperty`**: A clean, external view function that validates existence and returns the complete struct.
> 4. As an added feature for a real estate marketplace, I also included `updatePrice` which allows the registered owner to update their asking price on-chain with its own event."

*(Reviewer focus: Solidity Code Quality 30%, Contract Functionality 25%)*

---

### 5:00 – 7:30 | Foundry Test Suite & Security Verification
**📺 Screen to Show:** VS Code — [`test/PropertyRegistry.t.sol`](property-registry/test/PropertyRegistry.t.sol) + Terminal

> "Testing is critical for immutable smart contracts. I built a comprehensive test suite in Foundry covering 18 test cases across registration, transfers, access controls, and fuzz testing.
> 
> Notice how we test:
> - Happy path registration and exact event emission matching using Foundry's `vm.expectEmit`.
> - Edge cases: empty address strings and zero prices reverting with our custom selectors.
> - Access control: `test_TransferOwnership_RevertIfNotOwner` proves that an unauthorized caller cannot transfer ownership.
> - Post-sale security: `test_TransferOwnership_RevertIfPreviousOwnerAttemptsTransferAfterSelling` verifies that once a property is transferred, the previous owner is completely stripped of transfer permissions.
> - And three fuzz testing suites: `testFuzz_RegisterProperty`, `testFuzz_TransferOwnership`, and `testFuzz_TransferOwnership_RevertIfNotOwner`, each tested across 256 random runs.
> 
> Let's run the tests live right now."

**⌨️ Action in Terminal:**
```bash
forge test -vvv
```

> "As you can see, all 18 tests pass in just 50 milliseconds, with all 3 fuzz suites completing 256 runs with zero failures."

*(Reviewer focus: Testing 20%)*

---

### 7:30 – 9:00 | Polygon Amoy Deployment & Seeding
**📺 Screen to Show:** VS Code — [`script/DeployPropertyRegistry.s.sol`](property-registry/script/DeployPropertyRegistry.s.sol), [`script/SeedPropertyRegistry.s.sol`](property-registry/script/SeedPropertyRegistry.s.sol), and [PolygonScan Amoy Explorer](https://amoy.polygonscan.com/)

> "Next, deployment and database synchronization. I created deployment and seeding scripts targeting the Polygon Amoy testnet (Chain ID 80002).
> 
> Notice the script design:
> - It uses `vm.startBroadcast()`. This gives maximum flexibility because it seamlessly supports both raw private keys and encrypted Foundry keystore accounts (`--account <name> --sender <address>`), ensuring private keys are never hardcoded or exposed in shell history.
> - I built a companion script, `SeedPropertyRegistry.s.sol`, which pre-populates initial sample properties into the contract: Property #1 (The Glass Pavilion at $12.5M USD/USDT) and Property #2 (Skyline Penthouse at $8.95M USD/USDT).
> - For network stability, we routed transactions through the high-availability Polygon Amoy Bor public node (`https://polygon-amoy-bor-rpc.publicnode.com`), avoiding rate-limits and HTTP 500 issues common with overloaded public endpoints.
> 
> Let's view our deployed contract on PolygonScan Amoy."

**📺 Action:** Switch to browser tab showing PolygonScan Amoy.
> "Here is our contract deployed on Polygon Amoy. You can see the verified contract bytecode, the deployment transaction, and our recorded seeding transactions."

---

### 9:00 – 11:30 | Live Frontend Integration Walkthrough
**📺 Screen to Show:** Browser — [`http://localhost:5173/properties`](http://localhost:5173/properties)

> "Now let's see the full-stack frontend integration in action.
> 
> The platform is populated with real luxury properties synced to our MongoDB backend, with a dual-state design specifically tailored for demonstration:
> - Some properties are pre-registered on-chain to showcase the verified status and owner actions.
> - Other properties are unregistered to demonstrate the live MetaMask transaction signing.
> 
> Let's inspect **Property #1: The Glass Pavilion**."

**🖱️ Action:** Click on *The Glass Pavilion*. Scroll to the right sidebar showing `BlockchainRegistryCard`.

> "Here in the sidebar is our **Blockchain Registry** card:
> - It shows our Polygon Amoy badge (80002).
> - It automatically detected that this asset is already registered on-chain, displaying the green **'Verified On-Chain'** badge with On-Chain ID `#1`.
> - It displays the verified on-chain asking price of **$12,500,000 USD (USDT)**, perfectly matching the catalog price.
> - It shows the current owner address.
> - And because my connected wallet matches the on-chain owner, notice that an owner-exclusive **'Transfer Ownership'** form is rendered right here.
> 
> Now let's test a live registration from scratch on an unregistered property."

**🖱️ Action:** Navigate back to `/properties` and click on **Desert Oasis Sanctuary** ([`http://localhost:5173/property/6a9b4d2f4f012dcae3dbb425`](http://localhost:5173/property/6a9b4d2f4f012dcae3dbb425)).

> "Notice the status for *Desert Oasis*: it displays **'Not Registered'**.
> - It displays the location: *Joshua Tree, Palm Springs, California*.
> - It displays the listing price: $3,200,000.
> - And here is our on-chain listing price field, automatically pre-filled in USD / USDT with $3,200,000.
> 
> Let's click **'Register on Blockchain'**."

**🖱️ Action:** Click the button. MetaMask pops up.
> "MetaMask pops up with the transaction on Polygon Amoy. Notice the estimated gas. Let's click **Confirm**."

**🖱️ Action:** Confirm the transaction in MetaMask.
> "Notice the loading state with the spinner while the transaction is being mined.
> 
> ... And there it is! A success toast notification appears, and right below the card we see:
> **Transaction Completed** with the transaction hash.
> 
> Let's click **'View on Amoy Explorer'**."

**🖱️ Action:** Click the explorer link. Show the transaction confirmed on PolygonScan.
> "The link opens Amoy PolygonScan directly, showing our transaction, the gas used, and the emitted `PropertyRegistered` event with our property ID."

*(Reviewer focus: Frontend Integration 15%)*

---

### 11:30 – 12:30 | Technical Challenges & Key Decisions
**📺 Screen to Show:** VS Code — [`frontend/src/hooks/usePropertyContract.ts`](frontend/src/hooks/usePropertyContract.ts)

> "To wrap up, I want to briefly highlight three non-trivial technical challenges I solved during development:
> 
> 1. **Real-World Asset (RWA) Pricing Architecture**: Instead of storing property prices in volatile native gas tokens (POL/ETH) which fluctuate constantly with the crypto market, we denominated on-chain prices in USD / USDT base units (18 decimals). This ensures the on-chain registry remains 100% price-stable, synchronizes 1:1 with off-chain real estate listings, and is stablecoin-settlement ready.
> 2. **RPC Resilience & Failover Strategy**: During testnet deployment and testing, public RPCs like `rpc-amoy.polygon.technology` and `drpc.org` encountered intermittent DNS failures and HTTP 500 internal errors. In `ethers.js` v6, creating a `JsonRpcProvider` without static network options causes an endless retry loop. I resolved this by enabling `{ staticNetwork: true }` and implementing a multi-RPC fallback gateway cycling between `publicnode.com`, `drpc.org`, and `thirdweb`.
> 3. **EIP-3855 EVM Versioning**: Since Solidity 0.8.20 introduced the `PUSH0` opcode, deploying to certain L2s and sidechains requires explicit EVM versioning. In `foundry.toml`, I set `evm_version = "paris"` to ensure 100% bytecode compatibility across all Polygon Amoy nodes.
> 4. **AI-Assisted Development**: Embracing Block Sherpa's development culture, I leveraged AI-assisted tooling to plan meticulously, generate edge-case fuzzing matrices, and ship production-quality code rapidly without cutting corners on security."

---

### 12:30 – 13:00 | Conclusion & Sign-Off
**📺 Screen to Show:** Camera / `architecture.html`

> "To summarize: we have a secure, gas-optimized `PropertyRegistry` smart contract protected by OpenZeppelin, an 18-test Foundry test suite, live deployment and seeding on Polygon Amoy, a stable USD/USDT RWA valuation architecture, and a seamless React frontend integration.
> 
> Thank you very much for your time and for this exciting challenge. I look forward to your feedback and to discussing how I can contribute to the Web3 vision at Block Sherpa!"

---

## 💡 Quick Tips for High Marks

| Assessment Criteria | How to Emphasize in the Video |
| :--- | :--- |
| **Solidity Code Quality (30%)** | Explicitly mention: OpenZeppelin `ReentrancyGuard`, custom errors instead of strings, `unchecked` monotonic increment, NatSpec comments, and USD/USDT RWA base unit valuation. |
| **Contract Functionality (25%)** | Point out: `registerProperty`, `transferOwnership`, `getProperty`, and the bonus `updatePrice`. |
| **Foundry Testing (20%)** | Highlight: 18/18 passing, `vm.expectEmit` event validation, unauthorized caller reverts, and fuzzing with 256 runs. |
| **Frontend Integration (15%)** | Show: Dual states (pre-registered and live registration), live MetaMask confirmation, transaction hash feedback, USD/USDT currency sync, and Amoy explorer link. |
| **Communication (10%)** | Speak clearly, follow the timeline, explain the *why* behind decisions (e.g. why USD/USDT base units and multi-RPC fallback were chosen). |
