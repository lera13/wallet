const networks = [
	{
		id: 'ethereum',
		chainId: 1,
		//rpc: 'https://mainnet.infura.io/v3/3d22938fd7dd41b7af4197752f83e8a1',
		//rpc: 'https://morning-wild-water.quiknode.pro/66011d2c6bdebc583cade5365086c8304c13366c/',
		//rpc: 'https://mainnet.infura.io/v3/d4319c39c4df452286d8bf6d10de28ae',
		rpc: 'https://eth-mainnet.alchemyapi.io/v2/e5Gr8LP_EH0SBPZiNCcC08OuEDrvgoYK',
		nativeAssetSymbol: 'ETH',
		name: 'Ethereum',
		ensName: 'homestead',
		icon: '/resources/networks/ethereum.png',
		explorerUrl: 'https://etherscan.io',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		id: 'polygon',
		chainId: 137,
		rpc: 'https://rpc.ankr.com/polygon', // temp - 5M per month and 170k per day
		// rpc: 'https://polygon-rpc.com/rpc',
		// rpc: 'https://polygon-mainnet.infura.io/v3/d4319c39c4df452286d8bf6d10de28ae',
		nativeAssetSymbol: 'MATIC',
		name: 'Polygon',
		icon: '/resources/networks/polygon.png',
		explorerUrl: 'https://polygonscan.com',
		unstoppableDomainsChain: 'MATIC',
		isGasTankAvailable: true
	},
	{
		id: 'avalanche',
		chainId: 43114,
		rpc: 'https://api.avax.network/ext/bc/C/rpc',
		nativeAssetSymbol: 'AVAX',
		name: 'Avalanche',
		icon: '/resources/networks/avalanche.png',
		explorerUrl: 'https://snowtrace.io',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		// to match the zapper ID
		id: 'binance-smart-chain',
		chainId: 56,
		rpc: 'https://bsc-dataseed1.defibit.io',
		nativeAssetSymbol: 'BNB',
		name: 'Binance Smart Chain',
		icon: '/resources/networks/bsc.png',
		explorerUrl: 'https://bscscan.com',
		unstoppableDomainsChain: 'BEP20',
		isGasTankAvailable: true
	},
	{
		id: 'fantom',
		chainId: 250,
		rpc: 'https://rpc.ftm.tools',
		nativeAssetSymbol: 'FTM',
		name: 'Fantom Opera',
		icon: '/resources/networks/fantom.png',
		explorerUrl: 'https://ftmscan.com',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		id: 'moonbeam',
		chainId: 1284,
		rpc: 'https://rpc.api.moonbeam.network',
		nativeAssetSymbol: 'GLMR',
		name: 'Moonbeam',
		icon: '/resources/networks/moonbeam.png',
		explorerUrl: 'https://moonscan.io/',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		id: 'moonriver',
		chainId: 1285,
		rpc: 'https://rpc.api.moonriver.moonbeam.network',
		nativeAssetSymbol: 'MOVR',
		name: 'Moonriver',
		icon: '/resources/networks/moonriver.png',
		explorerUrl: 'https://moonriver.moonscan.io/',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		id: 'arbitrum',
		chainId: 42161,
		rpc: 'https://arb-mainnet.g.alchemy.com/v2/wBLFG9QR-n45keJvKjc4rrfp2F1sy1Cp',
		nativeAssetSymbol: 'AETH',
		name: 'Arbitrum',
		icon: '/resources/networks/arbitrum.svg',
		explorerUrl: 'https://arbiscan.io',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		id: 'gnosis',
		chainId: 100,
		// rpc: 'https://rpc.xdaichain.com',
		rpc: 'https://rpc.ankr.com/gnosis',
		nativeAssetSymbol: 'XDAI',
		name: 'Gnosis Chain',
		icon: '/resources/networks/gnosis.png',
		explorerUrl: 'https://blockscout.com',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		id: 'kucoin',
		chainId: 321,
		rpc: 'https://rpc-mainnet.kcc.network',
		nativeAssetSymbol: 'KCS',
		name: 'KCC KuCoin',
		icon: '/resources/networks/kucoin.svg',
		explorerUrl: 'https://explorer.kcc.io',
		unstoppableDomainsChain: 'ERC20',
		hide: true,
		isGasTankAvailable: false
	},
	{
		id: 'optimism',
		chainId: 10,
		rpc: 'https://mainnet.optimism.io',
		nativeAssetSymbol: 'ETH',
		name: 'Optimism',
		icon: '/resources/networks/optimism.jpg',
		explorerUrl: 'https://optimistic.etherscan.io',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		id: 'andromeda',
		chainId: 1088,
		rpc: 'https://andromeda.metis.io/?owner=1088',
		nativeAssetSymbol: 'METIS',
		name: 'Andromeda',
		icon: '/resources/networks/andromeda.svg',
		explorerUrl: 'https://andromeda-explorer.metis.io',
		unstoppableDomainsChain: 'ERC20',
		isGasTankAvailable: true
	},
	{
		id: 'rinkeby',
		chainId: 4,
		rpc: 'https://rinkeby.infura.io/v3/4409badb714444b299066870e0f7b631',
		nativeAssetSymbol: 'ETH',
		name: 'Rinkeby',
		icon: '/resources/networks/rinkeby.png',
		explorerUrl: 'https://rinkeby.etherscan.io',
		unstoppableDomainsChain: 'ERC20',
		hide: false,
		isGasTankAvailable: false
	},
	// {
	// 	id: 'cronos',
	// 	chainId: 25,
	// 	rpc: 'https://evm-cronos.crypto.org',
	// 	nativeAssetSymbol: 'CRO',
	// 	name: 'Cronos',
	// 	icon: '/resources/networks/cronos.png',
	// 	explorerUrl: 'https://cronoscan.com',
	// 	unstoppableDomainsChain: 'ERC20'
	// },
	// {
	// 	id: 'aurora',
	// 	chainId: 1313161554,
	// 	rpc: 'https://mainnet.aurora.dev',
	// 	nativeAssetSymbol: 'ETH',
	// 	name: 'NEAR Aurora',
	// 	icon: '/resources/networks/aurora.png',
	// 	explorerUrl: 'https://aurorascan.dev',
	// 	unstoppableDomainsChain: 'ERC20'
	// }
]

export default networks
