// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";
import {IPropertyRegistry} from "../src/interfaces/IPropertyRegistry.sol";

contract PropertyRegistryTest is Test {
    PropertyRegistry public registry;

    address public owner1 = address(0x1111);
    address public owner2 = address(0x2222);
    address public nonOwner = address(0x3333);

    string constant SAMPLE_ADDR = "123 Ocean Drive, Miami, FL 33139";
    uint256 constant SAMPLE_PRICE = 1_500_000 ether;

    event PropertyRegistered(
        uint256 indexed propertyId,
        address indexed owner,
        string propertyAddress,
        uint256 price,
        uint256 timestamp
    );

    event OwnershipTransferred(
        uint256 indexed propertyId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    event PropertyPriceUpdated(
        uint256 indexed propertyId,
        uint256 oldPrice,
        uint256 newPrice
    );

    function setUp() public {
        registry = new PropertyRegistry();
        vm.deal(owner1, 100 ether);
        vm.deal(owner2, 100 ether);
        vm.deal(nonOwner, 100 ether);
    }

    // =========================================================================
    // 1. Registration Tests
    // =========================================================================

    function test_RegisterProperty_Success() public {
        vm.warp(1_700_000_000);
        vm.prank(owner1);

        vm.expectEmit(true, true, false, true);
        emit PropertyRegistered(1, owner1, SAMPLE_ADDR, SAMPLE_PRICE, 1_700_000_000);

        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        assertEq(propId, 1, "First property ID should be 1");
        assertEq(registry.totalProperties(), 1, "Total properties should be 1");
        assertTrue(registry.isPropertyRegistered(1), "Property should be marked registered");

        IPropertyRegistry.Property memory prop = registry.getProperty(propId);
        assertEq(prop.id, 1, "Property ID mismatch");
        assertEq(prop.propertyAddress, SAMPLE_ADDR, "Address mismatch");
        assertEq(prop.owner, owner1, "Owner mismatch");
        assertEq(prop.price, SAMPLE_PRICE, "Price mismatch");
        assertEq(prop.registeredTimestamp, 1_700_000_000, "Timestamp mismatch");
        assertTrue(prop.exists, "Exists flag should be true");
    }

    function test_RegisterProperty_MultipleProperties() public {
        vm.prank(owner1);
        uint256 id1 = registry.registerProperty("Property 1", 100 ether);

        vm.prank(owner2);
        uint256 id2 = registry.registerProperty("Property 2", 200 ether);

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.totalProperties(), 2);

        IPropertyRegistry.Property memory p1 = registry.getProperty(id1);
        IPropertyRegistry.Property memory p2 = registry.getProperty(id2);

        assertEq(p1.owner, owner1);
        assertEq(p2.owner, owner2);
    }

    function test_RegisterProperty_RevertIfEmptyAddress() public {
        vm.prank(owner1);
        vm.expectRevert(IPropertyRegistry.EmptyPropertyAddress.selector);
        registry.registerProperty("", SAMPLE_PRICE);
    }

    function test_RegisterProperty_RevertIfZeroPrice() public {
        vm.prank(owner1);
        vm.expectRevert(IPropertyRegistry.InvalidPrice.selector);
        registry.registerProperty(SAMPLE_ADDR, 0);
    }

    // =========================================================================
    // 2. Ownership Transfer Tests
    // =========================================================================

    function test_TransferOwnership_Success() public {
        vm.prank(owner1);
        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        vm.warp(1_700_050_000);
        vm.prank(owner1);

        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(propId, owner1, owner2, 1_700_050_000);

        registry.transferOwnership(propId, owner2);

        IPropertyRegistry.Property memory prop = registry.getProperty(propId);
        assertEq(prop.owner, owner2, "New owner should be owner2");

        // Transferred owner can transfer again
        vm.prank(owner2);
        registry.transferOwnership(propId, nonOwner);
        assertEq(registry.getProperty(propId).owner, nonOwner);
    }

    function test_TransferOwnership_RevertIfNotOwner() public {
        vm.prank(owner1);
        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                IPropertyRegistry.NotPropertyOwner.selector,
                propId,
                nonOwner,
                owner1
            )
        );
        registry.transferOwnership(propId, owner2);
    }

    function test_TransferOwnership_RevertIfPreviousOwnerAttemptsTransferAfterSelling() public {
        vm.prank(owner1);
        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        vm.prank(owner1);
        registry.transferOwnership(propId, owner2);

        // Previous owner should no longer be able to transfer
        vm.prank(owner1);
        vm.expectRevert(
            abi.encodeWithSelector(
                IPropertyRegistry.NotPropertyOwner.selector,
                propId,
                owner1,
                owner2
            )
        );
        registry.transferOwnership(propId, nonOwner);
    }

    function test_TransferOwnership_RevertIfZeroAddress() public {
        vm.prank(owner1);
        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        vm.prank(owner1);
        vm.expectRevert(IPropertyRegistry.InvalidNewOwner.selector);
        registry.transferOwnership(propId, address(0));
    }

    function test_TransferOwnership_RevertIfSameOwner() public {
        vm.prank(owner1);
        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        vm.prank(owner1);
        vm.expectRevert(IPropertyRegistry.SameOwner.selector);
        registry.transferOwnership(propId, owner1);
    }

    function test_TransferOwnership_RevertIfPropertyNotFound() public {
        vm.prank(owner1);
        vm.expectRevert(
            abi.encodeWithSelector(
                IPropertyRegistry.PropertyNotFound.selector,
                999
            )
        );
        registry.transferOwnership(999, owner2);
    }

    // =========================================================================
    // 3. View Function Tests
    // =========================================================================

    function test_GetProperty_RevertIfNotFound() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IPropertyRegistry.PropertyNotFound.selector,
                42
            )
        );
        registry.getProperty(42);
    }

    function test_IsPropertyRegistered_NonExistent() public view {
        assertFalse(registry.isPropertyRegistered(0));
        assertFalse(registry.isPropertyRegistered(999));
    }

    // =========================================================================
    // 4. Price Update Tests
    // =========================================================================

    function test_UpdatePrice_Success() public {
        vm.prank(owner1);
        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        uint256 newPrice = 1_800_000 ether;

        vm.prank(owner1);
        vm.expectEmit(true, false, false, true);
        emit PropertyPriceUpdated(propId, SAMPLE_PRICE, newPrice);

        registry.updatePrice(propId, newPrice);

        IPropertyRegistry.Property memory prop = registry.getProperty(propId);
        assertEq(prop.price, newPrice);
    }

    function test_UpdatePrice_RevertIfNotOwner() public {
        vm.prank(owner1);
        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                IPropertyRegistry.NotPropertyOwner.selector,
                propId,
                nonOwner,
                owner1
            )
        );
        registry.updatePrice(propId, 2_000_000 ether);
    }

    function test_UpdatePrice_RevertIfZero() public {
        vm.prank(owner1);
        uint256 propId = registry.registerProperty(SAMPLE_ADDR, SAMPLE_PRICE);

        vm.prank(owner1);
        vm.expectRevert(IPropertyRegistry.InvalidPrice.selector);
        registry.updatePrice(propId, 0);
    }

    // =========================================================================
    // 5. Fuzz Tests
    // =========================================================================

    function testFuzz_RegisterProperty(string memory addr, uint256 price) public {
        vm.assume(bytes(addr).length > 0 && bytes(addr).length < 500);
        vm.assume(price > 0 && price < type(uint128).max);

        address caller = makeAddr("fuzzCaller");
        vm.prank(caller);
        uint256 id = registry.registerProperty(addr, price);

        IPropertyRegistry.Property memory prop = registry.getProperty(id);
        assertEq(prop.id, id);
        assertEq(prop.owner, caller);
        assertEq(prop.propertyAddress, addr);
        assertEq(prop.price, price);
    }

    function testFuzz_TransferOwnership(address caller, address newOwner) public {
        vm.assume(caller != address(0));
        vm.assume(newOwner != address(0));
        vm.assume(caller != newOwner);

        vm.prank(caller);
        uint256 id = registry.registerProperty("Fuzz Address", 100 ether);

        vm.prank(caller);
        registry.transferOwnership(id, newOwner);

        assertEq(registry.getProperty(id).owner, newOwner);
    }

    function testFuzz_TransferOwnership_RevertIfNotOwner(
        address owner,
        address nonOwnerCaller,
        address recipient
    ) public {
        vm.assume(owner != address(0));
        vm.assume(nonOwnerCaller != address(0));
        vm.assume(recipient != address(0));
        vm.assume(owner != nonOwnerCaller);
        vm.assume(owner != recipient);

        vm.prank(owner);
        uint256 id = registry.registerProperty("Fuzz Street", 500 ether);

        vm.prank(nonOwnerCaller);
        vm.expectRevert(
            abi.encodeWithSelector(
                IPropertyRegistry.NotPropertyOwner.selector,
                id,
                nonOwnerCaller,
                owner
            )
        );
        registry.transferOwnership(id, recipient);
    }
}
