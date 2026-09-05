// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";

/**
 * @title DeployPropertyRegistry
 * @notice Deployment script for PropertyRegistry targeting Polygon Amoy testnet.
 * @dev Usage:
 *      forge script script/DeployPropertyRegistry.s.sol:DeployPropertyRegistry \
 *          --rpc-url amoy \
 *          --broadcast \
 *          --verify -vvvv
 */
contract DeployPropertyRegistry is Script {
    // Anvil default Account 0 private key (used only on local chain 31337)
    uint256 internal constant ANVIL_ACCOUNT_0_PK =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external returns (PropertyRegistry registry) {
        console2.log("==================================================");
        console2.log("Deploying PropertyRegistry");
        console2.log("Chain ID:        ", block.chainid);

        if (block.chainid == 31337) {
            address deployer = vm.addr(ANVIL_ACCOUNT_0_PK);
            console2.log("Environment:      Local Anvil (31337)");
            console2.log("Deployer Address: ", deployer);
            console2.log("==================================================");
            vm.startBroadcast(ANVIL_ACCOUNT_0_PK);
        } else {
            console2.log("Environment:      Remote / Testnet");
            console2.log("Deployer Address: ", msg.sender);
            console2.log("==================================================");
            vm.startBroadcast();
        }

        registry = new PropertyRegistry();

        vm.stopBroadcast();

        console2.log("==================================================");
        console2.log("PropertyRegistry deployed successfully!");
        console2.log("Contract Address:", address(registry));
        console2.log("==================================================");

        return registry;
    }
}
