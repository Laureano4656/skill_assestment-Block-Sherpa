// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPropertyRegistry
 * @notice Interface for the PropertyRegistry contract in the REChain real estate platform.
 * @dev Defines structs, events, custom errors, and core function signatures.
 */
interface IPropertyRegistry {
    // =========================================================================
    // Structs
    // =========================================================================

    /**
     * @notice Represents on-chain property data.
     * @param id Unique identifier of the property.
     * @param propertyAddress Physical/legal location address of the property.
     * @param owner Address of current property owner.
     * @param price Price of the property in wei (or base currency unit).
     * @param registeredTimestamp Block timestamp when registered.
     * @param exists Flag indicating if property exists in registry.
     */
    struct Property {
        uint256 id;
        string propertyAddress;
        address owner;
        uint256 price;
        uint256 registeredTimestamp;
        bool exists;
    }

    // =========================================================================
    // Events
    // =========================================================================

    /**
     * @notice Emitted when a new property is registered.
     * @param propertyId The unique ID assigned to the registered property.
     * @param owner The address that registered and owns the property.
     * @param propertyAddress Physical/legal location of the property.
     * @param price Listing price of the property.
     * @param timestamp Block timestamp of registration.
     */
    event PropertyRegistered(
        uint256 indexed propertyId,
        address indexed owner,
        string propertyAddress,
        uint256 price,
        uint256 timestamp
    );

    /**
     * @notice Emitted when ownership of a property is transferred.
     * @param propertyId The unique ID of the property.
     * @param previousOwner The address transferring ownership.
     * @param newOwner The recipient address receiving ownership.
     * @param timestamp Block timestamp of transfer.
     */
    event OwnershipTransferred(
        uint256 indexed propertyId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    /**
     * @notice Emitted when the listing price of a property is updated.
     * @param propertyId The unique ID of the property.
     * @param oldPrice The previous listing price.
     * @param newPrice The newly updated listing price.
     */
    event PropertyPriceUpdated(
        uint256 indexed propertyId,
        uint256 oldPrice,
        uint256 newPrice
    );

    // =========================================================================
    // Custom Errors
    // =========================================================================

    /// @notice Thrown when caller is not the owner of the property.
    error NotPropertyOwner(uint256 propertyId, address caller, address actualOwner);

    /// @notice Thrown when the requested property ID does not exist.
    error PropertyNotFound(uint256 propertyId);

    /// @notice Thrown when property address string is empty.
    error EmptyPropertyAddress();

    /// @notice Thrown when property price is zero.
    error InvalidPrice();

    /// @notice Thrown when new owner is the zero address.
    error InvalidNewOwner();

    /// @notice Thrown when transfer target is already the current owner.
    error SameOwner();

    // =========================================================================
    // Functions
    // =========================================================================

    /**
     * @notice Registers a new property with an address and price.
     * @param _address Physical location or legal address of the property.
     * @param _price Listing price of the property.
     * @return propertyId The unique ID generated for the property.
     */
    function registerProperty(string memory _address, uint256 _price) external returns (uint256 propertyId);

    /**
     * @notice Transfers ownership of a property to another address.
     * @dev Only the current owner can initiate this transfer.
     * @param _propertyId The unique ID of the property.
     * @param _newOwner The address of the new owner.
     */
    function transferOwnership(uint256 _propertyId, address _newOwner) external;

    /**
     * @notice Retrieves property details for a given property ID.
     * @param _propertyId The unique ID of the property.
     * @return property The complete Property struct details.
     */
    function getProperty(uint256 _propertyId) external view returns (Property memory property);

    /**
     * @notice Updates the listing price of a property.
     * @dev Only the current owner can update the price.
     * @param _propertyId The unique ID of the property.
     * @param _newPrice The new listing price.
     */
    function updatePrice(uint256 _propertyId, uint256 _newPrice) external;

    /**
     * @notice Returns the total count of registered properties.
     * @return count Total number of properties registered.
     */
    function totalProperties() external view returns (uint256 count);

    /**
     * @notice Checks if a property ID has been registered.
     * @param _propertyId The unique ID of the property.
     * @return isRegistered True if registered, false otherwise.
     */
    function isPropertyRegistered(uint256 _propertyId) external view returns (bool isRegistered);
}
