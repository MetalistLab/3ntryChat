// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

/// @title IM interface base on blockchain 
interface Messages {
    struct SBTFilter {
        address soulBoundToken;
        uint256 condition;
    }
    struct PubKeyPoint {
        uint256 x;
        uint256 y;
    }

    
    struct MessageInfo {
        bytes msg;
        uint256 timestamp;
        address sender;
    }

    struct RetrievalMessageInfo {
        MessageInfo retrievalMsg;
        uint256 id;
    }

    struct ConversationInfo {
        address user;
        PubKeyPoint pk;
    }
    


    event MessageSend(address receiver, MessageInfo msg);

    /// @notice register for user public key
    /// @dev register for user public key
    /// @param pk, public key point
    function register(PubKeyPoint calldata pk)  external;
    /// @notice send msg to other
    /// @param receiver the receiver of the msg
    /// @param pk the public key of sender
    /// @param message message
    function sendMessage(address receiver, PubKeyPoint calldata pk, bytes calldata message)  external;

    /// @notice get conversation list of user.
    /// @param user the address of user.
    /// @param start the index to search.
    /// @param count the number of conversation to search.
    function getConversationList(address user, uint256 start, uint256 count)  external view returns(ConversationInfo[] memory, uint256, bool);
    
    /// @notice pull message
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address of the conversation 
    /// @param begin the index to search. Included in result
    /// @param count the number of message to search
    function pullMessage(address peer1, address peer2,uint256 begin, uint256 count)  external view returns (RetrievalMessageInfo[] memory);

    /// @notice pull message in reverse order
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address of the conversation 
    /// @param end the index to search, not include in result. 0 -> the latest
    /// @param count the number of message to search
    function pullMessageInReverseOrder(address peer1, address peer2,uint256 end, uint256 count)  external view returns (RetrievalMessageInfo[] memory);

    /// @notice pull message in conversation between peer1 and peer2, in reverse order
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address list of the conversations
    /// @param end the index to search, not include in result. 0 -> the latest
    /// @param count the number of message to search
    function pullMessageInReverseOrderForMultiSession(address peer1, address[] calldata peer2,uint256[] calldata end, uint256[] calldata count)  external view returns (RetrievalMessageInfo[][] memory);

    /// @notice pull message in conversation between peer1 and peer2
    /// @param peer1 peer1 address of the conversation 
    /// @param peer2 peer2 address list of the conversations
    /// @param begin the index to search. Included in result
    /// @param count the number of message to search
    function pullMessageForMultiSession(address peer1, address[] calldata peer2,uint256[] calldata begin, uint256[] calldata count)  external view returns (RetrievalMessageInfo[][] memory);

    /// @notice add filters by user.
    /// @param addFiltersInfo the array of filter which is used to add.
    /// - soulBoundToken the address of contract which impl balanceOf(address) eg.(ERC20/ERC721).
    /// - condition the lowest balance is need.
    function addFilters(SBTFilter[] calldata addFiltersInfo)  external;

    /// @notice get filters of user.
    /// @param user the address of user.
    function getFilters(address user)  external view returns(SBTFilter[] memory);

    /// @notice remove filters by user.
    /// @param delFiltersInfo the array of address which is used to remove.
    function removeFilters(address[] calldata delFiltersInfo)  external ;

    /// @notice update filters on yourself
    /// @param updateFiltersInfo the array of the object of filter which will be update
    /// - authContract the address of dst contract
    /// - condition The minimum balance
    function updateFilters(SBTFilter[] calldata updateFiltersInfo)  external;

    // check whether the message can be send
    /// @notice check whether the message can be send
    /// @param sender the address of sender
    /// @param receiver the address of receiver
    function canSendMessageTo(address sender, address receiver)  external view returns (bool);
}
