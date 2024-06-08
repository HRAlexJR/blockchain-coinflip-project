# blockchain-coinflip-project

Coinflip Betting dApp is a decentralized application (dApp) that allows users to bet on the outcome of a coin flip using Ethereum smart contracts. The project consists of a backend written in Solidity for the smart contracts and a front-end built in React for the user interface.

## Features

- **Coin Flip Betting**: Users can place bets on the outcome of a coin flip (heads or tails).
- **Ethereum Smart Contracts**: The betting logic is executed on Ethereum smart contracts, ensuring transparency and immutability.
- **Random Number Generation**: Since generating truly random numbers is a challenge on the blockchain, the dApp utilizes the Provable (formerly Oraclize) oracle service to fetch a random number, which is used to determine the outcome of the coin flip.
- **Responsive UI**: The front-end interface is built using React, providing users with a seamless betting experience across different devices.

## How it Works

1. **Place Bet**: Users select their desired bet amount and choose either heads or tails.
2. **Fetch Random Number**: The dApp sends a request to the Provable oracle to fetch a random number.
3. **Determine Outcome**: The random number returned by the oracle is used to determine the outcome of the coin flip.
4. **Settle Bet**: Depending on the outcome, winnings are distributed to the winner's Ethereum wallet.
