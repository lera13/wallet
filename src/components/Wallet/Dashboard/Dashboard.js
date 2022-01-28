import './Dashboard.scss'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'

import { Chart, Loading, Segments } from 'components/common'
import Balances from './Balances/Balances'
import Protocols from './Protocols/Protocols'
import Collectibles from './Collectibles/Collectibles'
import { MdOutlineInfo } from 'react-icons/md'

const chartSegments = [
    {
        value: 'Tokens'
    },
    {
        value: 'Protocols'
    }
]

const tabSegments = [
    {
        value: 'tokens'
    },
    {
        value: 'collectibles'
    }
]

export default function Dashboard({ portfolio, selectedNetwork, selectedAccount, setNetwork, privateMode }) {
    const history = useHistory()
    const { tabId } = useParams()

    const [chartTokensData, setChartTokensData] = useState([]);
    const [chartProtocolsData, setChartProtocolsData] = useState([]);
    const [chartType, setChartType] = useState([]);
    const [tab, setTab] = useState(tabId || tabSegments[0].value);

    useEffect(() => {
        if (!tab || tab === tabSegments[0].value) return history.replace(`/wallet/dashboard`)
        history.replace(`/wallet/dashboard/${tab}`)
    }, [tab, history])

    useLayoutEffect(() => {
        const tokensData = portfolio.tokens
            .map(({ label, symbol, balanceUSD }) => ({
                label: label || symbol,
                value: Number(((balanceUSD / portfolio.balance.total.full) * 100).toFixed(2))
            }))
            .filter(({ value }) => value > 0);

        const totalProtocols = portfolio.protocols.map(({ assets }) => 
            assets
                .map(({ balanceUSD }) => balanceUSD)
                .reduce((acc, curr) => acc + curr, 0))
            .reduce((acc, curr) => acc + curr, 0)

        const protocolsData = portfolio.protocols
            .map(({ label, assets }) => ({
                label,
                value: Number(((assets.map(({ balanceUSD }) => balanceUSD).reduce((acc, curr) => acc + curr, 0) / totalProtocols) * 100).toFixed(2))
            }))
            .filter(({ value }) => value > 0)

        setChartTokensData(tokensData);
        setChartProtocolsData(protocolsData)
    }, [portfolio.balance, portfolio.tokens, portfolio.protocols]);

    useEffect(() => portfolio.requestOtherProtocolsRefresh(), [portfolio])

    return (
        <section id="dashboard">
	    <div className="notice" style={{ fontWeight: 'bold', backgroundColor: 'rgb(4, 73, 54)', padding: '15px 30px', fontSize: '1.1em' }}>
		<a target="_blank" href="https://blog.ambire.com/wallet-to-get-listed-for-trading-after-primelist-event-on-huobi-91c1acec0a7e" rel="noopener noreferrer">$WALLET listing on Huobi is around the corner! Click to more about the TGE.</a>
	    </div>
            <div id="overview">
                <div id="balance" className="panel">
                    <div className="title">Balance</div>
                    <div className="content">
                        {
                            portfolio.isBalanceLoading ? 
                                <Loading/>
                                :
                                <Balances
                                    portfolio={portfolio}
                                    selectedNetwork={selectedNetwork}
                                    setNetwork={setNetwork}
                                    hidePrivateValue={privateMode.hidePrivateValue}
                                />
                        }
                    </div>
                </div>
                <div id="chart" className="panel">
                    <div className="title">
                        Balance by
                        <Segments small defaultValue={chartSegments[0].value} segments={chartSegments} onChange={setChartType}/>
                    </div>
                    <div className="content">
                        {
                            chartType === chartSegments[0].value ?
                                portfolio.isBalanceLoading ?
                                    <Loading/>
                                    :
                                    privateMode.hidePrivateContent(<Chart data={chartTokensData} size={200}/>)
                                :
                                portfolio.areProtocolsLoading ?
                                    <Loading/>
                                    :
                                    privateMode.hidePrivateContent(<Chart data={chartProtocolsData} size={200}/>)
                        }
                    </div>
                </div>
            </div>
            <div id="table" className="panel">
                <div className="title">
                    Assets
                    <Segments small defaultValue={tab} segments={tabSegments} onChange={setTab}></Segments>
                </div>
                <div className="content">
                    {
                        tab === tabSegments[0].value ?
                            <Protocols
                                portfolio={portfolio}
                                network={selectedNetwork}
                                account={selectedAccount}
                                hidePrivateValue={privateMode.hidePrivateValue}
                            />
                            :
                            <Collectibles portfolio={portfolio} isPrivateMode={privateMode.isPrivateMode} />
                    }
                </div>
                <div className="footer">
                    <div id="missing-token-notice">
                        <MdOutlineInfo/>
                        <span>
                            If you don't see a specific token that you own, please check the <a href={`${selectedNetwork.explorerUrl}/address/${selectedAccount}`} target="_blank" rel="noreferrer">Block Explorer</a>
                        </span>
                    </div>
                    {
                        portfolio.areProtocolsLoading || !portfolio.protocols.length ?
                            null
                            :
                            <div className="powered">
                                Powered by Velcro
                            </div>
                    }
                </div>
            </div>
        </section>
    )
}
