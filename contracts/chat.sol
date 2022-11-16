// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./interfaces/IMessages.sol";
import "./interfaces/ISBTFilter.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract chat is Messages, Initializable {
    mapping (address => PubKeyPoint) public userKey;
    mapping(address => address[]) public conversationList;
    mapping(address => mapping(address => MessageInfo[])) public messages;
    mapping (address => SBTFilter[]) public filters;

    uint256 public MAX_AMOUNT;
    mapping(address => mapping(address => uint256)) public filterIndex;

    function initialize(uint256 amount) public initializer {
       MAX_AMOUNT = amount;
    }

    /// @notice register for user public key
    /// @dev register for user public key
    /// @param pk, public key point
    function register(PubKeyPoint calldata pk) virtual override external {
        // can convert.
        require(pk.x != 0 && pk.y != 0, "invalid pub_key");
        userKey[msg.sender] = pk;
    }

    /// @notice send msg to other 
    /// @param receiver the receiver of the msg
    /// @param message message
    function sendMessage(address receiver, PubKeyPoint calldata pk, bytes calldata message) virtual override external {
        require(bytes(message).length > 0, "empty message is not allowed");
        if (userKey[msg.sender].x == 0 && userKey[msg.sender].y == 0){
            require(pk.x != 0 && pk.y != 0, "invalid pubKey");
            userKey[msg.sender] = pk;
        }
        address smaller;
        address bigger;
        (smaller, bigger) = _getConversationID(msg.sender, receiver);

        // filter message.
        uint256 msgLength = messages[smaller][bigger].length;
        if (msgLength == 0) {
            require(_validMessage(msg.sender, receiver), "no power to send message to receiver");
            conversationList[msg.sender].push(receiver);
            if (msg.sender != receiver) {
                conversationList[receiver].push(msg.sender);
            }
        }
        uint256 time = block.timestamp;
        MessageInfo memory m = MessageInfo(message, time, msg.sender);
        messages[smaller][bigger].push(m);
        emit MessageSend(receiver, m);
    }

    /// @notice get conversation list of user
    /// @param user the address of user
    /// @param start the index to search
    /// @param count the number of conversation to search
    function getConversationList(address user, uint256 start, uint256 count) virtual override external view returns(ConversationInfo[] memory, uint256, bool) {
        ConversationInfo[] memory res = new ConversationInfo[](0);
        uint256 length = conversationList[user].length;
        uint256 currentLatestIndex = 0;
        if (length == 0) {
            return (res, currentLatestIndex, false);
        }
        if (start >= length) {
            currentLatestIndex = length-1;
            return (res, currentLatestIndex, false);
        }
        if (count == 0) {
            return (res, start, true);
        }
        uint256 end = 0;
        bool hasMore = false;
        if (start+count >= length) {
            end = length;
            currentLatestIndex = length-1;
        }else {
            end = start+count;
            hasMore = true;
            currentLatestIndex = start+count-1;
        }
        count = end-start;
        res = new ConversationInfo[](count);
        uint256 index = 0;
        for(; index < count; index++) {
            address acc = conversationList[user][start++];
            res[index] = ConversationInfo(acc, userKey[acc]);
        }
        return (res, currentLatestIndex, hasMore);
    }
    /// @notice pull message in conversation between peer1 and peer2, in reverse order
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address list of the conversations
    /// @param end the index to search, not include in result. 0 -> the latest
    /// @param count the number of message to search
    function pullMessageInReverseOrderForMultiSession(address peer1, address[] calldata peer2,uint256[] calldata end, uint256[] calldata count) virtual external override view returns (RetrievalMessageInfo[][] memory result) {
        require(peer2.length == end.length && peer2.length == count.length,"unequal array lengths");
        result = new RetrievalMessageInfo[][](peer2.length);
        for (uint i = 0; i < peer2.length; i++) {
            result[i] = _pullMessageInReverseOrder(peer1, peer2[i], end[i], count[i]);
        }
        return result;
    }

    /// @notice pull message in conversation between peer1 and peer2, in reverse order
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address of the conversation 
    /// @param end the index to search, not include in result. 0 -> the latest
    /// @param count the number of message to search
    function pullMessageInReverseOrder(address peer1, address peer2,uint256 end, uint256 count) virtual external view override returns (RetrievalMessageInfo[] memory) {
        return _pullMessageInReverseOrder(peer1, peer2, end, count);
    }

    /// @notice pull message in conversation between peer1 and peer2
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address list of the conversations
    /// @param begin the index to search. Included in result
    /// @param count the number of message to search
    function pullMessageForMultiSession(address peer1, address[] calldata peer2,uint256[] calldata begin, uint256[] calldata count) virtual external override view returns (RetrievalMessageInfo[][] memory result) {
        require(peer2.length == begin.length && peer2.length == count.length,"unequal array lengths");
        result = new RetrievalMessageInfo[][](peer2.length);
        for (uint i = 0; i < peer2.length; i++) {
            result[i] = _pullMessage(peer1, peer2[i], begin[i], count[i]);
        }
        return result;
    }

    /// @notice pull message
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address of the conversation 
    /// @param begin the index to search. Included in result
    /// @param count the number of message to search
    function pullMessage(address peer1, address peer2,uint256 begin, uint256 count) virtual external override view returns (RetrievalMessageInfo[] memory) {
        return _pullMessage(peer1, peer2, begin, count);
    }   

    /// @notice add filters on yourself
    /// @param addFiltersInfo the array of the object of added filter
    /// - soulBoundToken the address of dst contract
    /// - condition The minimum balance
    function addFilters(SBTFilter[] calldata addFiltersInfo) virtual override external {
        uint256 length = addFiltersInfo.length;
        require(filters[msg.sender].length + length <= MAX_AMOUNT, "too much filter added");
        uint256 index = 0;
        for(; index < length; index++) {
            _addFilter(addFiltersInfo[index].soulBoundToken, addFiltersInfo[index].condition);
        }
    }

    // get filters.
    /// @notice get filters by user.
    /// @param user the address of user.
    // query filters.
    function getFilters(address user) virtual external view override returns(SBTFilter[] memory) {
        SBTFilter[] memory fs = filters[user];
        return fs;
    }

    // remove filters.
    /// @notice remove filters on yourself
    /// @param delFiltersInfo the address array of filter.
    function removeFilters(address[] calldata delFiltersInfo) virtual override external {
        SBTFilter[] memory fs = filters[msg.sender];
        uint256 length = delFiltersInfo.length;
        require(length>0, "empty del_filters");
        require(fs.length>=length, "del_filters exceed amount");
        uint256 index = 0;
        for(; index < length; index++) {
            _removeFilter(delFiltersInfo[index]);
        }
    }

    // update filters.
    /// @notice update filters on yourself
    /// @param updateFiltersInfo the array of the object of filter which will be update
    /// - soulBoundToken the address of dst contract
    /// - condition The minimum balance
    function updateFilters(SBTFilter[] calldata updateFiltersInfo) virtual override external {
        uint256 length = updateFiltersInfo.length;
        require(filters[msg.sender].length >= length, "no enough filters to update");
        uint256 index = 0;
        for(; index < length; index++) {
            _updateFilter(updateFiltersInfo[index]);
        }
    }

    /// @notice check whether the message can be send
    /// @param sender the address of sender
    /// @param receiver the address of receiver
    function canSendMessageTo(address sender, address receiver) virtual override external view returns (bool) {
        address smaller;
        address bigger;

        (smaller, bigger) = _getConversationID(sender, receiver);
        uint256 msgLength = messages[smaller][bigger].length;
        if (msgLength > 0) {
            return true;
        }
        return _validMessage(sender, receiver);
    }

    /// @dev get conversation id between two peer
    /// @param peer1 the address of peer
    /// @param peer2 the address of peer
    /// @return (address, address) address sorted by size
    function _getConversationID(address peer1, address peer2) internal pure returns (address , address ){
        address smaller = peer1;
        address bigger = peer2;
        if (uint256(uint160(peer1)) > uint256(uint160(peer2))) {
            smaller = peer2;
            bigger = peer1;
        }
        return (smaller, bigger);
    }

    /// @dev pull message in reverse order
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address of the conversation 
    /// @param end the index to search, not include in result. 0 -> the latest
    /// @param count the number of message to search 
    function _pullMessageInReverseOrder(address peer1, address peer2,uint256 end, uint256 count) internal view returns (RetrievalMessageInfo[] memory) {
        address smaller = peer1;
        address bigger = peer2;
        (smaller, bigger) = _getConversationID(peer1, peer2);
        
        RetrievalMessageInfo[] memory rmi = _getMessages(smaller, bigger, end, count);
        return rmi;
    }

    /// @dev pull message in order
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address of the conversation 
    /// @param begin the index to search. Included in result
    /// @param count the number of message to search
    function _pullMessage(address peer1, address peer2,uint256 begin, uint256 count) internal view returns (RetrievalMessageInfo[] memory) {
        if (count == 0) {
            return new RetrievalMessageInfo[](0);
        }
        address smaller;
        address bigger;
        (smaller, bigger) = _getConversationID(peer1, peer2);
        MessageInfo[] memory mi = messages[smaller][bigger];

        if (begin >= mi.length) {
            return new RetrievalMessageInfo[](0);
        }

        uint256 avaCount = mi.length - begin;
        if (avaCount < count) {
            count = avaCount;
        }
        RetrievalMessageInfo[] memory ms = new RetrievalMessageInfo[](count);
        uint256 idx = 0;
        uint256 index = 0;
        for(; idx < count; idx++) {
            index = begin + idx;
            ms[idx]= RetrievalMessageInfo(mi[index], index);
        }
        return ms;
    }

    /// @dev get messages in reverse order
    /// @param smaller smaller address of the conversation 
    /// @param bigger bigger address of the conversation 
    /// @param end the index to search, not include in result. 0 -> the latest
    /// @param count the number of message to search
    function _getMessages(address smaller, address bigger, uint256 end, uint256 count) internal view returns (RetrievalMessageInfo[] memory) {
        MessageInfo[] memory mi = messages[smaller][bigger];
        RetrievalMessageInfo[] memory ms = new RetrievalMessageInfo[](0);
        if (mi.length == 0) {
            return ms;
        }
        uint256 start = 0;
        if (end == 0) {
            if (mi.length > count) {
                start = mi.length - count;
            }
        }else {
            if (end > count) {
                start = end - count;
            }else {
                count = end;
            }
        }
        if (start >= mi.length) {
            return ms;
        }
        if (mi.length<=start+count) {
            end = mi.length;
        }else {
            end = start+count;
        }
        uint256 index = 0;
        count = end - start;
        ms = new RetrievalMessageInfo[](count);
        for(; end > start;) {
            end--;
            MessageInfo memory m = mi[end];
            ms[index]= RetrievalMessageInfo(m, end);
            index++;
        }
        return ms;
    }

    /// @dev remove filter
    /// @param delFilter address of filter which will be removed
    function _removeFilter(address delFilter) internal {
        uint256 lastIndex = filters[msg.sender].length-1;
        uint256 index = filterIndex[msg.sender][delFilter];
        if (index == 0) {
            require(filters[msg.sender][index].soulBoundToken == delFilter, "filter not exist");
        }
        if (lastIndex == index) {
            filterIndex[msg.sender][delFilter] = 0;
        }else {
            SBTFilter memory lastFilter = filters[msg.sender][lastIndex];
            filters[msg.sender][index] = lastFilter;
            delete filters[msg.sender][lastIndex];
            filterIndex[msg.sender][delFilter] = 0;
            filterIndex[msg.sender][lastFilter.soulBoundToken] = index;
        }
        // remove empty element.
        filters[msg.sender].pop();
    }

    /// @dev add filter
    /// @param soulBoundToken address of filter
    /// @param condition The minimum balance
    function _addFilter(address soulBoundToken, uint256 condition) internal {
        if (soulBoundToken != address(0)) {
            require(_isContract(soulBoundToken), "soulBoundToken must be contract");
            require(_validFilter(soulBoundToken), "invalid soulBoundToken which not impl balanceOf(address)");
        }
        uint256 index = filterIndex[msg.sender][soulBoundToken];
        SBTFilter memory f = SBTFilter(soulBoundToken, condition);
        if (filters[msg.sender].length == 0) {
            filters[msg.sender].push(f);
            filterIndex[msg.sender][soulBoundToken] = filters[msg.sender].length-1;
        }else if ((index == 0 && filters[msg.sender][0].soulBoundToken == soulBoundToken) || (index >0)) {
            filters[msg.sender][index].condition = condition;
        }else {
            filters[msg.sender].push(f);
            filterIndex[msg.sender][soulBoundToken] = filters[msg.sender].length-1;
        }
    }

    /// @dev update filter
    /// @param updateFilter array of filter which will be updated
    /// - soulBoundToken the address of dst contract
    /// - condition The minimum balance
    function _updateFilter(SBTFilter calldata updateFilter) internal {
        uint256 index = filterIndex[msg.sender][updateFilter.soulBoundToken];
        if (index == 0) {
            require(filters[msg.sender][index].soulBoundToken == updateFilter.soulBoundToken, "can't update filter which is not exist");
        }
        filters[msg.sender][index].condition = updateFilter.condition;
    }

    /// @dev check whether the addr has 'balanceOf(address)' method
    /// @param addr address of filter
    /// @return bool
    function _validFilter(address addr) internal view returns (bool) {
        (bool success,) = addr.staticcall(abi.encodeWithSignature("balanceOf(address)", addr));
        return success;
    }

    /// @dev check whether the addr is belong to a contract
    /// @param addr address
    /// @return bool
    function _isContract(address addr) internal view returns (bool) {
        return addr.code.length>0;
    }

    /// @dev check can sender send message to receiver
    /// @param sender the address of sender
    /// @param receiver the address of receiver
    /// @return bool
    function _validMessage(address sender, address receiver) internal view returns (bool) {
        SBTFilter[] memory fs = filters[receiver];
        uint256 length = fs.length;
        uint256 index = 0;
        if (length == 0) {
            return true;
        }
        bool valid = false;
        for(; index < length; index++) {
            address c = fs[index].soulBoundToken;
            if (c == address(0)) { // eth
                if (sender.balance>=fs[index].condition) {
                    valid = true;
                    break;
                }
            }else {
                uint256 balance = msgFilter(c).balanceOf(sender);
                if (balance>=fs[index].condition) {
                    valid = true;
                    break;
                }
            }
        }

        return valid;
    }
}
