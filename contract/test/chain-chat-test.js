
const { assert } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

describe("chain-chat", function() {
    var chatInstance = null;
    var userOne = null;
    var userTwo = null;
    var userThree = null;
    var userFour = null;
    var userFive = null;
    var userSix = null;
    var userSeven = null;
    var userEight = null;
    var userNine = null;
    var owner = null;

    var asset1Instance = null;
    var asset2Instance = null;
    var asset3Instance = null;
    var mockContractInstance = null;


    before("instance ready", async function() {
        const accounts = await ethers.getSigners();
        owner = accounts[0];
        userOne = accounts[1];
        userTwo = accounts[2];
        userThree = accounts[3];
        userFour = accounts[4];
        userFive = accounts[5];
        userSix = accounts[6];
        userSeven = accounts[7];
        userEight = accounts[8];
        userNine = accounts[9];

        console.log("contracts deploying....");

        // deploy contract
        const max_amount = ethers.BigNumber.from(10);
        const Chat = await ethers.getContractFactory("chat");
        const chat = await upgrades.deployProxy(Chat, [max_amount], { initializer: 'initialize' });
        chatInstance = await chat.deployed();

        const Asset1 = await ethers.getContractFactory("token");
        const Asset1Supply = ethers.BigNumber.from(10000000);
        const Asset1Name = "asset1";
        const Asset1Symbol = "AS1";
        const asset1 = await upgrades.deployProxy(Asset1, [Asset1Supply, Asset1Name, Asset1Symbol], { initializer: 'initialize' });
        asset1Instance = await asset1.deployed();

        const Asset2 = await ethers.getContractFactory("token");
        const Asset2Supply = ethers.BigNumber.from(100000000);
        const Asset2Name = "asset2";
        const Asset2Symbol = "AS2";
        const asset2 = await upgrades.deployProxy(Asset2, [Asset2Supply, Asset2Name, Asset2Symbol], { initializer: 'initialize' });
        asset2Instance = await asset2.deployed();

        const Asset3 = await ethers.getContractFactory("token");
        const Asset3Supply = ethers.BigNumber.from(100000000);
        const Asset3Name = "asset3";
        const Asset3Symbol = "AS3";
        const asset3 = await upgrades.deployProxy(Asset3, [Asset3Supply, Asset3Name, Asset3Symbol], { initializer: 'initialize' });
        asset3Instance = await asset3.deployed();

        const Mock = await ethers.getContractFactory("Mock");
        const mock = await upgrades.deployProxy(Mock, [], { initializer: 'initialize' });
        mockContractInstance = await mock.deployed()

        console.log("contracts deployed");

    });

    it("initialize duplicate", async function() {
        const max_amount = ethers.BigNumber.from(10);
        await expectRevert(chatInstance.initialize(max_amount), "Initializable: contract is already initialized");
    });

    it("register", async function() {
        var pubkey = new Object();
        pubkey.x = ethers.BigNumber.from(100);
        pubkey.y = ethers.BigNumber.from(100);
        let tx = await chatInstance.register(pubkey);
        await tx.wait();
        let res = await chatInstance.userKey(owner.address);
        assert.equal(res.x.toNumber(), ethers.BigNumber.from(100).toNumber());

        // register duplicate
        pubkey.x = ethers.BigNumber.from(1000);
        tx = await chatInstance.register(pubkey);
        await tx.wait();
        res = await chatInstance.userKey(owner.address);
        assert.equal(res.x.toNumber(), ethers.BigNumber.from(1000).toNumber());

        pubkey.x = ethers.BigNumber.from(100);
        tx = await chatInstance.register(pubkey);
        await tx.wait();
        res = await chatInstance.userKey(owner.address);
        assert.equal(res.x.toNumber(), ethers.BigNumber.from(100).toNumber());

        // register with invalid pubkey
        pubkey.x = ethers.BigNumber.from(0);
        pubkey.y = ethers.BigNumber.from(0);
        await expectRevert(chatInstance.register(pubkey), "invalid pub_key");
    });

    // owner -> userOne 10 msg
    it("send message and receive message without filter", async function() {
        let c = 11;
        let tx = null;
        let pubKey = new Object();
        pubKey.x = ethers.BigNumber.from(100);
        pubKey.y = ethers.BigNumber.from(200);
        for (var i = 1; i < c; i++) {
            let msg = "hello-" + userOne.address + "-" + i;
            msg = ethers.utils.toUtf8Bytes(msg);
            tx = await chatInstance.sendMessage(userOne.address, pubKey, msg);
            await tx.wait();
        }
    });

    it("send empty message is not allowed", async function () {
        let pubKey = new Object();
        pubKey.x = ethers.BigNumber.from(100);
        pubKey.y = ethers.BigNumber.from(200);
        let msg = ethers.utils.toUtf8Bytes("");
        await expectRevert(chatInstance.sendMessage(owner.address, pubKey, msg), "empty message is not allowed");
    });

    it("send msg with not register", async function() {
        let pubKey = new Object();
        pubKey.x = ethers.BigNumber.from(0);
        pubKey.y = ethers.BigNumber.from(0);

        let msg = ethers.utils.toUtf8Bytes("mock msg");
        await expectRevert(chatInstance.connect(userTwo).sendMessage(owner.address, pubKey, msg), "invalid pubKey");
    });

    it("send message to self", async function () {
        let c = 11;
        let tx = null;
        let pubKey = new Object();
        pubKey.x = ethers.BigNumber.from(100);
        pubKey.y = ethers.BigNumber.from(200);
        for (var i = 1; i < c; i++) {
            let msg = "hello-" + userOne.address + "-" + i;
            msg = ethers.utils.toUtf8Bytes(msg);
            tx = await chatInstance.connect(userNine).sendMessage(userNine.address, pubKey, msg);
            await tx.wait();
        }
        let end = ethers.BigNumber.from(0);
        let count = ethers.BigNumber.from(20);
        let res = await chatInstance.pullMessageInReverseOrder(userNine.address, userNine.address, end, count);
        assert.equal(res.length, 10);

        let start = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(2);

        res = await chatInstance.getConversationList(userNine.address, start, count);
        assert.equal(res[0].length, 1);
        assert.equal(res[1].toNumber(), 0);
        assert.equal(res[2], false);
    });

    it("send message and receive message with filters", async function() {
        // add filters.
        const asset1FilterAmount = ethers.BigNumber.from(1000);
        const asset2FilterAmount = ethers.BigNumber.from(100);
        let mockFilter1 = new Object();
        mockFilter1.soulBoundToken = asset1Instance.address;
        mockFilter1.condition = asset1FilterAmount;

        let mockFilter2 = new Object();
        mockFilter2.soulBoundToken = asset2Instance.address;
        mockFilter2.condition = asset2FilterAmount;
        let tx = await chatInstance.addFilters([mockFilter1, mockFilter2]);
        await tx.wait();

        // get filters.
        let filters = await chatInstance.getFilters(owner.address);
        assert.equal(filters.length, 2);
        assert.equal(filters[0].soulBoundToken, asset1Instance.address);

        // transfer token.
        const asset1TransferAmount = ethers.BigNumber.from(2000);
        const asset2TransferAmount = ethers.BigNumber.from(200);
        const asset1TransferToUserTwoAmount = ethers.BigNumber.from(900);
        const asset2TransferToUserTwoAmount = ethers.BigNumber.from(90);
        await asset1Instance.transfer(userOne.address, asset1TransferAmount);
        await asset2Instance.transfer(userOne.address, asset2TransferAmount);
        await asset1Instance.transfer(userTwo.address, asset1TransferToUserTwoAmount);
        await asset2Instance.transfer(userTwo.address, asset2TransferToUserTwoAmount);

        // check whether can send msg.
        let res1 = await chatInstance.canSendMessageTo(userOne.address, owner.address);
        let res2 = await chatInstance.canSendMessageTo(userTwo.address, owner.address);
        let res3 = await chatInstance.canSendMessageTo(userThree.address, owner.address);
        assert.equal(res1, true);
        assert.equal(res2, false);
        assert.equal(res3, false);

        // mock pubkey.
        var pubkey = new Object();
        pubkey.x = ethers.BigNumber.from(200);
        pubkey.y = ethers.BigNumber.from(100);

        // mock msg.
        let c = 10;
        // send msg.
        for (var i = 0; i < c; i++) {
            let msg = ethers.utils.toUtf8Bytes("send from userOne-" + owner.address + "-" + i);
            tx = await chatInstance.connect(userOne).sendMessage(owner.address, pubkey, msg);
            await tx.wait();
        }
        // userTwo send msg without token.
        const userTwoMsg = ethers.utils.toUtf8Bytes("send from userTwo-" + owner.address + "-2");

        await expectRevert(chatInstance.connect(userTwo).sendMessage(owner.address, pubkey, userTwoMsg), "no power to send message to receiver");

        // transfer more token to userTwo
        // asset2.balanceOf(userTow) > asset2Filter.condition
        await asset2Instance.transfer(userTwo.address, asset2TransferToUserTwoAmount);
        let balanceAsset1OfUserTwo = await asset1Instance.balanceOf(userTwo.address);
        let balanceAsset2OfUserTwo = await asset2Instance.balanceOf(userTwo.address);
        assert.equal(balanceAsset1OfUserTwo.toNumber() < mockFilter1.condition.toNumber(), true);
        assert.equal(balanceAsset2OfUserTwo.toNumber() > mockFilter2.condition.toNumber(), true);
        let end = ethers.BigNumber.from(0);
        let count = ethers.BigNumber.from(5);
        let res = await chatInstance.pullMessageInReverseOrder(userTwo.address, owner.address, end, count);
        assert.equal(res.length, 0);
        res2 = await chatInstance.canSendMessageTo(userTwo.address, owner.address);
        assert.equal(res2, true);
    });

    it("get filter index before remove filter", async function() {
        // get filter.
        let res = await chatInstance.filterIndex(owner.address, asset2Instance.address);
        assert.equal(res.toNumber(), 1);

        let newFilter = new Object();
        newFilter.soulBoundToken = asset2Instance.address;
        newFilter.condition = ethers.BigNumber.from(101);
        let tx = await chatInstance.updateFilters([newFilter]);
        await tx.wait();
        res = await chatInstance.getFilters(owner.address);
        assert.equal(res[1].condition.toNumber(), 101);
        newFilter.condition = ethers.BigNumber.from(100);
        tx = await chatInstance.updateFilters([newFilter]);
        await tx.wait();
    });

    it("remove filter", async function() {
        // remove filter one.
        let tx = await chatInstance.removeFilters([asset1Instance.address]);
        await tx.wait();

        // get filter.
        let res = await chatInstance.getFilters(owner.address);
        assert.equal(res.length, 1);

        const asset1TransferAmount = ethers.BigNumber.from(2000);
        const asset2TransferAmount = ethers.BigNumber.from(200);
        const asset3TransferAmount = ethers.BigNumber.from(200);
        tx = await asset1Instance.transfer(userFive.address, asset1TransferAmount);
        await tx.wait();
        await asset2Instance.transfer(userFive.address, asset2TransferAmount);
        await asset3Instance.transfer(userFive.address, asset3TransferAmount);

        // mock pubkey.
        var pubkey = new Object();
        pubkey.x = ethers.BigNumber.from(200);
        pubkey.y = ethers.BigNumber.from(100);
        let msg = ethers.utils.toUtf8Bytes("send from userFive-" + owner.address + "-" + 1);
        tx = await chatInstance.connect(userFive).sendMessage(owner.address, pubkey, msg);
        await tx.wait();

        // add filters.
        const asset1FilterAmount = ethers.BigNumber.from(1000);
        let mockFilter1 = new Object();
        mockFilter1.soulBoundToken = asset1Instance.address;
        mockFilter1.condition = asset1FilterAmount;
        tx = await chatInstance.addFilters([mockFilter1]);
        await tx.wait();

        res = await chatInstance.getFilters(owner.address);
        assert.equal(res.length, 2);

        msg = ethers.utils.toUtf8Bytes("send from userFive-" + owner.address + "-" + 10);
        tx = await chatInstance.connect(userFive).sendMessage(owner.address, pubkey, msg);
        await tx.wait();

        // add filter
        const asset3FilterAmount = ethers.BigNumber.from(100);
        let mockFilter3 = new Object();
        mockFilter3.soulBoundToken = asset3Instance.address;
        mockFilter3.condition = asset3FilterAmount;
        tx = await chatInstance.addFilters([mockFilter3]);
        await tx.wait();

        msg = ethers.utils.toUtf8Bytes("send from userFive-" + owner.address + "-" + 100);
        tx = await chatInstance.connect(userFive).sendMessage(owner.address, pubkey, msg);
        await tx.wait();

        // remove filter one.
        tx = await chatInstance.removeFilters([asset1Instance.address, asset3Instance.address]);
        await tx.wait();

        msg = ethers.utils.toUtf8Bytes("send from userFive-" + owner.address + "-" + 1000);
        tx = await chatInstance.connect(userFive).sendMessage(owner.address, pubkey, msg);
        await tx.wait();

        msg = ethers.utils.toUtf8Bytes("send from userFive-" + owner.address + "-" + 1000);
        await chatInstance.connect(userFive).sendMessage(owner.address, pubkey, msg);

    });

    it("get filter index after remove filter", async function() {
        // get filter.
        let res = await chatInstance.filterIndex(owner.address, asset2Instance.address);
        assert.equal(res.toNumber(), 0);
    });

    it("add same filter duplicate will update filter", async function() {
        // get filter.
        let filters = await chatInstance.getFilters(owner.address);
        assert.equal(filters[0].condition.toNumber(), 100);
        const asset2FilterAmount = ethers.BigNumber.from(99);
        let mockFilter = new Object();
        mockFilter.soulBoundToken = asset2Instance.address;
        mockFilter.condition = asset2FilterAmount;
        let tx = await chatInstance.addFilters([mockFilter]);
        await tx.wait();
        // get filter.
        filters = await chatInstance.getFilters(owner.address);
        assert.equal(filters[0].condition.toNumber(), 99);
    });

    it("update filters", async function() {
        let newFilter = new Object();
        newFilter.soulBoundToken = asset2Instance.address;
        newFilter.condition = ethers.BigNumber.from(400);
        tx = await chatInstance.updateFilters([newFilter]);
        await tx.wait();
        // update empty filters.
        await chatInstance.updateFilters([]);
        // get filter.
        filters = await chatInstance.getFilters(owner.address);
        assert.equal(filters.length, 1);
        assert.equal(filters[0].condition.toNumber(), 400);

        let amount = ethers.BigNumber.from(200);
        await asset2Instance.transfer(userSix.address, amount);

        // userOne send msg with insufficient token.
        const msg = ethers.utils.toUtf8Bytes("send from userOne-" + owner.address + "-2");
        let pubKey = new Object();
        pubKey.x = ethers.BigNumber.from(100);
        pubKey.y = ethers.BigNumber.from(200);

        await expectRevert(chatInstance.connect(userSix).sendMessage(owner.address, pubKey, msg), "no power to send message to receiver");
    });

    it("update filter with exceed amount", async function() {
        let newFilter1 = new Object();
        newFilter1.soulBoundToken = asset2Instance.address;
        newFilter1.condition = ethers.BigNumber.from(100);
        let newFilter2 = new Object();
        newFilter2.soulBoundToken = asset2Instance.address;
        newFilter2.condition = ethers.BigNumber.from(100);
        await expectRevert(chatInstance.updateFilters([newFilter1, newFilter2]), "no enough filters to update");
    });

    it("update filter which is not exist", async function() {
        let newFilter1 = new Object();
        newFilter1.soulBoundToken = asset1Instance.address;
        newFilter1.condition = ethers.BigNumber.from(100);
        await expectRevert(chatInstance.updateFilters([newFilter1]), "can't update filter which is not exist");
    });

    it("add filter after remove", async function() {
        const asset1FilterAmount = ethers.BigNumber.from(1500);
        let mockFilter = new Object();
        mockFilter.soulBoundToken = asset1Instance.address;
        mockFilter.condition = asset1FilterAmount;
        let tx = await chatInstance.addFilters([mockFilter]);
        await tx.wait();
        // get filter.
        filters = await chatInstance.getFilters(owner.address);
        assert.equal(filters[filters.length - 1].condition.toNumber(), 1500);
    });

    it("remove filter with exceed amount", async function() {
        // remove filter.
        await expectRevert(chatInstance.removeFilters([asset1Instance.address, asset2Instance.address, asset2Instance.address]), "del_filters exceed amount");
    });

    it("remove filter which is not exist", async function() {
        // remove filter.
        await expectRevert(chatInstance.removeFilters([asset1Instance.address, owner.address]), "filter not exist");
    });

    it("remove all filter", async function() {
        // remove filter.
        let tx = await chatInstance.removeFilters([asset1Instance.address, asset2Instance.address]);
        await tx.wait();

        // get filter.
        let res = await chatInstance.getFilters(owner.address);
        assert.equal(res.length, 0);
    });

    it("remove filter with no filter exist", async function() {
        // remove filter.
        await expectRevert(chatInstance.removeFilters([]), "empty del_filters");
    });

    it("remove filter with no filter exist", async function() {
        // remove filter.
        await expectRevert(chatInstance.removeFilters([asset1Instance.address, asset2Instance.address]), "del_filters exceed amount");
        await expectRevert(chatInstance.removeFilters([asset1Instance.address]), "del_filters exceed amount");
    });

    it("add the same filter in one tx", async function() {
        // add filters.
        const asset1FilterAmount = ethers.BigNumber.from(1000);
        const ethAddr = "0x0000000000000000000000000000000000000000";
        let mockFilter = new Object();
        mockFilter.soulBoundToken = ethAddr;
        mockFilter.condition = asset1FilterAmount;
        let tx = await chatInstance.addFilters([mockFilter, mockFilter]);
        await tx.wait();
        // add empty filters.
        await chatInstance.addFilters([]);

        // get filter.
        let res = await chatInstance.getFilters(owner.address);
        assert.equal(res.length, 1);
    });

    it("add filter with native token", async function() {
        const mockFilterAmount = ethers.BigNumber.from("10000000000000000000");
        const ethAddr = "0x0000000000000000000000000000000000000000";
        let mockFilter = new Object();
        mockFilter.soulBoundToken = ethAddr;
        mockFilter.condition = mockFilterAmount;
        let tx = await chatInstance.addFilters([mockFilter]);
        await tx.wait();

        // transfer asset1 to userThree.
        const asset1Amount = ethers.BigNumber.from(1100);
        await asset1Instance.connect(owner).transfer(userThree.address, asset1Amount);

        // mock pubkey.
        var pubkey = new Object();
        pubkey.x = ethers.BigNumber.from(200);
        pubkey.y = ethers.BigNumber.from(100);

        // send msg.
        // mock msg.
        let c = 10;
        // send msg.
        for (var i = 0; i < c; i++) {
            let msg = ethers.utils.toUtf8Bytes("send from userThree-" + owner.address + "-" + i);
            tx = await chatInstance.connect(userThree).sendMessage(owner.address, pubkey, msg);
            await tx.wait();
        }

        // get balance of userThree.
        let balance = await ethers.provider.getBalance(userSix.address);
        // update filter
        const newMockFilterAmount = balance.add(ethers.BigNumber.from("100000000000000000000"));
        let mockFilter1 = new Object();
        mockFilter1.soulBoundToken = ethAddr;
        mockFilter1.condition = newMockFilterAmount;
        tx = await chatInstance.addFilters([mockFilter1]);
        await tx.wait();
        let newMsg = ethers.utils.toUtf8Bytes("send from userSix-" + owner.address + "-" + 100);
        await expectRevert(chatInstance.connect(userSix).sendMessage(owner.address, pubkey, newMsg), "no power to send message to receiver");

        // pull message.
        const end = ethers.BigNumber.from(0);
        const count = ethers.BigNumber.from(100);
        let res = await chatInstance.pullMessageInReverseOrder(owner.address, userThree.address, end, count);
        assert.equal(res.length, 10);
        assert.equal(ethers.utils.toUtf8String(res[0].retrievalMsg.msg), "send from userThree-" + owner.address + "-9");
    });

    it("add filter with account address", async function() {
        let mockFilter1 = new Object();
        mockFilter1.soulBoundToken = userOne.address;
        mockFilter1.condition = ethers.BigNumber.from(1000);
        await expectRevert(chatInstance.addFilters([mockFilter1]), "soulBoundToken must be contract");
    });

    it("add filters with amount more than max_amount", async function() {
        // add filters.
        let mockFilter1 = new Object();
        mockFilter1.soulBoundToken = asset1Instance.address;
        mockFilter1.condition = ethers.BigNumber.from(1000);

        await expectRevert(chatInstance.addFilters(
            [mockFilter1, mockFilter1, mockFilter1, mockFilter1, mockFilter1, mockFilter1, mockFilter1, mockFilter1, mockFilter1, mockFilter1, mockFilter1]
        ), "too much filter added");
    });

    it("add filter with contract which no impl balanceOf(address)", async function() {
        let mockFilter = new Object();
        mockFilter.soulBoundToken = mockContractInstance.address;
        mockFilter.condition = ethers.BigNumber.from(1000);
        await expectRevert(chatInstance.addFilters([mockFilter]), "invalid soulBoundToken which not impl balanceOf(address)");
    });

    it("send msg with multi type and pull", async function() {

        // mock pubkey.
        let pubkey = new Object();
        pubkey.x = ethers.BigNumber.from(200);
        pubkey.y = ethers.BigNumber.from(100);
        //receiver change to userThree.
        let count = 100;
        for (var i = 0; i < count; i++) {
            if (i % 3 == 0) {
                if (i % 2 == 0) {
                    let msg = "send from userOne-" + userThree.address + "-" + i;
                    msg = ethers.utils.toUtf8Bytes(msg);
                    let tx = await chatInstance.connect(userOne).sendMessage(userThree.address, pubkey, msg);
                    await tx.wait();
                } else {
                    let msg = "send from userTwo-" + userThree.address + "-" + i;
                    msg = ethers.utils.toUtf8Bytes(msg);
                    let tx = await chatInstance.connect(userTwo).sendMessage(userThree.address, pubkey, msg);
                    await tx.wait();
                }
            } else if (i % 3 == 1) {
                if (i % 2 == 0) {
                    let msg = "send from userOne-" + userThree.address + "-" + i;
                    msg = ethers.utils.toUtf8Bytes(msg);
                    let tx = await chatInstance.connect(userOne).sendMessage(userThree.address, pubkey, msg);
                    await tx.wait();
                } else {
                    let msg = "send from userTwo-" + userThree.address + "-" + i;
                    msg = ethers.utils.toUtf8Bytes(msg);
                    let tx = await chatInstance.connect(userTwo).sendMessage(userThree.address, pubkey, msg);
                    await tx.wait();
                }
            } else {
                if (i % 2 == 0) {
                    let msg = "send from userOne-" + userThree.address + "-" + i;
                    msg = ethers.utils.toUtf8Bytes(msg);
                    let tx = await chatInstance.connect(userOne).sendMessage(userThree.address, pubkey, msg);
                    await tx.wait();
                } else {
                    let msg = "send from userTwo-" + userThree.address + "-" + i;
                    msg = ethers.utils.toUtf8Bytes(msg);
                    let tx = await chatInstance.connect(userTwo).sendMessage(userThree.address, pubkey, msg);
                    await tx.wait();
                }
            }
        }

        let end = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(200);
        let res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 50);
        let res2 = await chatInstance.pullMessageInReverseOrder(userThree.address, userTwo.address, end, count);
        assert.equal(res2.length, 50);
        assert.equal(ethers.utils.toUtf8String(res[0].retrievalMsg.msg), "send from userOne-" + userThree.address + "-98");
        assert.equal(ethers.utils.toUtf8String(res2[0].retrievalMsg.msg), "send from userTwo-" + userThree.address + "-99");
        let res3 = await chatInstance.pullMessageInReverseOrderForMultiSession(userThree.address, [userOne.address, userTwo.address], [end, end], [count, ethers.BigNumber.from(48)])
        assert.equal(res3.length, 2);
        assert.equal(res3[0].length, 50);
        assert.equal(res3[1].length, 48);
        assert.equal(res3[0][0].retrievalMsg.sender, userOne.address);
        assert.equal(res3[1][0].retrievalMsg.sender, userTwo.address);
        assert.equal(ethers.utils.toUtf8String(res3[0][0].retrievalMsg.msg), "send from userOne-" + userThree.address + "-98");
        assert.equal(ethers.utils.toUtf8String(res3[1][0].retrievalMsg.msg), "send from userTwo-" + userThree.address + "-99");

        res3 = await chatInstance.pullMessageInReverseOrderForMultiSession(userThree.address, [userOne.address, userTwo.address], [end, end], [ethers.BigNumber.from(0), ethers.BigNumber.from(0)])
        assert.equal(res3.length, 2);
        assert.equal(res3[0].length, 0);
        assert.equal(res3[1].length, 0);

        let res4 = await chatInstance.pullMessageForMultiSession(userThree.address, [userOne.address, userTwo.address], [end, end], [count, ethers.BigNumber.from(48)]);
        assert.equal(res4.length, 2);
        assert.equal(res4[0].length, 50);
        assert.equal(res4[1].length, 48);
        assert.equal(res4[0][0].retrievalMsg.sender, userOne.address);
        assert.equal(res4[1][0].retrievalMsg.sender, userTwo.address);
        assert.equal(ethers.utils.toUtf8String(res4[0][0].retrievalMsg.msg), "send from userOne-" + userThree.address + "-0");
        assert.equal(ethers.utils.toUtf8String(res4[1][0].retrievalMsg.msg), "send from userTwo-" + userThree.address + "-1");

        res4 = await chatInstance.pullMessageForMultiSession(userThree.address, [userOne.address, userTwo.address], [end, end], [ethers.BigNumber.from(0), ethers.BigNumber.from(0)])
        assert.equal(res4.length, 2);
        assert.equal(res4[0].length, 0);
        assert.equal(res4[1].length, 0);

        end = ethers.BigNumber.from(40);
        count = ethers.BigNumber.from(50);
        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 40);
        assert.equal(res[0].id.toNumber(), 39);
        assert.equal(res[39].id.toNumber(), 0);

        end = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(49);
        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 49);
        assert.equal(res[0].id.toNumber(), 49);
        assert.equal(res[48].id.toNumber(), 1);

        end = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(50);
        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 50);
        assert.equal(res[0].id.toNumber(), 49);
        assert.equal(res[49].id.toNumber(), 0);

        end = ethers.BigNumber.from(49);
        count = ethers.BigNumber.from(49);
        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 49);
        assert.equal(res[0].id.toNumber(), 48);
        assert.equal(res[48].id.toNumber(), 0);

        end = ethers.BigNumber.from(49);
        count = ethers.BigNumber.from(10);
        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 10);
        assert.equal(res[0].id.toNumber(), 48);
        assert.equal(res[9].id.toNumber(), 39);

        end = ethers.BigNumber.from(100);
        count = ethers.BigNumber.from(10);
        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 0);

        end = ethers.BigNumber.from(48);
        count = ethers.BigNumber.from(49);
        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 48);
        assert.equal(res[0].id.toNumber(), 47);
        assert.equal(res[47].id.toNumber(), 0);

        end = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(0);
        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 0);
    });

    it("pull message in reverse order", async function() {
        let end = ethers.BigNumber.from(0);
        let count = ethers.BigNumber.from(100);
        let res = await chatInstance.pullMessageInReverseOrder(userOne.address, userThree.address, end, count);
        let res1 = await chatInstance.pullMessageInReverseOrder(userThree.address, userOne.address, end, count);
        assert.equal(res.length, 50);
        assert.equal(res.length, res1.length);
        assert.equal(res[0].id.toNumber(), 49);
        assert.equal(res[49].id.toNumber(), 0);
        assert.equal(res1[0].id.toNumber(), 49);
        assert.equal(res1[49].id.toNumber(), 0);

        let pubkey = new Object();
        let msg2 = ethers.utils.toUtf8Bytes("send from userTwo to userFour");
        pubkey.x = ethers.BigNumber.from(1100);
        pubkey.y = ethers.BigNumber.from(2200);
        tx = await chatInstance.connect(userTwo).sendMessage(userFour.address, pubkey, msg2);
        await tx.wait();

        msg2 = ethers.utils.toUtf8Bytes("send from userFour to userTwo");
        tx = await chatInstance.connect(userFour).sendMessage(userTwo.address, pubkey, msg2);
        await tx.wait();
        let res2 = await chatInstance.pullMessageInReverseOrder(userTwo.address, userFour.address, end, count);
        let res3 = await chatInstance.pullMessageInReverseOrder(userFour.address, userTwo.address, end, count);
        assert.equal(res2[0].retrievalMsg.sender, userFour.address);
        assert.equal(res2[1].retrievalMsg.sender, userTwo.address);
        assert.equal(res2[0].retrievalMsg.sender, res3[0].retrievalMsg.sender);
        assert.equal(res2[1].retrievalMsg.sender, res3[1].retrievalMsg.sender);

        let msg3 = ethers.utils.toUtf8Bytes("send from userTwo to userThree");
        tx = await chatInstance.connect(userTwo).sendMessage(userThree.address, pubkey, msg3);
        await tx.wait();

        msg3 = ethers.utils.toUtf8Bytes("send from userThree to userTwo");
        await chatInstance.connect(userThree).sendMessage(userTwo.address, pubkey, msg3);

        res2 = await chatInstance.pullMessageInReverseOrder(userTwo.address, userThree.address, end, count);
        res3 = await chatInstance.pullMessageInReverseOrder(userThree.address, userTwo.address, end, count);
        assert.equal(res2[0].retrievalMsg.sender, userThree.address);
        assert.equal(res2[1].retrievalMsg.sender, userTwo.address);
        assert.equal(res2[0].retrievalMsg.sender, res3[0].retrievalMsg.sender);
        assert.equal(res2[1].retrievalMsg.sender, res3[1].retrievalMsg.sender);

        end = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(100);
        res = await chatInstance.pullMessageInReverseOrder(userTwo.address, userThree.address, end, count);
        assert.equal(res.length, 52);
        assert.equal(res[0].id.toNumber(), 51);
        assert.equal(res[51].id.toNumber(), 0);

        end = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(10);
        res = await chatInstance.pullMessageInReverseOrder(userTwo.address, userThree.address, end, count);
        assert.equal(res.length, 10);
        assert.equal(res[0].id.toNumber(), 51);
        assert.equal(res[9].id.toNumber(), 42);

        end = ethers.BigNumber.from(100);
        count = ethers.BigNumber.from(10);
        res = await chatInstance.pullMessageInReverseOrder(userTwo.address, userThree.address, end, count);
        assert.equal(res.length, 0);

        end = ethers.BigNumber.from(30);
        count = ethers.BigNumber.from(10);
        res = await chatInstance.pullMessageInReverseOrder(userTwo.address, userThree.address, end, count);
        assert.equal(res.length, 10);
        assert.equal(res[0].id.toNumber(), 29);
        assert.equal(res[9].id.toNumber(), 20);

        res = await chatInstance.pullMessageInReverseOrder(userThree.address, userFour.address, end, count);
        assert.equal(res.length, 0);

        end = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(50);
        res = await chatInstance.pullMessageInReverseOrder(userTwo.address, userThree.address, end, count);
        assert.equal(res.length, 50);
        assert.equal(res[0].id.toNumber(), 51);
        assert.equal(res[49].id.toNumber(), 2);

        end = ethers.BigNumber.from(26);
        count = ethers.BigNumber.from(0);
        res = await chatInstance.pullMessageInReverseOrder(userTwo.address, userThree.address, end, count);
        assert.equal(res.length, 0);

    });

    it("pull message in order", async function() {
        let start = ethers.BigNumber.from(0);
        let count = ethers.BigNumber.from(100);
        res = await chatInstance.pullMessage(userTwo.address, userThree.address, start, count);
        assert.equal(res.length, 52);
        assert.equal(res[0].id.toNumber(), 0);
        assert.equal(res[51].id.toNumber(), 51);

        start = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(10);
        res = await chatInstance.pullMessage(userTwo.address, userThree.address, start, count);
        assert.equal(res.length, 10);
        assert.equal(res[0].id.toNumber(), 0);
        assert.equal(res[9].id.toNumber(), 9);

        start = ethers.BigNumber.from(100);
        count = ethers.BigNumber.from(10);
        res = await chatInstance.pullMessage(userTwo.address, userThree.address, start, count);
        assert.equal(res.length, 0);

        start = ethers.BigNumber.from(30);
        count = ethers.BigNumber.from(10);
        res = await chatInstance.pullMessage(userTwo.address, userThree.address, start, count);
        assert.equal(res.length, 10);
        assert.equal(res[0].id.toNumber(), 30);
        assert.equal(res[9].id.toNumber(), 39);

        start = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(50);
        res = await chatInstance.pullMessage(userTwo.address, userThree.address, start, count);
        assert.equal(res.length, 50);
        assert.equal(res[0].id.toNumber(), 0);
        assert.equal(res[49].id.toNumber(), 49);

        start = ethers.BigNumber.from(40);
        count = ethers.BigNumber.from(2);
        res = await chatInstance.pullMessage(userTwo.address, userThree.address, start, count);
        assert.equal(res.length, 2);
        assert.equal(res[0].id.toNumber(), 40);
        assert.equal(res[1].id.toNumber(), 41);

        start = ethers.BigNumber.from(40);
        count = ethers.BigNumber.from(50);
        res = await chatInstance.pullMessage(userTwo.address, userThree.address, start, count);
        assert.equal(res.length, 12);
        assert.equal(res[0].id.toNumber(), 40);
        assert.equal(res[11].id.toNumber(), 51);

        start = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(0);
        res = await chatInstance.pullMessage(userTwo.address, userThree.address, start, count);
        assert.equal(res.length, 0);
    });
    it("pull message", async function() {
        let start = ethers.BigNumber.from(0);
        let count = ethers.BigNumber.from(9);
        let res = await chatInstance.getConversationList(owner.address, start, count);

        let result = await chatInstance.pullMessageInReverseOrder(owner.address, res[0][0][0], 0, 0);
        assert.equal(result.length, 0);
        result = await chatInstance.pullMessageInReverseOrder(owner.address, res[0][0][0], 1, 0);
        assert.equal(result.length, 0);
        result = await chatInstance.pullMessageInReverseOrder(owner.address, ZERO_ADDRESS, 0, 0);
        assert.equal(result.length, 0);
        let res1 = 0;
        for (let user of res[0]) {
            res = await chatInstance.pullMessageInReverseOrder(owner.address, user[0], 0, 100);
            res1 = await chatInstance.pullMessage(owner.address, user[0], 0, 100);
            assert.equal(res.length, res1.length);
            for (let i in res1) {
                assert.equal(res1[i][0][0], res[res.length - 1 - i][0][0])
            }
            res1 = await chatInstance.pullMessage(owner.address, user[0], res.length, 100);
            assert.equal(res1.length, 0);
            res1 = await chatInstance.pullMessage(owner.address, user[0], res.length - 1, 100);
            assert.equal(res1.length, 1);
            res1 = await chatInstance.pullMessage(owner.address, user[0], 3, 100);
            assert.equal(res1.length, res.length - 3);
            for (let i in res1) {
                assert.equal(res1[i][0][0], res[res.length - 1 - i - 3][0][0]);
                assert.equal(res1[i][1].toNumber(), res[res.length - 1 - i - 3][1].toNumber());
            }
        }

    })

    it("get conversation list of user", async function() {
        let start = ethers.BigNumber.from(0);
        let count = ethers.BigNumber.from(3);

        let res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 3);
        assert.equal(res[1].toNumber(), 2);
        let r2 = await chatInstance.userKey(res[0][0].user);
        assert.equal(res[0][0].pk.x.toNumber(), r2.x.toNumber());
        assert.equal(res[2], false);

        start = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(2);

        res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 2);
        assert.equal(res[1].toNumber(), 1);
        assert.equal(res[2], true);

        start = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(10);

        res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 3);
        assert.equal(res[1].toNumber(), 2);
        assert.equal(res[2], false);

        start = ethers.BigNumber.from(4);
        count = ethers.BigNumber.from(1);

        res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 0);
        assert.equal(res[1].toNumber(), 2);
        assert.equal(res[2], false);

        start = ethers.BigNumber.from(1);
        count = ethers.BigNumber.from(9);

        res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 2);
        assert.equal(res[1].toNumber(), 2);
        assert.equal(res[2], false);

        start = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(2);

        res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 2);
        assert.equal(res[1].toNumber(), 1);
        assert.equal(res[2], true);

        res = await chatInstance.getConversationList(userNine.address, start, count);
        assert.equal(res[0].length, 1);
        assert.equal(res[1].toNumber(), 0);
        assert.equal(res[2], false);

        start = ethers.BigNumber.from(0);
        count = ethers.BigNumber.from(0);

        res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 0);
        assert.equal(res[1].toNumber(), 0);
        assert.equal(res[2], true);

        res = await chatInstance.getConversationList(userNine.address, start, count);
        assert.equal(res[0].length, 0);
        assert.equal(res[1].toNumber(), 0);
        assert.equal(res[2], true);

        start = ethers.BigNumber.from(2);
        count = ethers.BigNumber.from(0);

        res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 0);
        assert.equal(res[1].toNumber(), 2);
        assert.equal(res[2], true);

        start = ethers.BigNumber.from(2);
        count = ethers.BigNumber.from(1);

        res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 1);
        assert.equal(res[1].toNumber(), 2);
        assert.equal(res[2], false);
    });

    it("send msg with no filter after the conversation exist", async function() {

        let newFilter = new Object();
        newFilter.soulBoundToken = asset2Instance.address;
        newFilter.condition = ethers.BigNumber.from(400);
        let tx = await chatInstance.connect(userSeven).addFilters([newFilter]);
        await tx.wait();
        // get filter.
        filters = await chatInstance.getFilters(userSeven.address);
        assert.equal(filters.length, 1);
        assert.equal(filters[0].condition.toNumber(), 400);

        let amount = ethers.BigNumber.from(200);
        await asset2Instance.transfer(userEight.address, amount);

        const msg = ethers.utils.toUtf8Bytes("send from userEight-" + userSeven.address + "-2");
        // check balance
        let balance = await asset2Instance.balanceOf(userEight.address);
        assert.equal(balance.toNumber() < filters[0].condition.toNumber(), true);
        let res = await chatInstance.canSendMessageTo(userEight.address, userSeven.address);
        assert.equal(res, false);
        res = await chatInstance.canSendMessageTo(userSeven.address, userEight.address);
        assert.equal(res, true);
        let pubKey = new Object();
        pubKey.x = ethers.BigNumber.from(100);
        pubKey.y = ethers.BigNumber.from(200);
        await expectRevert(chatInstance.connect(userEight).sendMessage(userSeven.address, pubKey, msg), "no power to send message to receiver");

        filters = await chatInstance.getFilters(userEight.address);
        assert.equal(filters.length, 0);
        tx = await chatInstance.connect(userSeven).sendMessage(userEight.address, pubKey, msg);
        await tx.wait();
        res = await chatInstance.canSendMessageTo(userEight.address, userSeven.address);
        assert.equal(res, true);
        tx = await chatInstance.connect(userEight).sendMessage(userSeven.address, pubKey, msg);
        await tx.wait();

        // userSeven add new filter
        newFilter = new Object();
        newFilter.soulBoundToken = asset1Instance.address;
        newFilter.condition = ethers.BigNumber.from(800);
        tx = await chatInstance.connect(userSeven).addFilters([newFilter]);
        await tx.wait();
        // check balance of userEight
        balance = await asset2Instance.balanceOf(userEight.address);
        assert.equal(balance.toNumber() < 400, true);
        balance = await asset1Instance.balanceOf(userEight.address);
        assert.equal(balance.toNumber(), 0);
        // userEight can send msg to userSeven
        res = await chatInstance.canSendMessageTo(userEight.address, userSeven.address);
        assert.equal(res, true);
        tx = await chatInstance.connect(userEight).sendMessage(userSeven.address, pubKey, msg);
        await tx.wait();
    });

    it("contract upgrade", async function() {

        let start = ethers.BigNumber.from(4);
        let count = ethers.BigNumber.from(1);

        let res = await chatInstance.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 0);
        assert.equal(res[1].toNumber(), 2);
        assert.equal(res[2], false);
        const ChatV2 = await ethers.getContractFactory("chatV2");
        const chatV2 = await upgrades.upgradeProxy(chatInstance.address, ChatV2);
        assert.equal(chatV2.address, chatInstance.address);

        start = ethers.BigNumber.from(4);
        count = ethers.BigNumber.from(1);

        res = await chatV2.getConversationList(owner.address, start, count);
        assert.equal(res[0].length, 0);
        assert.equal(res[1].toNumber(), 2);
        assert.equal(res[2], false);

        let userKeyOfOwner = await chatV2.userKey(owner.address);
        assert.equal(userKeyOfOwner.x.toNumber(), 100);
        assert.equal(userKeyOfOwner.y.toNumber(), 100);

        let tx = await chatV2.cancel();
        await tx.wait();
        userKeyOfOwner = await chatV2.userKey(owner.address);
        assert.equal(userKeyOfOwner.x.toNumber(), 0);
        assert.equal(userKeyOfOwner.y.toNumber(), 0);
    });

});
