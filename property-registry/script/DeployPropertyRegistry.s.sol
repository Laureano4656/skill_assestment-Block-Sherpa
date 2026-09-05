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
    function run() external returns (PropertyRegistry registry) {
        console2.log("==================================================");
        console2.log("Deploying PropertyRegistry");
        console2.log("Deployer Address:", msg.sender);
        console2.log("Chain ID:        ", block.chainid);
        console2.log("==================================================");

        vm.startBroadcast();

        registry = new PropertyRegistry();

        vm.stopBroadcast();

        console2.log("==================================================");
        console2.log("PropertyRegistry deployed successfully!");
        console2.log("Contract Address:", address(registry));
        console2.log("==================================================");

        return registry;
    }
}
