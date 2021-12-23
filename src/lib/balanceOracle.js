import { ethers, getDefaultProvider } from 'ethers'
import networks from '../consts/networks'
import oracle from 'adex-protocol-eth/abi/RemainingBalancesOracle.json'
const { Interface, AbiCoder, formatUnits, hexlify, isAddress } = ethers.utils
const RemainingBalancesOracle = new Interface(oracle)
const SPOOFER = '0x0000000000000000000000000000000000000001'
const blockTag = 'pending'
const remainingBalancesOracleAddr = '0xF1628de74193Dde3Eed716aB0Ef31Ca2b6347eB1'

// Signature of Error(string)
const ERROR_SIG = '0x08c379a0'
// Signature of Panic(uint256)
const PANIC_SIG = '0x4e487b71'

async function getTokenListBalance ({walletAddr, tokens, network, updateBalance}) {
  let result = await call ( {walletAddr, tokens, network} )
  if (result.success) {
    const newBalance = tokens.map(t => {
      const newTokenBalance = result.data.filter(r => r.address === t.address && parseFloat(r.balance) > 0)[0]
      return (newTokenBalance ? {
        "type": "base",
        "network": network,
        "address": newTokenBalance.address,
        "decimals": newTokenBalance.decimals,
        "symbol": newTokenBalance.symbol,
        "price": newTokenBalance.price || 0,
        "balance": Number(newTokenBalance.balance),
        "balanceRaw": newTokenBalance.balanceRaw,
        "updateAt": (new Date()).toString(),
        "balanceUSD": Number(parseFloat(newTokenBalance.price * newTokenBalance.balance || 0).toFixed(2)),
        "tokenImageUrl": newTokenBalance.tokenImageUrl || `https://storage.googleapis.com/zapper-fi-assets/tokens/${network}/${newTokenBalance.address}.png`
      } : t)
    }).filter (t => t && t.balance && parseFloat(t.balance) > 0)
    if (updateBalance && typeof updateBalance === 'function') updateBalance(newBalance)
    return newBalance
  } else {
    console.error(result.message, result.data)
    return tokens
  }
}

//ToDo check for missing data and double check for incompleted returns
async function call ({ walletAddr, tokens, network }) {
  if (!isAddress(walletAddr)) return {success: false, data: walletAddr, message:`Wallet address is not valide eth address`}
  const provider = getDefaultProvider(networks.filter(n => n.id===network)[0]?.rpc || null)
  const coder = new AbiCoder()
  const args = [
    // identityFactoryAddr
    '0xBf07a0Df119Ca234634588fbDb5625594E2a5BCA',
    // bytecode dummy.sol
    '0x6080604052348015600f57600080fd5b50604880601d6000396000f3fe6080604052348015600f57600080fd5b5000fea2646970667358221220face6a0e4f251ee8ded32eb829598230ad218691166fa0a46bc85583c202c60c64736f6c634300080a0033',
    // salt
    '0x0000000000000000000000000000000000000000000000000000000000000001',
    // txns
    [['0x0000000000000000000000000000000000000000', '0x0', '0x0000000000000000000000000000000000000000']],
    '0x000000000000000000000000000000000000000000000000000000000000000000',
    walletAddr,
    tokens.map(x => x.address)
  ]
  const txParams = {
    from: SPOOFER,
    to: remainingBalancesOracleAddr,
    data: RemainingBalancesOracle.encodeFunctionData('getRemainingBalances', args)
  }
  try {
    const callResult = await provider.call(txParams, blockTag)
    // @TODO: would be more appropriate to throw here
    if (isErr(callResult)) return {success: false, data: tokens, message: `probably one ot following tokens is not ERC20 and missing balanceOf()`} //hex2a(callResult)
    const balances = coder.decode(['uint[]'], callResult)[0]
    const result = tokens.map((x, i) => ({ ...x, balanceRaw: balances[i].toString(), balance: parseFloat(formatUnits(balances[i], x.decimals)).toFixed(10) }))
    return {success: true, data: result}
  } catch(e){
    return {success: false, data: tokens, message: `probably one ot following tokens is not ERC20 and missing balanceOf()`}
  }
}
 
function isErr (hex) {
	return hex.startsWith(ERROR_SIG) || hex.startsWith(PANIC_SIG)
}

async function getErrMsg (provider, txParams, blockTag) {
	// .call always returns a hex string with ethers
	try {
		// uncomment if you need HEVM debugging
		// console.log(`hevm exec --caller ${txParams.from} --address ${txParams.to} --calldata ${txParams.data} --gas 1000000 --debug --rpc ${provider.connection.rpc} ${!isNaN(blockTag) && blockTag ? '--block '+blockTag : ''}`)
		const returnData = await provider.call(txParams, blockTag)
		return isErr(returnData)
			? (new AbiCoder()).decode(['string'], '0x' + returnData.slice(10))[0]
			: returnData
	} catch (e) {
		// weird infura case
		if (e.code === 'UNPREDICTABLE_GAS_LIMIT' && e.error) return e.error.message.slice(20)
		if (e.code === 'CALL_EXCEPTION') return 'no error string, possibly insufficient amount or wrong SmartWallet sig'
		if (e.code === 'INVALID_ARGUMENT') return `unable to deserialize: ${hexlify(e.value)}`
		throw e
	}
}

const tokenList = { 
  "ethereum": [
    { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", coingeckoId: null, decimals: 18 },
    { address: "0xade00c28244d5ce17d72e40330b1c318cd12b7c3", symbol: "ADX", coingeckoId: "adex", decimals: 18 },
    { address: "0xb6456b57f03352be48bf101b46c1752a0813491a", symbol: "ADX-STAKING", decimals: 18 },
    { address: "0xd9a4cb9dc9296e111c66dfacab8be034ee2e1c2c", symbol: "ADX-LOYALTY", decimals: 18 },
    { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT", decimals: 6, coingeckoId: "tether" },
    { address: "0x4fabb145d64652a948d72533023f6e7a623c7c53", symbol: "BUSD", decimals: 18, coingeckoId: "binance-usd" },
    { address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", symbol: "MATIC", decimals: 18, coingeckoId: "matic-network" },
    { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", decimals: 6, coingeckoId: "usd-coin" },
    { address: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce", symbol: "SHIB", decimals: 18, coingeckoId: "shiba-inu" },
    { address: "0xfe39e6a32acd2af7955cb3d406ba2b55c901f247", symbol: "ZT", decimals: 18, coingeckoId: "ztcoin" },
    { address: "0xfcf8eda095e37a41e002e266daad7efc1579bc0a", symbol: "FLEX", decimals: 18, coingeckoId: "flex-coin" },
    { address: "0x514910771af9ca656af840dff83e8264ecf986ca", symbol: "LINK", decimals: 18, coingeckoId: "chainlink" },
    { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", symbol: "WETH", decimals: 18, coingeckoId: "weth" },
    { address: "0xd533a949740bb3306d119cc777fa900ba034cd52", symbol: "CRV", decimals: 18, coingeckoId: "curve-dao-token" },
    { address: "0x4e15361fd6b4bb609fa63c81a2be19d873717870", symbol: "FTM", decimals: 18, coingeckoId: "fantom" },
    { address: "0xd26114cd6ee289accf82350c8d8487fedb8a0c07", symbol: "OMG", decimals: 18, coingeckoId: "omisego" },
    { address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", symbol: "AAVE", decimals: 18, coingeckoId: "aave" },
    { address: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2", symbol: "SUSHI", decimals: 18, coingeckoId: "sushi" },
    { address: "0x15d4c048f83bd7e37d49ea4c83a07267ec4203da", symbol: "GALA", decimals: 8, coingeckoId: "gala" },
    { address: "0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3", symbol: "MIM", decimals: 18, coingeckoId: "magic-internet-money" },
    { address: "0x3845badade8e6dff049820680d1f14bd3903a5d0", symbol: "SAND", decimals: 18, coingeckoId: "the-sandbox" },
    { address: "0x7a58c0be72be218b41c608b7fe7c5bb630736c71", symbol: "PEOPLE", decimals: 18, coingeckoId: "constitutiondao" },
    { address: "0x1f3f677ecc58f6a1f9e2cf410df4776a8546b5de", symbol: "VNDC", decimals: 0, coingeckoId: "vndc" },
    { address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", symbol: "UNI", decimals: 18, coingeckoId: "uniswap" },
    { address: "0x0f5d2fb29fb7d3cfee444a200298f468908cc942", symbol: "MANA", decimals: 18, coingeckoId: "decentraland" },
    { address: "0x6b175474e89094c44da98b954eedeac495271d0f", symbol: "DAI", decimals: 18, coingeckoId: "dai" },
    { address: "0x75231f58b43240c9718dd58b4967c5114342a86c", symbol: "OKB", decimals: 18, coingeckoId: "okb" },
    { address: "0xef40b859d21e4d566a3d713e756197c021bffaaa", symbol: "NFT", decimals: 6, coingeckoId: "apenft" },
    { address: "0xbb0e17ef65f82ab018d8edd776e8dd940327b28b", symbol: "AXS", decimals: 18, coingeckoId: "axie-infinity" },
    { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", symbol: "WBTC", decimals: 8, coingeckoId: "wrapped-bitcoin" },
    { address: "0x408e41876cccdc0f92210600ef50372656052a38", symbol: "REN", decimals: 18, coingeckoId: "republic-protocol" },
    { address: "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e", symbol: "YFI", decimals: 18, coingeckoId: "yearn-finance" },
    { address: "0xbbbbca6a901c926f240b89eacb641d8aec7aeafd", symbol: "LRC", decimals: 18, coingeckoId: "loopring" },
    { address: "0x0d8775f648430679a709e98d2b0cb6250d2887ef", symbol: "BAT", decimals: 18, coingeckoId: "basic-attention-token" },
    { address: "0xddb3422497e61e13543bea06989c0789117555c5", symbol: "COTI", decimals: 18, coingeckoId: "coti" },
    { address: "0x090185f2135308bad17527004364ebcc2d37e5f6", symbol: "SPELL", decimals: 18, coingeckoId: "spell-token" },
    { address: "0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b", symbol: "CRO", decimals: 8, coingeckoId: "crypto-com-chain" },
    { address: "0xa47c8bf37f92abed4a126bda807a7b7498661acd", symbol: "UST", decimals: 18, coingeckoId: "terrausd" },
    { address: "0xa117000000f279d81a1d3cc75430faa017fa5a2e", symbol: "ANT", decimals: 18, coingeckoId: "aragon" },
    { address: "0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c", symbol: "ENJ", decimals: 18, coingeckoId: "enjincoin" },
    { address: "0x92d6c1e31e14520e676a687f0a93788b716beff5", symbol: "DYDX", decimals: 18, coingeckoId: "dydx" },
    { address: "0x111111111117dc0aa78b770fa6a738034120c302", symbol: "1INCH", decimals: 18, coingeckoId: "1inch" },
    { address: "0x7420b4b9a0110cdc71fb720908340c03f9bc03ec", symbol: "JASMY", decimals: 18, coingeckoId: "jasmycoin" },
    { address: "0xb64ef51c888972c908cfacf59b47c1afbc0ab8ac", symbol: "STORJ", decimals: 8, coingeckoId: "storj" },
    { address: "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72", symbol: "ENS", decimals: 18, coingeckoId: "ethereum-name-service" },
    { address: "0x1a4b46696b2bb4794eb3d4c26f1c55f9170fa4c5", symbol: "BIT", decimals: 18, coingeckoId: "bitdao" },
    { address: "0x26fb86579e371c7aedc461b2ddef0a8628c93d3b", symbol: "BORA", decimals: 18, coingeckoId: "bora" },
    { address: "0xc00e94cb662c3520282e6f5717214004a7f26888", symbol: "COMP", decimals: 18, coingeckoId: "compound-governance-token" },
    { address: "0xac51066d7bec65dc4589368da368b212745d63e8", symbol: "ALICE", decimals: 6, coingeckoId: "my-neighbor-alice" },
    { address: "0x1c48f86ae57291f7686349f12601910bd8d470bb", symbol: "USDK", decimals: 18, coingeckoId: "usdk" },
    { address: "0xc944e90c64b2c07662a292be6244bdf05cda44a7", symbol: "GRT", decimals: 18, coingeckoId: "the-graph" },
    { address: "0x967da4048cd07ab37855c090aaf366e4ce1b9f48", symbol: "OCEAN", decimals: 18, coingeckoId: "ocean-protocol" },
    { address: "0x6f259637dcd74c767781e37bc6133cd6a68aa161", symbol: "HT", decimals: 18, coingeckoId: "huobi-token" },
    { address: "0x6c6ee5e31d828de241282b9606c8e98ea48526e2", symbol: "HOT", decimals: 18, coingeckoId: "holotoken" },
    { address: "0x0000000000085d4780b73119b644ae5ecd22b376", symbol: "TUSD", decimals: 18, coingeckoId: "true-usd" },
    { address: "0x3506424f91fd33084466f402d5d97f05f8e3b4af", symbol: "CHZ", decimals: 18, coingeckoId: "chiliz" },
    { address: "0x9d91be44c06d373a8a226e1f3b146956083803eb", symbol: "AKNC", decimals: 18, coingeckoId: "aave-knc-v1" },
    { address: "0x1cf4592ebffd730c7dc92c1bdffdfc3b9efcf29a", symbol: "WAVES", decimals: 18, coingeckoId: "waves" },
    { address: "0x12bb890508c125661e03b09ec06e404bc9289040", symbol: "RACA", decimals: 18, coingeckoId: "radio-caca" },
    { address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f", symbol: "SNX", decimals: 18, coingeckoId: "havven" },
    { address: "0x476c5e26a75bd202a9683ffd34359c0cc15be0ff", symbol: "SRM", decimals: 6, coingeckoId: "serum" },
    { address: "0xd2877702675e6ceb975b4a1dff9fb7baf4c91ea9", symbol: "LUNA", decimals: 18, coingeckoId: "wrapped-terra" },
    { address: "0x383518188c0c6d7730d91b2c03a03c837814a899", symbol: "OHM", decimals: 9, coingeckoId: "olympus" },
    { address: "0x8a2279d4a90b6fe1c4b30fa660cc9f926797baa2", symbol: "CHR", decimals: 6, coingeckoId: "chromaway" },
    { address: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f", symbol: "GTC", decimals: 18, coingeckoId: "gitcoin" },
    { address: "0x4f9254c83eb525f9fcf346490bbb3ed28a81c667", symbol: "CELR", decimals: 18, coingeckoId: "celer-network" },
    { address: "0x940a2db1b7008b6c776d4faaca729d6d4a4aa551", symbol: "DUSK", decimals: 18, coingeckoId: "dusk-network" },
    { address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", symbol: "MKR", decimals: 18, coingeckoId: "maker" },
    { address: "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b", symbol: "CVX", decimals: 18, coingeckoId: "convex-finance" },
    { address: "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24", symbol: "RNDR", decimals: 18, coingeckoId: "render-token" },
    { address: "0xe41d2489571d322189246dafa5ebde1f4699f498", symbol: "ZRX", decimals: 18, coingeckoId: "0x" },
    { address: "0x25f8087ead173b73d6e8b84329989a8eea16cf73", symbol: "YGG", decimals: 18, coingeckoId: "yield-guild-games" },
    { address: "0x50d1c9771902476076ecfc8b2a83ad6b9355a4c9", symbol: "FTT", decimals: 18, coingeckoId: "ftx-token" },
    { address: "0x3db6ba6ab6f95efed1a6e794cad492faaabf294d", symbol: "LTO", decimals: 8, coingeckoId: "lto-network" },
    { address: "0x8ce9137d39326ad0cd6491fb5cc0cba0e089b6a9", symbol: "SXP", decimals: 18, coingeckoId: "swipe" },
    { address: "0x5f98805a4e8be255a32880fdec7f6728c6568ba0", symbol: "LUSD", decimals: 18, coingeckoId: "liquity-usd" },
    { address: "0xdf574c24545e5ffecb9a659c229253d4111d87e1", symbol: "HUSD", decimals: 8, coingeckoId: "husd" },
    { address: "0xcc8fa225d80b9c7d42f96e9570156c65d6caaa25", symbol: "SLP", decimals: 0, coingeckoId: "smooth-love-potion" },
    { address: "0x58b6a8a3302369daec383334672404ee733ab239", symbol: "LPT", decimals: 18, coingeckoId: "livepeer" },
    { address: "0x888888848b652b3e3a0f34c96e00eec0f3a23f72", symbol: "TLM", decimals: 4, coingeckoId: "alien-worlds" },
    { address: "0x8290333cef9e6d528dd5618fb97a76f268f3edd4", symbol: "ANKR", decimals: 18, coingeckoId: "ankr" },
    { address: "0x39aa39c021dfbae8fac545936693ac917d5e7563", symbol: "CUSDC", decimals: 8, coingeckoId: "compound-usd-coin" },
    { address: "0x35a18000230da775cac24873d00ff85bccded550", symbol: "CUNI", decimals: 8, coingeckoId: "compound-uniswap" },
    { address: "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c", symbol: "BNT", decimals: 18, coingeckoId: "bancor" },
    { address: "0x10633216e7e8281e33c86f02bf8e565a635d9770", symbol: "DVI", decimals: 18, coingeckoId: "dvision-network" },
    { address: "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff", symbol: "IMX", decimals: 18, coingeckoId: "immutable-x" },
    { address: "0x4123a133ae3c521fd134d7b13a2dec35b56c2463", symbol: "QRDO", decimals: 8, coingeckoId: "qredo" },
    { address: "0xae12c5930881c53715b369cec7606b70d8eb229f", symbol: "C98", decimals: 18, coingeckoId: "coin98" },
    { address: "0xf16e81dce15b08f326220742020379b855b87df9", symbol: "ICE", decimals: 18, coingeckoId: "ice-token" },
    { address: "0x491604c0fdf08347dd1fa4ee062a822a5dd06b5d", symbol: "CTSI", decimals: 18, coingeckoId: "cartesi" },
    { address: "0x956f47f50a910163d8bf957cf5846d573e7f87ca", symbol: "FEI", decimals: 18, coingeckoId: "fei-usd" },
    { address: "0x8762db106b2c2a0bccb3a80d1ed41273552616e8", symbol: "RSR", decimals: 18, coingeckoId: "reserve-rights-token" },
    { address: "0x69af81e73a73b40adf4f3d4223cd9b1ece623074", symbol: "MASK", decimals: 18, coingeckoId: "mask-network" },
    { address: "0x6123b0049f904d730db3c36a31167d9d4121fa6b", symbol: "RBN", decimals: 18, coingeckoId: "ribbon-finance" },
    { address: "0xba100000625a3754423978a60c9317c58a424e3d", symbol: "BAL", decimals: 18, coingeckoId: "balancer" },
    { address: "0xc07a150ecadf2cc352f5586396e344a6b17625eb", symbol: "BIOT", decimals: 9, coingeckoId: "biopassport" },
    { address: "0x43dfc4159d86f3a37a5a4b3d4580b888ad7d4ddd", symbol: "DODO", decimals: 18, coingeckoId: "dodo" },
    { address: "0x761d38e5ddf6ccf6cf7c55759d5210750b5d60f3", symbol: "ELON", decimals: 18, coingeckoId: "dogelon-mars" },
    { address: "0x081131434f93063751813c619ecca9c4dc7862a3", symbol: "DAR", decimals: 6, coingeckoId: "mines-of-dalarnia" },
    { address: "0xf411903cbc70a74d22900a5de66a2dda66507255", symbol: "VRA", decimals: 18, coingeckoId: "verasity" },
    { address: "0x9534ad65fb398e27ac8f4251dae1780b989d136e", symbol: "PYR", decimals: 18, coingeckoId: "vulcan-forged" },
    { address: "0x8f8221afbb33998d8584a2b05749ba73c37a938a", symbol: "REQ", decimals: 18, coingeckoId: "request-network" },
    { address: "0xa2120b9e674d3fc3875f415a7df52e382f141225", symbol: "ATA", decimals: 18, coingeckoId: "automata" },
    { address: "0x9aab071b4129b083b01cb5a0cb513ce7eca26fa5", symbol: "HUNT", decimals: 18, coingeckoId: "hunt-token" },
    { address: "0x6fb0855c404e09c47c3fbca25f08d4e41f9f062f", symbol: "AZRX", decimals: 18, coingeckoId: "aave-zrx-v1" },
    { address: "0x9ba00d6856a4edf4665bca2c2309936572473b7e", symbol: "AUSDC", decimals: 6, coingeckoId: "aave-usdc-v1" },
    { address: "0xfc4b8ed459e00e5400be803a9bb3954234fd50e3", symbol: "AWBTC", decimals: 8, coingeckoId: "aave-wbtc-v1" },
    { address: "0x6ee0f7bb50a54ab5253da0667b0dc2ee526c30a8", symbol: "ABUSD", decimals: 18, coingeckoId: "aave-busd-v1" },
    { address: "0xffc97d72e13e01096502cb8eb52dee56f74dad7b", symbol: "AAAVE", decimals: 18, coingeckoId: "aave-aave" },
    { address: "0x3a3a65aab0dd2a17e3f1947ba16138cd37d08c04", symbol: "AETH", decimals: 18, coingeckoId: "aave-eth-v1" },
    { address: "0xfc1e690f61efd961294b3e1ce3313fbd8aa4f85d", symbol: "ADAI", decimals: 18, coingeckoId: "aave-dai-v1" },
    { address: "0x71fc860f7d3a592a4a98740e39db31d25db65ae8", symbol: "AUSDT", decimals: 6, coingeckoId: "aave-usdt-v1" },
    { address: "0x625ae63000f46200499120b906716420bd059240", symbol: "ASUSD", decimals: 18, coingeckoId: "aave-susd-v1" },
    { address: "0x6fce4a401b6b80ace52baaefe4421bd188e76f6f", symbol: "AMANA", decimals: 18, coingeckoId: "aave-mana-v1" },
    { address: "0x4da9b813057d04baef4e5800e36083717b4a0341", symbol: "ATUSD", decimals: 18, coingeckoId: "aave-tusd-v1" },
    { address: "0x7deb5e830be29f91e298ba5ff1356bb7f8146998", symbol: "AMKR", decimals: 18, coingeckoId: "aave-mkr-v1" },
    { address: "0x328c4c80bc7aca0834db37e6600a6c49e12da4de", symbol: "ASNX", decimals: 18, coingeckoId: "aave-snx-v1" },
    { address: "0xa64bd6c70cb9051f6a9ba1f163fdc07e0dfb5f84", symbol: "ALINK", decimals: 18, coingeckoId: "aave-link-v1" },
    { address: "0xe1ba0fb44ccb0d11b80f92f4f8ed94ca3ff51d00", symbol: "ABAT", decimals: 18, coingeckoId: "aave-bat-v1" },
    { address: "0x0ea20e7ffb006d4cfe84df2f72d8c7bd89247db0", symbol: "AAMMUNICRVWETH", decimals: 18, coingeckoId: "aave-amm-unicrvweth" },
    { address: "0xa1b0edf4460cc4d8bfaa18ed871bff15e5b57eb4", symbol: "AAMMUNIBATWETH", decimals: 18, coingeckoId: "aave-amm-unibatweth" },
    { address: "0x8dae6cb04688c62d939ed9b68d32bc62e49970b1", symbol: "ACRV", decimals: 18, coingeckoId: "aave-crv" },
    { address: "0x028171bca77440897b824ca71d1c56cac55b68a3", symbol: "ADAI", decimals: 18, coingeckoId: "aave-dai" },
    { address: "0x391e86e2c002c70dee155eaceb88f7a3c38f5976", symbol: "AAMMUNIUSDCWETH", decimals: 18, coingeckoId: "aave-amm-uniusdcweth" },
    { address: "0xc58f53a8adff2fb4eb16ed56635772075e2ee123", symbol: "AAMMUNIWBTCWETH", decimals: 18, coingeckoId: "aave-amm-uniwbtcweth" },
    { address: "0x2365a4890ed8965e564b7e2d27c38ba67fec4c6f", symbol: "AAMMUNIWBTCUSDC", decimals: 18, coingeckoId: "aave-amm-uniwbtcusdc" },
    { address: "0x370adc71f67f581158dc56f539df5f399128ddf9", symbol: "AAMMUNIMKRWETH", decimals: 18, coingeckoId: "aave-amm-unimkrweth" },
    { address: "0x3d26dcd840fcc8e4b2193ace8a092e4a65832f9f", symbol: "AAMMUNIUNIWETH", decimals: 18, coingeckoId: "aave-amm-uniuniweth" },
    { address: "0xd37ee7e4f452c6638c96536e68090de8cbcdb583", symbol: "AGUSD", decimals: 2, coingeckoId: "aave-gusd" },
    { address: "0x030ba81f1c18d280636f32af80b9aad02cf0854e", symbol: "AWETH", decimals: 18, coingeckoId: "aave-weth" },
    { address: "0x5165d24277cd063f5ac44efd447b27025e888f37", symbol: "AYFI", decimals: 18, coingeckoId: "aave-yfi" },
    { address: "0x17a79792fe6fe5c95dfe95fe3fcee3caf4fe4cb7", symbol: "AAMMUSDT", decimals: 6, coingeckoId: "aave-amm-usdt" },
    { address: "0x35f6b052c598d933d69a4eec4d04c73a191fe6c2", symbol: "ASNX", decimals: 18, coingeckoId: "aave-snx" },
    { address: "0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4", symbol: "AAMMDAI", decimals: 18, coingeckoId: "aave-amm-dai" },
    { address: "0x38e491a71291cd43e8de63b7253e482622184894", symbol: "AAMMUNISNXWETH", decimals: 18, coingeckoId: "aave-amm-unisnxweth" },
    { address: "0xbcca60bb61934080951369a648fb03df4f96263c", symbol: "AUSDC", decimals: 6, coingeckoId: "aave-usdc" },
    { address: "0xd24946147829deaa935be2ad85a3291dbf109c80", symbol: "AAMMUSDC", decimals: 6, coingeckoId: "aave-amm-usdc" },
    { address: "0xa685a61171bb30d4072b338c80cb7b2c865c873e", symbol: "AMANA", decimals: 18, coingeckoId: "aave-mana" },
    { address: "0x272f97b7a56a387ae942350bbc7df5700f8a4576", symbol: "ABAL", decimals: 18, coingeckoId: "aave-bal" },
    { address: "0xf256cc7847e919fac9b808cc216cac87ccf2f47a", symbol: "AXSUSHI", decimals: 18, coingeckoId: "aave-xsushi" },
    { address: "0x05ec93c0365baaeabf7aeffb0972ea7ecdd39cf1", symbol: "ABAT", decimals: 18, coingeckoId: "aave-bat" },
    { address: "0xc9bc48c72154ef3e5425641a3c747242112a46af", symbol: "ARAI", decimals: 18, coingeckoId: "aave-rai" },
    { address: "0xac6df26a590f08dcc95d5a4705ae8abbc88509ef", symbol: "AENJ", decimals: 18, coingeckoId: "aave-enj" },
    { address: "0x101cc05f4a51c0319f570d5e146a8c625198e636", symbol: "ATUSD", decimals: 18, coingeckoId: "aave-tusd" },
    { address: "0x39c6b3e42d6a679d7d776778fe880bc9487c2eda", symbol: "AKNC", decimals: 18, coingeckoId: "aave-knc" },
    { address: "0xd109b2a304587569c84308c55465cd9ff0317bfb", symbol: "AAMMBPTBALWETH", decimals: 18, coingeckoId: "aave-amm-bptbalweth" },
    { address: "0x3ed3b47dd13ec9a98b44e6204a523e766b225811", symbol: "AUSDT", decimals: 6, coingeckoId: "aave-usdt" },
    { address: "0x8ab7404063ec4dbcfd4598215992dc3f8ec853d7", symbol: "AKRO", decimals: 18, coingeckoId: "akropolis" },
    { address: "0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44", symbol: "KP3R", decimals: 18, coingeckoId: "keep3rv1" },
    { address: "0x38e4adb44ef08f22f5b5b76a8f0c2d0dcbe7dca1", symbol: "CVP", decimals: 18, coingeckoId: "concentrated-voting-power" },
    { address: "0x2ba592f78db6436527729929aaf6c908497cb200", symbol: "CREAM", decimals: 18, coingeckoId: "cream-2" },
    { address: "0x429881672b9ae42b8eba0e26cd9c73711b891ca5", symbol: "PICKLE", decimals: 18, coingeckoId: "pickle-finance" },
    { address: "0x8798249c2e607446efb7ad49ec89dd1865ff4272", symbol: "XSUSHI", decimals: 18, coingeckoId: "xsushi" },
    { address: "0x9d409a0a012cfba9b15f6d4b36ac57a46966ab9a", symbol: "YVBOOST", decimals: 18, coingeckoId: "yvboost" },
    { address: "0xd0660cd418a64a1d44e9214ad8e459324d8157f1", symbol: "WOOFY", decimals: 12, coingeckoId: "woofy" },
    { address: "0xc5bddf9843308380375a611c18b50fb9341f502a", symbol: "YVE-crvdao", decimals: 18, coingeckoId: "vecrv-dao-yvault" },
  ], 
  "polygon": [
    { address: "0x0000000000000000000000000000000000000000", symbol: "MATIC", coingeckoId: null, decimals: 18 },
    { address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", symbol: "WMATIC", coingeckoId: "wmatic", decimals: 18 },
    { address: "0xc8e36f0a44fbeca89fdd5970439cbe62eb4b5d03", symbol: "ADX", coingeckoId: "adex", decimals: 18 },
    { address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", symbol: "USDT", decimals: 6, coingeckoId: "tether" },
    { address: "0x9fb83c0635de2e815fd1c21b3a292277540c2e8d", symbol: "BUSD", decimals: 18, coingeckoId: "binance-usd" },
    { address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", symbol: "USDC", decimals: 6, coingeckoId: "usd-coin" },
    { address: "0xa649325aa7c5093d12d6f98eb4378deae68ce23f", symbol: "BNB", decimals: 18, coingeckoId: "binancecoin" },
    { address: "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39", symbol: "LINK", decimals: 18, coingeckoId: "chainlink" },
    { address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", symbol: "WETH", decimals: 18, coingeckoId: "weth" },
    { address: "0x172370d5cd63279efa6d502dab29171933a610af", symbol: "CRV", decimals: 18, coingeckoId: "curve-dao-token" },
    { address: "0xd6df932a45c0f255f85145f286ea0b292b21c90b", symbol: "AAVE", decimals: 18, coingeckoId: "aave" },
    { address: "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a", symbol: "SUSHI", decimals: 18, coingeckoId: "sushi" },
    { address: "0xc6d54d2f624bc83815b49d9c2203b1330b841ca0", symbol: "SAND", decimals: 18, coingeckoId: "the-sandbox" },
    { address: "0xb33eaad8d922b1083446dc23f610c2567fb5180f", symbol: "UNI", decimals: 18, coingeckoId: "uniswap" },
    { address: "0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4", symbol: "MANA", decimals: 18, coingeckoId: "decentraland" },
    { address: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", symbol: "DAI", decimals: 18, coingeckoId: "dai" },
    { address: "0x9c2c5fd7b07e95ee044ddeba0e97a665f142394f", symbol: "1INCH", decimals: 18, coingeckoId: "1inch" },
    { address: "0x5fe2b58c013d7601147dcdd68c143a77499f5531", symbol: "GRT", decimals: 18, coingeckoId: "the-graph" },
    { address: "0x61299774020da444af134c82fa83e3810b309991", symbol: "RNDR", decimals: 18, coingeckoId: "render-token" },
    { address: "0x2b9e7ccdf0f4e5b24757c1e1a80e311e34cb10c7", symbol: "MASK", decimals: 18, coingeckoId: "mask-network" },
    { address: "0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3", symbol: "BAL", decimals: 18, coingeckoId: "balancer" },
    { address: "0xe0339c80ffde91f3e20494df88d4206d86024cdf", symbol: "ELON", decimals: 18, coingeckoId: "dogelon-mars" },
    { address: "0x0df0f72ee0e5c9b7ca761ecec42754992b2da5bf", symbol: "ATA", decimals: 18, coingeckoId: "automata" },
    { address: "0x831753dd7087cac61ab5644b308642cc1c33dc13", symbol: "QUICK", decimals: 18, coingeckoId: "quick" },
    { address: "0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7", symbol: "GHST", decimals: 18, coingeckoId: "aavegotchi" },
    { address: "0xa1428174f516f527fafdd146b883bb4428682737", symbol: "SUPER", decimals: 18, coingeckoId: "superfarm" },
    { address: "0x45c32fa6df82ead1e2ef74d17b76547eddfaff89", symbol: "FRAX", decimals: 18, coingeckoId: "frax" },
    { address: "0x8a0e8b4b0903929f47c3ea30973940d4a9702067", symbol: "INSUR", decimals: 18, coingeckoId: "insurace" },
    { address: "0xbe5cf150e1ff59ca7f2499eaa13bfc40aae70e78", symbol: "GLCH", decimals: 18, coingeckoId: "glitch-protocol" },
    { address: "0x692597b009d13c4049a947cab2239b7d6517875f", symbol: "UST", decimals: 18, coingeckoId: "wrapped-ust" },
    { address: "0xd8ca34fd379d9ca3c6ee3b3905678320f5b45195", symbol: "GOHM", decimals: 18, coingeckoId: "governance-ohm" },
    { address: "0xdf7837de1f2fa4631d716cf2502f8b230f1dcc32", symbol: "TEL", decimals: 2, coingeckoId: "telcoin" },
    { address: "0xa2ca40dbe72028d3ac78b5250a8cb8c404e7fb8c", symbol: "FEAR", decimals: 18, coingeckoId: "fear" },
    { address: "0x7075cab6bcca06613e2d071bd918d1a0241379e2", symbol: "GFARM2", decimals: 18, coingeckoId: "gains-farm" },
    { address: "0xe1c42be9699ff4e11674819c1885d43bd92e9d15", symbol: "XTM", decimals: 18, coingeckoId: "torum" },
    { address: "0x4e78011ce80ee02d2c3e649fb657e45898257815", symbol: "KLIMA", decimals: 9, coingeckoId: "klima-dao" },
    { address: "0xc3ec80343d2bae2f8e680fdadde7c17e71e114ea", symbol: "OM", decimals: 18, coingeckoId: "mantra-dao" },
    { address: "0xa55870278d6389ec5b524553d03c04f5677c061e", symbol: "XCAD", decimals: 18, coingeckoId: "xcad-network" },
    { address: "0x8a953cfe442c5e8855cc6c61b1293fa648bae472", symbol: "POLYDOGE", decimals: 18, coingeckoId: "polydoge" },
    { address: "0x1c954e8fe737f99f68fa1ccda3e51ebdb291948c", symbol: "KNC", decimals: 18, coingeckoId: "kyber-network-crystal" },
    { address: "0xaecebfcf604ad245eaf0d5bd68459c3a7a6399c2", symbol: "RAMP", decimals: 18, coingeckoId: "ramp" },
    { address: "0x8765f05adce126d70bcdf1b0a48db573316662eb", symbol: "PLA", decimals: 18, coingeckoId: "playdapp" },
    { address: "0xc3cffdaf8f3fdf07da6d5e3a89b8723d5e385ff8", symbol: "RBC", decimals: 18, coingeckoId: "rubic" },
    { address: "0x22e3f02f86bc8ea0d73718a2ae8851854e62adc5", symbol: "FLAME", decimals: 18, coingeckoId: "firestarter" },
    { address: "0xb9638272ad6998708de56bbc0a290a1de534a578", symbol: "IQ", decimals: 18, coingeckoId: "everipedia" },
    { address: "0x7f426f6dc648e50464a0392e60e1bb465a67e9cf", symbol: "AUTO", decimals: 18, coingeckoId: "auto" },
    { address: "0x9d5565da88e596730522cbc5a918d2a89dbc16d9", symbol: "OOE", decimals: 18, coingeckoId: "openocean" },
    { address: "0xc168e40227e4ebd8c1cae80f7a55a4f0e6d66c97", symbol: "DFYN", decimals: 18, coingeckoId: "dfyn-network" },
    { address: "0x2ab4f9ac80f33071211729e45cfc346c1f8446d5", symbol: "CGG", decimals: 18, coingeckoId: "chain-guardians" },
    { address: "0xf8f9efc0db77d8881500bb06ff5d6abc3070e695", symbol: "SYN", decimals: 18, coingeckoId: "synapse-2" },
    { address: "0xedd6ca8a4202d4a36611e2fff109648c4863ae19", symbol: "MAHA", decimals: 18, coingeckoId: "mahadao" },
    { address: "0x2b88ad57897a8b496595925f43048301c37615da", symbol: "PICKLE", decimals: 18, coingeckoId: "pickle-finance" },
    { address: "0x16eccfdbb4ee1a85a33f3a9b21175cd7ae753db4", symbol: "ROUTE", decimals: 18, coingeckoId: "route" },
    { address: "0xf88332547c680f755481bf489d890426248bb275", symbol: "SURE", decimals: 18, coingeckoId: "insure" },
    { address: "0x8df3aad3a84da6b69a4da8aec3ea40d9091b2ac4", symbol: "AMWMATIC", decimals: 18, coingeckoId: "aave-polygon-wmatic" },
    { address: "0x60d55f02a771d515e077c9c2403a1ef324885cec", symbol: "AMUSDT", decimals: 6, coingeckoId: "aave-polygon-usdt" },
    { address: "0x1a13f4ca1d028320a707d99520abfefca3998b7f", symbol: "AMUSDC", decimals: 6, coingeckoId: "aave-polygon-usdc" },
    { address: "0x5c2ed810328349100a66b82b78a1791b101c9d61", symbol: "AMWBTC", decimals: 8, coingeckoId: "aave-polygon-wbtc" },
    { address: "0x1d2a0e5ec8e5bbdca5cb219e649b565d8e5c3360", symbol: "AMAAVE", decimals: 18, coingeckoId: "aave-polygon-aave" },
    { address: "0x28424507fefb6f7f8e9d3860f56504e4e5f5f390", symbol: "AMWETH", decimals: 18, coingeckoId: "aave-polygon-weth" },
    { address: "0xda537104d6a5edd53c6fbba9a898708e465260b6", symbol: "YFI", decimals: 18, coingeckoId: "yearn-finance" },
    { address: "0xd0660cd418a64a1d44e9214ad8e459324d8157f1", symbol: "WOOFY", decimals: 12, coingeckoId: "woofy" }
  ],
  "binance-smart-chain": [
    { address: "0x0000000000000000000000000000000000000000", symbol: "BNB", coingeckoId: null, decimals: 18 },
    { address: "0x6bff4fb161347ad7de4a625ae5aa3a1ca7077819", symbol: "ADX", coingeckoId: "adex", decimals: 18 },
    { address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", symbol: "BUSD", decimals: 18, coingeckoId: "binance-usd" },
    { address: "0xcc42724c6683b7e57334c4e856f4c9965ed682bd", symbol: "MATIC", decimals: 18, coingeckoId: "matic-network" },
    { address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", symbol: "USDC", decimals: 18, coingeckoId: "usd-coin" },
    { address: "0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd", symbol: "LINK", decimals: 18, coingeckoId: "chainlink" },
    { address: "0x0eb3a705fc54725037cc9e008bdede697f62f335", symbol: "ATOM", decimals: 18, coingeckoId: "cosmos" },
    { address: "0xad29abb318791d579433d831ed122afeaf29dcfe", symbol: "FTM", decimals: 18, coingeckoId: "fantom" },
    { address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", symbol: "WBNB", decimals: 18, coingeckoId: "wbnb" },
    { address: "0x947950bcc74888a40ffa2593c5798f11fc9124c4", symbol: "SUSHI", decimals: 18, coingeckoId: "sushi" },
    { address: "0xbf5140a22578168fd562dccf235e5d43a02ce9b1", symbol: "UNI", decimals: 18, coingeckoId: "uniswap" },
    { address: "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3", symbol: "DAI", decimals: 18, coingeckoId: "dai" },
    { address: "0x8595f9da7b868b1822194faed312235e43007b49", symbol: "BTT", decimals: 18, coingeckoId: "bittorrent-2" },
    { address: "0x111111111117dc0aa78b770fa6a738034120c302", symbol: "1INCH", decimals: 18, coingeckoId: "1inch" },
    { address: "0x3910db0600ea925f63c36ddb1351ab6e2c6eb102", symbol: "SPARTA", decimals: 18, coingeckoId: "spartan-protocol-token" },
    { address: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", symbol: "CAKE", decimals: 18, coingeckoId: "pancakeswap-token" },
    { address: "0x12bb890508c125661e03b09ec06e404bc9289040", symbol: "RACA", decimals: 18, coingeckoId: "radio-caca" },
    { address: "0x857b222fc79e1cbbf8ca5f78cb133d1b7cf34bbd", symbol: "LTO", decimals: 18, coingeckoId: "lto-network" },
    { address: "0x47bead2563dcbf3bf2c9407fea4dc236faba485a", symbol: "SXP", decimals: 18, coingeckoId: "swipe" },
    { address: "0x3203c9e46ca618c8c1ce5dc67e7e9d75f5da2377", symbol: "MBOX", decimals: 18, coingeckoId: "mobox" },
    { address: "0xaec945e04baf28b135fa7c640f624f8d90f1c3a6", symbol: "C98", decimals: 18, coingeckoId: "coin98" },
    { address: "0x4691937a7508860f876c9c0a2a617e7d9e945d4b", symbol: "WOO", decimals: 18, coingeckoId: "woo-network" },
    { address: "0x928e55dab735aa8260af3cedada18b5f70c72f1b", symbol: "FRONT", decimals: 18, coingeckoId: "frontier-token" },
    { address: "0x90c97f71e18723b0cf0dfa30ee176ab653e89f40", symbol: "FRAX", decimals: 18, coingeckoId: "frax" },
    { address: "0x6679eb24f59dfe111864aec72b443d1da666b360", symbol: "ARV", decimals: 8, coingeckoId: "ariva" },
    { address: "0x00e1656e45f18ec6747f5a8496fd39b50b38396d", symbol: "BCOIN", decimals: 18, coingeckoId: "bomber-coin" },
    { address: "0x965f527d9159dce6288a2219db51fc6eef120dd1", symbol: "BSW", decimals: 18, coingeckoId: "biswap" },
    { address: "0xd41fdb03ba84762dd66a0af1a6c8540ff1ba5dfb", symbol: "SFP", decimals: 18, coingeckoId: "safepal" },
    { address: "0xe02df9e3e622debdd69fb838bb799e3f168902c5", symbol: "BAKE", decimals: 18, coingeckoId: "bakerytoken" },
    { address: "0x8b303d5bbfbbf46f1a4d9741e491e06986894e18", symbol: "WOOP", decimals: 18, coingeckoId: "woonkly-power" },
    { address: "0xa2b726b1145a4773f68593cf171187d8ebe4d495", symbol: "INJ", decimals: 18, coingeckoId: "injective-protocol" },
    { address: "0x728c5bac3c3e370e372fc4671f9ef6916b814d8b", symbol: "UNFI", decimals: 18, coingeckoId: "unifi-protocol-dao" },
    { address: "0x935a544bf5816e3a7c13db2efe3009ffda0acda2", symbol: "BLZ", decimals: 18, coingeckoId: "bluzelle" },
    { address: "0xbe1a001fe942f96eea22ba08783140b9dcc09d28", symbol: "BETA", decimals: 18, coingeckoId: "beta-finance" },
    { address: "0xd40bedb44c081d2935eeba6ef5a3c8a31a1bbe13", symbol: "HERO", decimals: 18, coingeckoId: "metahero" },
    { address: "0xae9269f27437f0fcbc232d39ec814844a51d6b8f", symbol: "BURGER", decimals: 18, coingeckoId: "burger-swap" },
    { address: "0xed8c8aa8299c10f067496bb66f8cc7fb338a3405", symbol: "PROS", decimals: 18, coingeckoId: "prosper" },
    { address: "0x678e840c640f619e17848045d23072844224dd37", symbol: "CRTS", decimals: 18, coingeckoId: "cratos" },
    { address: "0x23396cf899ca06c4472205fc903bdb4de249d6fc", symbol: "UST", decimals: 18, coingeckoId: "wrapped-ust" },
    { address: "0x7ad7242a99f21aa543f9650a56d141c57e4f6081", symbol: "JADE", decimals: 9, coingeckoId: "jade-protocol" },
    { address: "0x4b0f1812e5df2a09796481ff14017e6005508003", symbol: "TWT", decimals: 18, coingeckoId: "trust-wallet-token" },
    { address: "0xa1faa113cbe53436df28ff0aee54275c13b40975", symbol: "ALPHA", decimals: 18, coingeckoId: "alpha-finance" },
    { address: "0xc2a605a31bf67a5af81cf6e39af79a62d8462717", symbol: "RPS", decimals: 18, coingeckoId: "rps-league" },
    { address: "0x8850d2c68c632e3b258e612abaa8fada7e6958e5", symbol: "PIG", decimals: 9, coingeckoId: "pig-finance" },
    { address: "0xdaacb0ab6fb34d24e8a67bfa14bf4d95d4c7af92", symbol: "PNT", decimals: 18, coingeckoId: "pnetwork" },
    { address: "0x50332bdca94673f33401776365b66cc4e81ac81d", symbol: "CCAR", decimals: 18, coingeckoId: "cryptocars" },
    { address: "0x3f515f0a8e93f2e2f891ceeb3db4e62e202d7110", symbol: "VIDT", decimals: 18, coingeckoId: "v-id-blockchain" },
    { address: "0x5649e392a1bac3e21672203589adf8f6c99f8db3", symbol: "ZDC", decimals: 18, coingeckoId: "zodiacs" },
    { address: "0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63", symbol: "XVS", decimals: 18, coingeckoId: "venus" },
    { address: "0x6b81ed499bfe7f4cb79c381892e5ce69c3c9a9df", symbol: "CLCT", decimals: 18, coingeckoId: "collectcoin" },
    { address: "0x9ba6a67a6f3b21705a46b380a1b97373a33da311", symbol: "FEAR", decimals: 18, coingeckoId: "fear" },
    { address: "0x3fda9383a84c05ec8f7630fe10adf1fac13241cc", symbol: "DEGO", decimals: 18, coingeckoId: "dego-finance" },
    { address: "0x0a3a21356793b49154fd3bbe91cbc2a16c0457f5", symbol: "RFOX", decimals: 18, coingeckoId: "redfox-labs-2" },
    { address: "0x8443f091997f06a61670b735ed92734f5628692f", symbol: "BEL", decimals: 18, coingeckoId: "bella-protocol" },
    { address: "0x477bc8d23c634c154061869478bce96be6045d12", symbol: "SFUND", decimals: 18, coingeckoId: "seedify-fund" },
    { address: "0xcd1faff6e578fa5cac469d2418c95671ba1a62fe", symbol: "XTM", decimals: 18, coingeckoId: "torum" },
    { address: "0x87230146e138d3f296a9a77e497a2a83012e9bc5", symbol: "SQUID", decimals: 18, coingeckoId: "squid-game" },
    { address: "0x41cf3e9534156405a133cda545af9ff0e586500a", symbol: "GAMINGSHIBA", decimals: 9, coingeckoId: "gamingshiba" },
    { address: "0x39ae8eefb05138f418bb27659c21632dc1ddab10", symbol: "KAI", decimals: 18, coingeckoId: "kardiachain" },
    { address: "0x431e0cd023a32532bf3969cddfc002c00e98429d", symbol: "XCAD", decimals: 18, coingeckoId: "xcad-network" },
    { address: "0x2963dcc52549573bbfbe355674724528532c0867", symbol: "PEX", decimals: 18, coingeckoId: "pexcoin" },
    { address: "0xa77346760341460b42c230ca6d21d4c8e743fa9c", symbol: "PETS", decimals: 18, coingeckoId: "micropets" },
    { address: "0x78650b139471520656b9e7aa7a5e9276814a38e9", symbol: "BTCST", decimals: 17, coingeckoId: "btc-standard-hashrate-token" },
    { address: "0x5d0158a5c3ddf47d4ea4517d8db0d76aa2e87563", symbol: "BONDLY", decimals: 18, coingeckoId: "bondly" },
    { address: "0xc3adbf524513863102df6784e1ab5652165c7912", symbol: "SOUL", decimals: 8, coingeckoId: "phantasma" },
    { address: "0x8f0528ce5ef7b51152a59745befdd91d97091d2f", symbol: "ALPACA", decimals: 18, coingeckoId: "alpaca-finance" },
    { address: "0xa0c8c80ed6b7f09f885e826386440b2349f0da7e", symbol: "SSG", decimals: 18, coingeckoId: "surviving-soldiers" },
    { address: "0x039cb485212f996a9dbb85a9a75d898f94d38da6", symbol: "DEXE", decimals: 18, coingeckoId: "dexe" },
    { address: "0xa64455a4553c9034236734faddaddbb64ace4cc7", symbol: "SANTOS", decimals: 8, coingeckoId: "santos-fc-fan-token" },
    { address: "0x0e37d70b51ffa2b98b4d34a5712c5291115464e3", symbol: "IQ", decimals: 18, coingeckoId: "everipedia" },
    { address: "0x3c6dad0475d3a1696b359dc04c99fd401be134da", symbol: "SAITO", decimals: 18, coingeckoId: "saito" },
    { address: "0xa184088a740c695e156f91f5cc086a06bb78b827", symbol: "AUTO", decimals: 18, coingeckoId: "auto" },
    { address: "0x19e6bfc1a6e4b042fb20531244d47e252445df01", symbol: "TEM", decimals: 9, coingeckoId: "templardao" },
    { address: "0xdfe6891ce8e5a5c7cf54ffde406a6c2c54145f71", symbol: "$CINU", decimals: 9, coingeckoId: "cheems-inu" },
    { address: "0x9029fdfae9a03135846381c7ce16595c3554e10a", symbol: "OOE", decimals: 18, coingeckoId: "openocean" }
  ],
  "avalanche": [
    { address: "0x0000000000000000000000000000000000000000", symbol: "AVAX", coingeckoId: null, decimals: 18 },
    { address: "0x19860ccb0a68fd4213ab9d8266f7bbf05a8dde98", symbol: "BUSD", decimals: 18, coingeckoId: "binance-usd" },
    { address: "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664", symbol: "USDC", decimals: 6, coingeckoId: "usd-coin" },
    { address: "0x264c1383ea520f73dd837f915ef3a732e204a493", symbol: "BNB", decimals: 18, coingeckoId: "binancecoin" },
    { address: "0x5947bb275c521040051d82396192181b413227a3", symbol: "LINK", decimals: 18, coingeckoId: "chainlink" },
    { address: "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab", symbol: "WETH", decimals: 18, coingeckoId: "weth" },
    { address: "0x37b608519f91f70f2eeb0e5ed9af4061722e4f76", symbol: "SUSHI", decimals: 18, coingeckoId: "sushi" },
    { address: "0x8ebaf22b6f053dffeaf46f4dd9efa95d89ba8580", symbol: "UNI", decimals: 18, coingeckoId: "uniswap" },
    { address: "0xd586e7f844cea2f87f50152665bcbc2c279d8d70", symbol: "DAI", decimals: 18, coingeckoId: "dai" },
    { address: "0xd501281565bf7789224523144fe5d98e8b28f267", symbol: "1INCH", decimals: 18, coingeckoId: "1inch" },
    { address: "0x8a0cac13c7da965a312f08ea4229c37869e85cb9", symbol: "GRT", decimals: 18, coingeckoId: "the-graph" },
    { address: "0x1c20e891bab6b1727d14da358fae2984ed9b59eb", symbol: "TUSD", decimals: 18, coingeckoId: "true-usd" },
    { address: "0x88128fd4b259552a9a1d457f435a6527aab72d42", symbol: "MKR", decimals: 18, coingeckoId: "maker" },
    { address: "0xb54f16fb19478766a268f172c9480f8da1a7c9c3", symbol: "TIME", decimals: 9, coingeckoId: "wonderland" },
    { address: "0xd24c2ad096400b6fbcd2ad8b24e7acbc21a1da64", symbol: "FRAX", decimals: 18, coingeckoId: "frax" },
    { address: "0xed46443c18e38064523180fc364c6180b35803d3", symbol: "CROWN", decimals: 9, coingeckoId: "midasdao" },
    { address: "0xbd83010eb60f12112908774998f65761cf9f6f9a", symbol: "BOO", decimals: 18, coingeckoId: "spookyswap" },
    { address: "0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd", symbol: "JOE", decimals: 18, coingeckoId: "joe" },
    { address: "0xf2f7ce610a091b94d41d69f4ff1129434a82e2f0", symbol: "GG", decimals: 9, coingeckoId: "galaxygoogle-dao" },
    { address: "0x8729438eb15e2c8b576fcc6aecda6a148776c0f5", symbol: "QI", decimals: 18, coingeckoId: "benqi" },
    { address: "0xd1c3f94de7e5b45fa4edbba472491a9f4b166fc4", symbol: "XAVA", decimals: 18, coingeckoId: "avalaunch" },
    { address: "0x321e7092a180bb43555132ec53aaa65a5bf84251", symbol: "GOHM", decimals: 18, coingeckoId: "governance-ohm" },
    { address: "0x564a341df6c126f90cf3ecb92120fd7190acb401", symbol: "TRYB", decimals: 6, coingeckoId: "bilira" },
    { address: "0x214db107654ff987ad859f34125307783fc8e387", symbol: "FXS", decimals: 18, coingeckoId: "frax-share" },
    { address: "0x7d1232b90d3f809a54eeaeebc639c62df8a8942f", symbol: "SB", decimals: 9, coingeckoId: "snowbank" },
    { address: "0x70b33ebc5544c12691d055b49762d0f8365d99fe", symbol: "PAPA", decimals: 9, coingeckoId: "papa-dao" },
    { address: "0xa32608e873f9ddef944b24798db69d80bbb4d1ed", symbol: "CRA", decimals: 18, coingeckoId: "crabada" },
    { address: "0x8ae8be25c23833e0a01aa200403e826f611f9cd2", symbol: "CRAFT", decimals: 18, coingeckoId: "talecraft" },
    { address: "0x0ebd9537a25f56713e34c45b38f421a1e7191469", symbol: "OOE", decimals: 18, coingeckoId: "openocean" },
    { address: "0x1f1e7c893855525b303f99bdf5c3c05be09ca251", symbol: "SYN", decimals: 18, coingeckoId: "synapse-2" },
    { address: "0xe896cdeaac9615145c0ca09c8cd5c25bced6384c", symbol: "PEFI", decimals: 18, coingeckoId: "penguin-finance" },
    { address: "0xb2a85c5ecea99187a977ac34303b80acbddfa208", symbol: "ROCO", decimals: 18, coingeckoId: "roco-finance" },
    { address: "0x60781c2586d68229fde47564546784ab3faca982", symbol: "PNG", decimals: 18, coingeckoId: "pangolin" },
    { address: "0xc7b5d72c836e718cda8888eaf03707faef675079", symbol: "SWAP", decimals: 18, coingeckoId: "trustswap" },
    { address: "0xf693248f96fe03422fea95ac0afbbbc4a8fdd172", symbol: "TUS", decimals: 18, coingeckoId: "treasure-under-sea" },
    { address: "0x961c8c0b1aad0c0b10a51fef6a867e3091bcef17", symbol: "DYP", decimals: 18, coingeckoId: "defi-yield-protocol" },
    { address: "0xd6070ae98b8069de6b494332d1a1a81b6179d960", symbol: "BIFI", decimals: 18, coingeckoId: "beefy-finance" },
    { address: "0xfb98b335551a418cd0737375a2ea0ded62ea213b", symbol: "PENDLE", decimals: 18, coingeckoId: "pendle" },
    { address: "0x7c08413cbf02202a1c13643db173f2694e0f73f0", symbol: "MAXI", decimals: 9, coingeckoId: "maximizer" },
    { address: "0x5684a087c739a2e845f4aaaabf4fbd261edc2be8", symbol: "LF", decimals: 9, coingeckoId: "life-dao" },
    { address: "0xb27c8941a7df8958a1778c0259f76d1f8b711c35", symbol: "KLO", decimals: 18, coingeckoId: "kalao" },
    { address: "0x88a425b738682f58c0ff9fcf2cceb47a361ef4cf", symbol: "TEMPO", decimals: 9, coingeckoId: "tempo-dao" },
    { address: "0x846d50248baf8b7ceaa9d9b53bfd12d7d7fbb25a", symbol: "VSO", decimals: 18, coingeckoId: "verso" },
    { address: "0x245c2591403e182e41d7a851eab53b01854844ce", symbol: "MEAD", decimals: 8, coingeckoId: "thors-mead" },
    { address: "0xf6d46849db378ae01d93732585bec2c4480d1fd5", symbol: "FORT", decimals: 9, coingeckoId: "fortressdao" },
    { address: "0xb80323c7aa915cb960b19b5cca1d88a2132f7bd1", symbol: "NADO", decimals: 9, coingeckoId: "tornadao" },
    { address: "0x4939b3313e73ae8546b90e53e998e82274afdbdb", symbol: "CCC", decimals: 9, coingeckoId: "cross-chain-capital" },
    { address: "0x440abbf18c54b2782a4917b80a1746d3a2c2cce1", symbol: "SHIBX", decimals: 18, coingeckoId: "shibavax" },
    { address: "0x9e3ca00f2d4a9e5d4f0add0900de5f15050812cf", symbol: "NFTD", decimals: 18, coingeckoId: "nftrade" },
    { address: "0x65378b697853568da9ff8eab60c13e1ee9f4a654", symbol: "HUSKY", decimals: 18, coingeckoId: "husky-avax" },
    { address: "0xf44fb887334fa17d2c5c0f970b5d320ab53ed557", symbol: "START", decimals: 18, coingeckoId: "bscstarter" },
    { address: "0x59414b3089ce2af0010e7523dea7e2b35d776ec7", symbol: "YAK", decimals: 18, coingeckoId: "yield-yak" },
    { address: "0xa2776a53da0bf664ea34b8efa1c8ab4241a10968", symbol: "BLIZZ", decimals: 18, coingeckoId: "blizzard-network" },
    { address: "0xc38f41a296a4493ff429f1238e030924a1542e50", symbol: "SNOB", decimals: 18, coingeckoId: "snowball-token" },
    { address: "0x87bade473ea0513d4aa7085484aeaa6cb6ebe7e3", symbol: "MOR", decimals: 18, coingeckoId: "mor-stablecoin" },
    { address: "0x8cd309e14575203535ef120b5b0ab4dded0c2073", symbol: "WSOHM", decimals: 18, coingeckoId: "wrapped-staked-olympus" },
    { address: "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c", symbol: "ELK", decimals: 18, coingeckoId: "elk-finance" },
    { address: "0x78ea17559b3d2cf85a7f9c2c704eda119db5e6de", symbol: "AVE", decimals: 18, coingeckoId: "avaware" },
    { address: "0x8afa62fa8dde8888405c899d7da077a61a87eed3", symbol: "LIBRE", decimals: 18, coingeckoId: "libre-defi" },
    { address: "0x72699ba15cc734f8db874fa9652c8de12093f187", symbol: "GRO", decimals: 18, coingeckoId: "growth-defi" },
    { address: "0xdef1fac7bf08f173d286bbbdcbeeade695129840", symbol: "CERBY", decimals: 18, coingeckoId: "cerby-token" },
    { address: "0xa384bc7cdc0a93e686da9e7b8c0807cd040f4e0b", symbol: "WOW", decimals: 18, coingeckoId: "wowswap" },
    { address: "0x47eb6f7525c1aa999fbc9ee92715f5231eb1241d", symbol: "MELT", decimals: 18, coingeckoId: "defrost-finance" },
    { address: "0xe0474c15bc7f8213ee5bfb42f9e68b2d6be2e136", symbol: "VAL", decimals: 9, coingeckoId: "vikings-finance" },
    { address: "0x346a59146b9b4a77100d369a3d18e8007a9f46a6", symbol: "AVAI", decimals: 18, coingeckoId: "orca-avai" },
    { address: "0xcf8419a615c57511807236751c0af38db4ba3351", symbol: "AXIAL", decimals: 18, coingeckoId: "axial-token" },
    { address: "0xb00f1ad977a949a3ccc389ca1d1282a2946963b0", symbol: "BOOFI", decimals: 18, coingeckoId: "boo-finance" },
    { address: "0x9eaac1b23d935365bd7b542fe22ceee2922f52dc", symbol: "YFI", decimals: 18, coingeckoId: "yearn-finance" }
  ]
}

function checkTokenList (list) {
  return list.filter(t => {
    return isAddress(t.address)
  })
}

export {
    call,
    tokenList,
    isErr,
    getErrMsg,
    checkTokenList,
    getTokenListBalance
}