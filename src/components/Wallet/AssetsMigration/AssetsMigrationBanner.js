import './AssetsMigration.scss'
import assetMigrationDetector from 'lib/assetMigrationDetector'
import AssetsMigrationModal from 'components/Modals/AssetsMigrationModal/AssetsMigrationModal'
import { useCallback, useEffect, useState } from 'react'
import { useModals } from 'hooks'
import { FaTimes } from 'react-icons/fa'
import { getWallet } from 'lib/getWallet'

const AssetsMigrationBanner = ({ addRequest, selectedAccount, accounts, selectedNetwork, relayerURL, portfolio, closeable = false, linkMargin = false, useStorage }) => {

  const [hasSignerAssets, setHasSignerAssets] = useState(false)
  const [migrationMessageSeen, setMigrationMessageSeen] = useState(false)
  const { showModal } = useModals()
  const [migrationMessageSeenStorage, setMigrationMessageSeenStorage] = useStorage({key: 'migrationSeen', defaultValue:{}})

  // in the meantime that we integrate HW wallets...
  const currentAccount = accounts.find(a => a.id === selectedAccount)
  let wallet
  try {
    wallet = getWallet({
      signer: currentAccount.signer,
      signerExtra: currentAccount.signerExtra,
      chainId: selectedNetwork.chainId
    })
  } catch (err) {
    // in case of no window.ethereum was injected from extension
  }

  const closeMigrationMessage = useCallback(() => {
    setMigrationMessageSeen(true)
    setMigrationMessageSeenStorage((old) => {
      old[selectedAccount + selectedNetwork.id] = true
      return old
    })
  }, [selectedAccount, selectedNetwork, setMigrationMessageSeenStorage])

  //fetching relevant assets
  useEffect(() => {
    let unmounted = false

    setHasSignerAssets(false)
    const checkSignerAssets = ({ networkId, identityAccount, accounts }) => {
      const currentAccount = accounts.find(a => a.id === identityAccount)
      if (!currentAccount.signer) return

      assetMigrationDetector({ networkId: networkId, account: currentAccount.signer.address }).then(assets => {
        if (unmounted) return
        const relevantAssets = assets.filter(a => a.balanceUSD > 0.001)
        setHasSignerAssets(!!relevantAssets.length)
      }).catch(err => {
        console.error(err)
      })
    }

    checkSignerAssets({ identityAccount: selectedAccount, networkId: selectedNetwork.id, accounts })

    return () => unmounted = true
  }, [selectedAccount, selectedNetwork, accounts])

  //checking if closable message has been seen(closed) or not
  useEffect(() => {
    setMigrationMessageSeen(closeable && !!migrationMessageSeenStorage[selectedAccount + selectedNetwork.id])
  }, [closeable, selectedAccount, selectedNetwork, migrationMessageSeenStorage])
  
  // We either have a provider (web3) or we use a supported HW wallet
  const supportedHWWalletTypes = ['ledger', 'trezor', 'Lattice']
  const shouldShow = wallet?.provider|| (currentAccount.signerExtra && supportedHWWalletTypes.includes(currentAccount.signerExtra.type))
  if (!shouldShow) return (<></>)

  return (
    (hasSignerAssets && !migrationMessageSeen) &&
    <div className={'migration-banner'}>
      <div className='migration-banner-message'>
        <div>We detected that your signer account has tokens that can be transferred to your Ambire account. We recommend doing this in order to maximize your $WALLET rewards.</div>
        <span className={'link' + (linkMargin ? ' link-margin' : '')} onClick={() => {
          showModal(<AssetsMigrationModal
            addRequest={addRequest}
            selectedNetwork={selectedNetwork}
            selectedAccount={selectedAccount}
            accounts={accounts}
            relayerURL={relayerURL}
            portfolio={portfolio}
          />)
        }}>Click here to migrate those tokens</span>
      </div>
      {
        closeable &&
        <div className={'migration-banner-close'}><FaTimes onClick={() => closeMigrationMessage()}/></div>
      }
    </div>
  )
}

export default AssetsMigrationBanner
