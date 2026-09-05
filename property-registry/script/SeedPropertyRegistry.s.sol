// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";

/**
 * @title SeedPropertyRegistry
 * @notice Script to seed initial sample properties into the PropertyRegistry contract.
 * @dev Usage:
 *      forge script script/SeedPropertyRegistry.s.sol:SeedPropertyRegistry \
 *          --rpc-url amoy \
 *          --broadcast -vvvv
 */
contract SeedPropertyRegistry is Script {
    function run() external {
        address contractAddress = vm.envOr(
            "PROPERTY_REGISTRY_ADDRESS",
            address(0x5FbDB2315678afecb367f032d93F642f64180aa3)
        );

        console2.log("==================================================");
        console2.log("Seeding PropertyRegistry at:", contractAddress);
        console2.log("Caller:", msg.sender);
        console2.log("==================================================");

        vm.startBroadcast();

        PropertyRegistry registry;

        // If target address has no code (e.g. fresh simulation), deploy a new instance
        if (contractAddress.code.length == 0) {
            console2.log("No deployed code at address. Deploying fresh instance...");
            registry = new PropertyRegistry();
            console2.log("Deployed fresh PropertyRegistry at:", address(registry));
        } else {
            registry = PropertyRegistry(contractAddress);
        }

        // Seed Property #1: The Glass Pavilion
        uint256 id1 = registry.registerProperty(
            "Montecito, Santa Barbara, California",
            12_500_000 ether
        );
        console2.log("Registered Property #1 ID:", id1);

        // Seed Property #2: Skyline Penthouse
        uint256 id2 = registry.registerProperty(
            "Tribeca, New York, NY",
            8_950_000 ether
        );
        console2.log("Registered Property #2 ID:", id2);

        vm.stopBroadcast();

        console2.log("==================================================");
        console2.log("Seeding completed successfully!");
        console2.log("Total on-chain properties:", registry.totalProperties());
        console2.log("==================================================");
    }
}
