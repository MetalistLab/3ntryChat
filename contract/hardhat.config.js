
/**
 * @type import('hardhat/config').HardhatUserConfig
 */


//hardhat dependencies component
require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-web3");
require("solidity-coverage");
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

// set-env.
const dotenv = require('dotenv');
dotenv.config();

const SignerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
const NetworkUrl = process.env.NETWORK_URL;

module.exports = {
    solidity: "0.8.5",
    settings: {
        optimizer: {
            enabled: true,
            runs: 2000
        }
    },
    networks: {
        localhost: {
            url: `${NetworkUrl}`,
            accounts: [`0x${SignerPrivateKey}`]
        },
        NETWORK_NAME: {
            url: `${NetworkUrl}`,
            accounts: [`0x${SignerPrivateKey}`]
        }
    },
    mocha: {
        timeout: 6000000
    },
};
