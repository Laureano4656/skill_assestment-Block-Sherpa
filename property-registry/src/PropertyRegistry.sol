// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IPropertyRegistry} from "./interfaces/IPropertyRegistry.sol";

/**
 * @title PropertyRegistry
 * @notice Production-ready decentralized Property Registry for the REChain platform.
 * @dev Inherits OpenZeppelin ReentrancyGuard for reentrancy attack protection,
 *      EIP712 for cryptographic signature verification,
 *      and implements the IPropertyRegistry interface with custom errors for gas optimization.
 */
contract PropertyRegistry is IPropertyRegistry, ReentrancyGuard, EIP712 {
    // =========================================================================
    // Constants & Storage
    // =========================================================================

    /// @notice EIP-712 TypeHash for accepting a property transfer permit.
    bytes32 public constant ACCEPT_TRANSFER_TYPEHASH = keccak256(
        "AcceptTransfer(uint256 propertyId,address currentOwner,address newOwner,uint256 nonce,uint256 deadline)"
    );

    /// @dev Monotonically increasing property ID tracker (1-indexed).
    uint256 private _propertyCounter;

    /// @dev Mapping from property ID to Property record.
    mapping(uint256 => Property) private _properties;

    /// @dev Mapping from account address to current EIP-712 permit nonce.
    mapping(address => uint256) private _nonces;

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor() EIP712("REChain Property Registry", "1") {}

    // =========================================================================
    // External Functions
    // =========================================================================

    /**
     * @notice Registers a new property with its address and price.
     * @dev Generates an incremental unique ID and assigns ownership to msg.sender.
     * @param _address Physical location or legal address of property.
     * @param _price Listing price of property in USD / USDT base units (18 decimals).
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
     * @notice Transfers ownership of a registered property to another address using an EIP-712 permit.
     * @dev Enforces mutual consent: caller must be current owner, and signature must match new owner.
     * @param _propertyId The unique identifier of the property.
     * @param _newOwner The recipient address receiving ownership.
     * @param _deadline The expiration timestamp for the permit signature.
     * @param _signature The 65-byte ECDSA signature signed by _newOwner.
     */
    function transferOwnershipWithPermit(
        uint256 _propertyId,
        address _newOwner,
        uint256 _deadline,
        bytes calldata _signature
    ) external override nonReentrant {
        if (block.timestamp > _deadline) {
            revert PermitExpired(_deadline, block.timestamp);
        }
        if (_newOwner == address(0)) {
            revert InvalidNewOwner();
        }
        if (_newOwner == msg.sender) {
            revert SameOwner();
        }

        Property storage prop = _properties[_propertyId];

        if (!prop.exists) {
            revert PropertyNotFound(_propertyId);
        }
        if (prop.owner != msg.sender) {
            revert NotPropertyOwner(_propertyId, msg.sender, prop.owner);
        }

        uint256 currentNonce = _nonces[_newOwner]++;
        bytes32 structHash = keccak256(
            abi.encode(
                ACCEPT_TRANSFER_TYPEHASH,
                _propertyId,
                msg.sender,
                _newOwner,
                currentNonce,
                _deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, _signature);
        if (signer != _newOwner) {
            revert InvalidSignature();
        }

        address previousOwner = prop.owner;
        prop.owner = _newOwner;

        emit OwnershipTransferred(
            _propertyId,
            previousOwner,
            _newOwner,
            block.timestamp
        );

        emit OwnershipTransferredWithPermit(
            _propertyId,
            previousOwner,
            _newOwner,
            currentNonce,
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

    /**
     * @notice Returns the current EIP-712 permit nonce for an account.
     * @param _owner The address to check nonces for.
     * @return nonce Current nonce value.
     */
    function nonces(
        address _owner
    ) external view override returns (uint256 nonce) {
        return _nonces[_owner];
    }

    /**
     * @notice Returns the EIP-712 domain separator used for permit signing.
     * @return domainSeparator The bytes32 domain separator.
     */
    function DOMAIN_SEPARATOR() external view override returns (bytes32 domainSeparator) {
        return _domainSeparatorV4();
    }
}
