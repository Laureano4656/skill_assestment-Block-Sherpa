 #### On Local Anvil:

    # Deploy to local Anvil
    forge script script/DeployPropertyRegistry.s.sol:DeployPropertyRegistry --rpc-url anvil --broadcast

    # Seed properties to local Anvil (owned by Anvil Account 0)
    forge script script/SeedPropertyRegistry.s.sol:SeedPropertyRegistry --rpc-url anvil --broadcast

  #### On Polygon Amoy:

  Use your secure keystore account:

    # Deploy to Polygon Amoy
    forge script script/DeployPropertyRegistry.s.sol:DeployPropertyRegistry \
      --rpc-url amoy \
      --account <your-keystore-name> \
      --broadcast \
      --verify

    # Seed to Polygon Amoy
    PROPERTY_REGISTRY_ADDRESS=0xeA6CD44a53A2EbEB17c58bA27B29b09912402191 \
    forge script script/SeedPropertyRegistry.s.sol:SeedPropertyRegistry \
      --rpc-url amoy \
      --account <your-keystore-name> \
      --broadcast
  ──────