// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPropertyRegistry} from "./interfaces/IPropertyRegistry.sol";

/**
 * @title PropertyRegistry
 * @notice Production-ready decentralized Property Registry for the REChain platform.
 * @dev Inherits OpenZeppelin ReentrancyGuard for reentrancy attack protection
 *      and implements the IPropertyRegistry interface with custom errors for gas optimization.
 */
contract PropertyRegistry is IPropertyRegistry, ReentrancyGuard {
    // =========================================================================
    // Storage
    // =========================================================================

    /// @dev Monotonically increasing property ID tracker (1-indexed).
    uint256 private _propertyCounter;

    /// @dev Mapping from property ID to Property record.
    mapping(uint256 => Property) private _properties;

    // =========================================================================
    // External Functions
    // =========================================================================

    /**
     * @notice Registers a new property with its address and price.
     * @dev Generates an incremental unique ID and assigns ownership to msg.sender.
     * @param _address Physical location or legal address of property.
     * @param _price Listing price of property (in wei or base currency).
     * @return propertyId The unique identifier of the newly registered property.
     */
    function registerProperty(
        string memory _address,
        uint256 _price
    ) external override nonReentrant returns (uint256 propertyId) {
        if (bytes(_address).length == 0) {
            revert EmptyPropertyAddress();
        }
        if (_price == 0) {
            revert InvalidPrice();
        }

        unchecked {
            _propertyCounter++;
        }
        propertyId = _propertyCounter;

        _properties[propertyId] = Property({
            id: propertyId,
            propertyAddress: _address,
            owner: msg.sender,
            price: _price,
            registeredTimestamp: block.timestamp,
            exists: true
        });

        emit PropertyRegistered(
            propertyId,
            msg.sender,
            _address,
            _price,
            block.timestamp
        );
    }

    /**
     * @notice Transfers ownership of a registered property to another address.
     * @dev Access control enforced: only current owner can execute this transfer.
     * @param _propertyId The unique identifier of the property.
     * @param _newOwner The recipient address receiving ownership.
     */
    function transferOwnership(
        uint256 _propertyId,
        address _newOwner
    ) external override nonReentrant {
        Property storage prop = _properties[_propertyId];

        if (!prop.exists) {
            revert PropertyNotFound(_propertyId);
        }
        if (prop.owner != msg.sender) {
            revert NotPropertyOwner(_propertyId, msg.sender, prop.owner);
        }
        if (_newOwner == address(0)) {
            revert InvalidNewOwner();
        }
        if (_newOwner == msg.sender) {
            revert SameOwner();
        }

        address previousOwner = prop.owner;
        prop.owner = _newOwner;

        emit OwnershipTransferred(
            _propertyId,
            previousOwner,
            _newOwner,
            block.timestamp
        );
    }

    /**
     * @notice Retrieves the full property details for a given property ID.
     * @param _propertyId The unique identifier of the property.
     * @return property The complete Property struct details.
     */
    function getProperty(
        uint256 _propertyId
    ) external view override returns (Property memory property) {
        Property memory prop = _properties[_propertyId];
        if (!prop.exists) {
            revert PropertyNotFound(_propertyId);
        }
        return prop;
    }

    /**
     * @notice Updates the listing price of a property.
     * @dev Restricted to the current owner of the property.
     * @param _propertyId The unique identifier of the property.
     * @param _newPrice The new listing price.
     */
    function updatePrice(
        uint256 _propertyId,
        uint256 _newPrice
    ) external override nonReentrant {
        Property storage prop = _properties[_propertyId];

        if (!prop.exists) {
            revert PropertyNotFound(_propertyId);
        }
        if (prop.owner != msg.sender) {
            revert NotPropertyOwner(_propertyId, msg.sender, prop.owner);
        }
        if (_newPrice == 0) {
            revert InvalidPrice();
        }

        uint256 oldPrice = prop.price;
        prop.price = _newPrice;

        emit PropertyPriceUpdated(_propertyId, oldPrice, _newPrice);
    }

    /**
     * @notice Returns the total count of registered properties.
     * @return count Total number of registered properties.
     */
    function totalProperties() external view override returns (uint256 count) {
        return _propertyCounter;
    }

    /**
     * @notice Checks if a property ID has been registered.
     * @param _propertyId The unique identifier of the property.
     * @return isRegistered True if registered, false otherwise.
     */
    function isPropertyRegistered(
        uint256 _propertyId
    ) external view override returns (bool isRegistered) {
        return _properties[_propertyId].exists;
    }
}
