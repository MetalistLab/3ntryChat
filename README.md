
# Overview

### 1. Technological Implementation
Encrypted chat protocol deploy on NEAR Aurora Testnet, it allows people to communicate with others without central server, all messages are stored on the chain forever, and only the communicating parties can parse the messages. Quick message sending and receiving can demonstrate the high performance of NEAR. 

### 2. Design 
1) To enhance the user experience, we have developed a user-friendly app for users to experience crypto chat, and we have plenty of product details to prove that we have well thought out the user experience. For example, when a user sends a message (actually sends a transaction on blockchain), we provide the option to remember the password, once the user selects this option, the user does not need to enter the private key password again when sending a message in the next 24 hours. To give the second example, when the user backs up the private key, when the user copies the private key to finish the backup, we provide a button to help the user clear the phone clipboard to avoid the private key leakage. To give the thrid example, on the message list page, the message bubbles of encrypted messages and unencrypted messages are designed differently, which is very easy to distinguish. The fourth example is that we maintain the queue of unsent messages in the client, so that users can send multiple messages at one time without disordering them. To give the last example, our project provides sender filter function that prevent users from receiving spam messages.

2) To protect users' privacy, we developed the APP without any server, users chat using anonymous wallet addresses, messages are stored encrypted so that no centralized agency can snoop, locate and censor users.

### 3. Potential impact
Our project is open source. We think the use of encrypted messages is extensive. Any DAPP can integrate our protocol and SDK to provide chat functions to their users, such as games, DEFI, NFT trading market, etc. Our protocol provides sender filters where users can set up to only accept messages from senders holding specified tokens(FT or NFT), this applies to chat between influencerss/artists and their fans, but also to DAOs and communities.

### 4. Quality of the idea

1) 3ntyrChat is anonymous. Users are interacting with each DAPP through wallet addresses, which represent the user's identity ID, and chatting anonymously between wallet addresses is the trend. 
2) 3ntyrChat is open. There are data silos in Web2, for example, Discord messages cannot be sent to Snapchat, while 3ntryChat stores messages on the blockchain, so users can chat across terminals and DAPPs.
3) 3ntryChat support sender filter based on token(FT or NFT). This applies to chat between influencerss/artists and their fans, but also to DAOs and communities;
4) 3ntryChat is decentralized and encrypted, chat messages are stored decentrally and encrypted, and no centralized organization can ban, monitor, or locate user messages.