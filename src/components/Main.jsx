import React, { useState, useEffect, useCallback } from 'react'
import Coinflip from '../abi/Coinflip.json'
import Web3 from 'web3'
import NavBar from './NavBar'
import ContractBalance from './ContractBalance'
import MainCard from './MainCard'
import OwnerScreen from './OwnerScreen'
import Directions from './Directions'
import ModalWindow from './ModalWindow'
import styled from 'styled-components'

import { useUser } from '../context/UserContext'
import { useContract } from '../context/ContractContext'

const AlignContent = styled.div`
    position: relative;
    top: 1rem;
    display: flex;
    justify-content: space-between;
`;

const AlignQuarter = styled.div`
    width: 25%
`;

const AlignHalf = styled.div`
    width: 50%
`;

const web3 = new Web3(Web3.givenProvider)
const contractAddress = '0x0308c3A32E89cC7E294D07D4f356ad6b90dDd8E9'
const coinflip = new web3.eth.Contract(Coinflip.abi, contractAddress)

export default function Main() {

    const {
        userAddress,
        setUserAddress,
        userBalance,
        setUserBalance,
        winningsBalance,
        setWinningsBalance,
    } = useUser();

    const  {
        contractBalance,
        setContractBalance,
        owner,
        setOwner,
        setIsOwner,
        network,
        setNetwork,
        sentQueryId,
        setSentQueryId,
        awaitingCallbackResponse,
        setAwaitingCallbackResponse,
        awaitingWithdrawal,
        setAwaitingWithdrawal,
    } = useContract();

    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [outcomeMessage, setOutcomeMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState(''); // Error message state

    const fetchNetwork = useCallback(async() => {
        try {
            let num = await web3.currentProvider.chainId;
            if(num === '0x1'){
                setNetwork('Mainnet')
            } else if(num === '0x3'){
                setNetwork('Ropsten')
            } else if(num === '0x4'){
                setNetwork('Rinkeby')
            } else if(num === '0x5'){
                setNetwork('Goerli')
            } else if(num === '0x42'){
                setNetwork('Kovan')
            } else {
                setNetwork('N/A')
            }
        } catch (error) {
            setErrorMessage('Failed to fetch network: ' + error.message);
        }
    }, [setNetwork])

    const loadUserAddress = useCallback(async() => {
        try {
            let accounts = await web3.eth.getAccounts()
            let account = accounts[0]
            return account
        } catch (error) {
            setErrorMessage('Failed to load user address: ' + error.message);
        }
    }, [])

    const loadContractBalance = useCallback(async() => {
        try {
            let balance = await coinflip.methods.contractBalance().call()
            setContractBalance(web3.utils.fromWei(balance))
        } catch (error) {
            setErrorMessage('Failed to load contract balance: ' + error.message);
        }
    }, [setContractBalance])

    const loadUserBalance = useCallback(async(user) => {
        try {
            let userBal = await web3.eth.getBalance(user)
            setUserBalance(Number.parseFloat(web3.utils.fromWei(userBal)).toPrecision(3))
        } catch (error) {
            setErrorMessage('Failed to load user balance: ' + error.message);
        }
    }, [setUserBalance])

    const loadWinningsBalance = useCallback(async(userAdd) => {
        try {
            let config = {from: userAdd}
            let bal = await coinflip.methods.getWinningsBalance().call(config)
            setWinningsBalance(Number.parseFloat(web3.utils.fromWei(bal)).toPrecision(3));
        } catch (error) {
            setErrorMessage('Failed to load winnings balance: ' + error.message);
        }
    }, [setWinningsBalance])

    const loadOwner = useCallback(async() => {
        try {
            let theOwner = await coinflip.methods.owner().call()
            setOwner(theOwner)
            return theOwner
        } catch (error) {
            setErrorMessage('Failed to load owner: ' + error.message);
        }
    }, [setOwner])

    const loadUserData = useCallback(async() => {
            try {
                await loadUserAddress().then(response => {
                    setUserAddress(response)
                    loadUserBalance(response)
                    loadWinningsBalance(response)
                })
            } catch (error) {
                setErrorMessage('Failed to load user data: ' + error.message);
            }
        },
        [loadUserAddress,
            setUserAddress,
            loadUserBalance,
            loadWinningsBalance
        ])

    useEffect(() => {
        loadUserData()
    }, [loadUserData, userAddress])

    useEffect(() => {
        fetchNetwork()
        loadContractBalance()
        loadOwner().then(response => {
            setOwner(response)
        })
    }, [network, fetchNetwork, loadContractBalance, loadOwner, setOwner])

    useEffect(() => {
        if(userAddress){
            if(userAddress.length !== 0 && owner.length !== 0){
                if(userAddress === owner){
                    setIsOwner(true)
                } else {
                    setIsOwner(false)
                }
            }
        }
    }, [userAddress, owner, setIsOwner])

    const flip = async(oneZero, bet) => {
        try {
            setAwaitingCallbackResponse(false)
            let guess = oneZero
            let betAmt = bet
            let config = {
                value: web3.utils.toWei(betAmt, 'ether'),
                from: userAddress
            }
            coinflip.methods.flip(guess).send(config)
                .on('receipt', function(receipt){
                    setSentQueryId(receipt.events.sentQueryId.returnValues[1])
                    setAwaitingCallbackResponse(true)
                })
        } catch (error) {
            setErrorMessage('Failed to flip the coin: ' + error.message);
        }
    }

    const modalMessageReset = () => {
        setModalIsOpen(false)
        setOutcomeMessage('')
    }

    useEffect(() => {
        if(awaitingCallbackResponse){
            coinflip.events.callbackReceived({
                fromBlock: 'latest'
            }, function(error, event){
                if(event.returnValues[0] === sentQueryId){
                    if(event.returnValues[1] === 'Winner'){
                        setOutcomeMessage('You Won ' + web3.utils.fromWei(event.returnValues[2]) + ' ETH!')
                        loadWinningsBalance(userAddress)
                        loadContractBalance()
                    } else {
                        setOutcomeMessage('You lost ' + web3.utils.fromWei(event.returnValues[2]) + ' ETH...')
                        loadWinningsBalance(userAddress)
                        loadContractBalance()
                    }
                }
                setAwaitingCallbackResponse(false)
            }).on('error', function(error) {
                setErrorMessage('Error receiving callback: ' + error.message);
                setAwaitingCallbackResponse(false);
            });
            setSentQueryId('')
        }
    }, [
        userAddress,
        awaitingCallbackResponse,
        sentQueryId,
        contractBalance,
        loadContractBalance,
        loadWinningsBalance,
        setAwaitingCallbackResponse,
        setSentQueryId
    ])

    const withdrawUserWinnings = () => {
        try {
            var balance = winningsBalance
            coinflip.methods.withdrawUserWinnings().send(balance, {from: userAddress})
            setAwaitingWithdrawal(true)
        } catch (error) {
            setErrorMessage('Failed to withdraw winnings: ' + error.message);
        }
    }

    const fundContract = (x) => {
        try {
            let fundAmt = x
            let config = {
                value: web3.utils.toWei(fundAmt, 'ether'),
                from: userAddress
            }
            coinflip.methods.fundContract().send(config)
                .once('receipt', function(receipt){
                    loadContractBalance()
                    loadUserBalance(userAddress)
                })
        } catch (error) {
            setErrorMessage('Failed to fund contract: ' + error.message);
        }
    }

    const fundWinnings = (x) => {
        try {
            let fundAmt = x
            let config = {
                value: web3.utils.toWei(fundAmt, 'ether'),
                from: userAddress
            }
            coinflip.methods.fundWinnings().send(config)
                .once('receipt', function(receipt){
                    loadWinningsBalance(userAddress)
                    loadUserBalance(userAddress)
                })
        } catch (error) {
            setErrorMessage('Failed to fund winnings: ' + error.message);
        }
    }

    const withdrawAll = () => {
        try {
            var balance = contractBalance
            coinflip.methods.withdrawAll().send(balance, {from: userAddress})
                .on('receipt', function(receipt){
                    loadContractBalance()
                    loadUserBalance(userAddress)
                })
        } catch (error) {
            setErrorMessage('Failed to withdraw all funds: ' + error.message);
        }
    }

    useEffect(() => {
        if(awaitingWithdrawal){
            coinflip.events.userWithdrawal({
                fromBlock:'latest'
            }, function(error, event){
                if(event.returnValues[0] === userAddress){
                    setOutcomeMessage(web3.utils.fromWei(event.returnValues[1]) + ' ETH Successfully Withdrawn')
                    loadWinningsBalance()
                    loadUserBalance(userAddress)
                }
            }).on('error', function(error) {
                setErrorMessage('Error during user withdrawal: ' + error.message);
                setAwaitingWithdrawal(false);
            });
            setAwaitingWithdrawal(false)
        }
    }, [awaitingWithdrawal, winningsBalance, userBalance, userAddress, loadUserBalance, loadWinningsBalance, setAwaitingWithdrawal])

    useEffect(() => {
        if(outcomeMessage !== ''){
            setModalIsOpen(true)
        }
        return
    }, [outcomeMessage])

    return (
        <div>
            <NavBar />
            {errorMessage && <div style={{color: 'red'}}>{errorMessage}</div>} {/* Display error messages */}
            <ModalWindow open={modalIsOpen}
                         onClose={() => modalMessageReset()
                         }>
                {outcomeMessage}
            </ModalWindow>
            <AlignContent>
                <AlignQuarter>
                    <Directions />
                </AlignQuarter>
                <AlignHalf>
                    <ContractBalance />
                    <MainCard
                        withdrawUserWinnings={withdrawUserWinnings}
                        flipCoin={flip}
                    />
                </AlignHalf>
                <AlignQuarter>
                    <OwnerScreen
                        fundContract={fundContract}
                        fundWinnings={fundWinnings}
                        withdrawAll={withdrawAll}
                    />
                </AlignQuarter>
            </AlignContent>
        </div>
    )
}
