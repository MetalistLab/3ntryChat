const hre = require("hardhat");


async function main() {
    const max_amount = hre.ethers.BigNumber.from(process.env.MAX_AMOUNT);
    const Chat = await hre.ethers.getContractFactory("chat");
    const chat = await hre.upgrades.deployProxy(Chat, [max_amount], { initializer: 'initialize' });
    const chatInstance = await chat.deployed();
    
    console.log("complete, contract deployed, address: ", chatInstance.address);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err.message || err);
        process.exit(1);
    });
