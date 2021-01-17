require('babel-register');
require('babel-polyfill')
require('dotenv').config();

module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 7545,            // Standard Ethereum Ganache Port
     network_id: "*",       // Any network (default: none)
    },
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis',

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.0",    // Fetch exact version from solc-bin (default: truffle's version)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: false,
         runs: 200
       },
      }
    }
  },
};
