
# 3ntryChat APP

## APK File Installation Guide

1. Download the APK file: https://github.com/MetalistLab/3ntryChat/raw/main/client/3ntryChat_2022-11-17_19-58_release_35.apk

2. Locate the file in file manager

3. Install and launch the application on your home screen

## Application Features

### Chat Message Encryption

Generates an encryption string using the public key of the contact's wallet and the private key of the user's wallet.

Uses the generated string as a key to encrypt chat content via AES encryption.

### Cross-terminal Access to Chat History

The same account can retrieve chat history on different devices by fetching on-chain data.

## Architecture

![iShot_2022-11-17_11.17.36](https://github.com/MetalistLab/3ntryChat/blob/main/client/2022-11-17_11.17.36.png)

ChatModule: Forms a chat when sending a message to a contact and receives the latest messages/new chats.

MessageModule: Receives, sends, and stores messages.

PendingMessageModule: Sends pending messages to the blockchain.
