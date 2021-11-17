import { ethers, getDefaultProvider } from 'ethers'
import { Interface } from 'ethers/lib/utils'
import { useCallback, useEffect, useState } from 'react'
import { useToasts } from '../../../../hooks/toasts'
import ERC20Abi from 'adex-protocol-eth/abi/ERC20.json'
import AAVELendingPoolAbi from '../../../../consts/AAVELendingPoolAbi'
import AAVELendingPoolProviders from '../../../../consts/AAVELendingPoolProviders'
import networks from '../../../../consts/networks'

import AAVE_ICON from '../../../../resources/aave.svg'
import Card from './Card/Card'

const ERC20Interface = new Interface(ERC20Abi)
const AAVELendingPool = new Interface(AAVELendingPoolAbi)
const RAY = 10**27
let lendingPoolAddress = null

const AAVECard = ({ networkId, tokens, protocols, account, addRequest }) => {
    const { addToast } = useToasts()

    const [isLoading, setLoading] = useState(true)
    const [unavailable, setUnavailable] = useState(false)
    const [tokensItems, setTokensItems] = useState([])
    const [details, setDetails] = useState([])

    const onTokenSelect = useCallback(async (value) => {
        const token = tokensItems.find(({ address }) => address === value)
        if (token) {
            setDetails([
                ['Annual Percentage Rate (APR)', `${token.apr}%`],
                ['Lock', 'No Lock'],
                ['Type', 'Variable Rate'],
            ])
        }
    }, [tokensItems])

    const networkDetails = networks.find(({ id }) => id === networkId)
    const getToken = (type, address) => tokensItems.filter(token => token.type === type).find(token => token.address === address)
    const addRequestTxn = (id, txn, extraGas = 0) => addRequest({ id, type: 'eth_sendTransaction', chainId: networkDetails.chainId, account, txn, extraGas })

    const approveToken = async (tokenAddress, bigNumberHexAmount) => {
        try {
            const ZERO = ethers.BigNumber.from(0)
            const provider = getDefaultProvider(networkDetails.rpc)
            const tokenContract = new ethers.Contract(tokenAddress, ERC20Interface, provider)
            const allowance = await tokenContract.allowance(account, tokenAddress)

            if (allowance.lt(bigNumberHexAmount)) {
                if (allowance.gt(ZERO)) {
                    addRequestTxn(`aave_pool_approve_${Date.now()}`, {
                        to: lendingPoolAddress,
                        value: bigNumberHexAmount,
                        data: '0x'
                    })
                }
                addRequestTxn(`aave_pool_approve_${Date.now()}`, {
                    to: tokenAddress,
                    value: '0x0',
                    data: ERC20Interface.encodeFunctionData('approve', [lendingPoolAddress, bigNumberHexAmount])
                })
            }
        } catch(e) {
            console.error(e)
            addToast(`Error: ${e.message || e}`, { error: true })
        }
    }

    const onValidate = async (type, tokenAddress, amount) => {
        if (type === 'Deposit') {
            const token = getToken('deposit', tokenAddress)
            const bigNumberHexAmount = ethers.utils.parseUnits(amount.toString(), token.decimals).toHexString()
            await approveToken(tokenAddress, bigNumberHexAmount)

            try {
                addRequestTxn(`aave_pool_deposit_${Date.now()}`, {
                    to: lendingPoolAddress,
                    value: '0x0',
                    data: AAVELendingPool.encodeFunctionData('deposit', [tokenAddress, bigNumberHexAmount, account, 0])
                }, 60000)
            } catch(e) {
                console.error(e)
                addToast(`Error: ${e.message || e}`, { error: true })
            }
        }
        else if (type === 'Withdraw') {
            const token = getToken('withdraw', tokenAddress)
            const bigNumberHexAmount = ethers.utils.parseUnits(amount.toString(), token.decimals).toHexString()
            await approveToken(tokenAddress, bigNumberHexAmount)

            try {
                addRequestTxn(`aave_pool_withdraw_${Date.now()}`, {
                    to: lendingPoolAddress,
                    value: '0x0',
                    data: AAVELendingPool.encodeFunctionData('withdraw', [tokenAddress, bigNumberHexAmount, account])
                }, 60000)
            } catch(e) {
                console.error(e)
                addToast(`Error: ${e.message || e}`, { error: true })
            }
        }
    }

    const loadPool = useCallback(async () => {
        const providerAddress = AAVELendingPoolProviders[networkDetails.id]
        if (!providerAddress) {
            setLoading(false)
            setUnavailable(true)
            return
        }

        try {
            const provider = getDefaultProvider(networkDetails.rpc)
            const lendingPoolProviderContract = new ethers.Contract(providerAddress, AAVELendingPool, provider)
            lendingPoolAddress = await lendingPoolProviderContract.getLendingPool()
        
            const lendingPoolContract = new ethers.Contract(lendingPoolAddress, AAVELendingPool, provider)
            const reserves = await lendingPoolContract.getReservesList()
            const reservesAddresses = reserves.map(reserve => reserve.toLowerCase())

            const withdrawTokens = (protocols.find(({ label }) => label === 'Aave V2')?.assets || [])
                .map(({ tokens }) => tokens.map(({ img, symbol, tokens }) => tokens.map(token => ({
                    ...token,
                    img,
                    symbol,
                    type: 'withdraw'
                }))))
                .flat(2)

            const depositTokens = tokens.filter(({ address }) => reservesAddresses.includes(address)).map(token => ({
                ...token,
                type: 'deposit'
            }))

            const tokensItems = (await Promise.all([
                ...withdrawTokens,
                ...depositTokens
            ].map(async token => {
                const data = await lendingPoolContract.getReserveData(token.address)
                const { liquidityRate } = data
                return {
                    ...token,
                    apr: ((liquidityRate / RAY) * 100).toFixed(2)
                }
            })))
            .map(({ type, img, symbol, address, balance, decimals, apr }) => ({
                icon: img,
                label: `${symbol} (${apr}% APR)`,
                value: address,
                type,
                address,
                balance,
                symbol,
                decimals,
                apr
            }))

            setTokensItems(tokensItems)
            setLoading(false)
            setUnavailable(false)
        } catch(e) {
            console.error(e);
            addToast(e.message | e, { error: true })
        }
    }, [addToast, protocols, tokens, networkDetails.id, networkDetails.rpc])

    useEffect(() => loadPool(), [loadPool])
    useEffect(() => setLoading(true), [networkId])

    return (
        <Card loading={isLoading} unavailable={unavailable} icon={AAVE_ICON} details={details} tokensItems={tokensItems} onTokenSelect={onTokenSelect} onValidate={onValidate}/>
    )
}

export default AAVECard