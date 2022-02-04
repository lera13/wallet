import { useEffect, useState } from "react"
import { useModals } from "hooks";
import { Button, ToolTip } from "components/common";
import { WalletTokenModal } from "components/Modals";
import useClaimableWalletToken from "./useClaimableWalletToken";

const WalletTokenButton = ({ rewardsData, walletTokenInfoData, adxTokenInfoData, account, network, hidePrivateValue, addRequest }) => {
    const { showDynamicModal, updateModal } = useModals()
    const claimableWalletToken = useClaimableWalletToken({ account, network, addRequest })

    const [rewards, setRewards] = useState({})
    const { isLoading, data, errMsg } = rewardsData

    const showWalletTokenModal = () => showDynamicModal(WalletTokenModal, { claimableWalletToken, rewards, walletTokenInfoData, adxTokenInfoData })
    useEffect(() => updateModal({ rewards, walletTokenInfoData, adxTokenInfoData }), [updateModal, rewards, walletTokenInfoData, adxTokenInfoData])

    useEffect(() => {
        if (errMsg || !data || !data.success) return

        const { rewards, multipliers } = data
        if (!rewards.length) return

        const rewardsDetails = Object.fromEntries(rewards.map(({ _id, rewards }) => [_id, rewards[account.id] || 0]))
        rewardsDetails.multipliers = multipliers

        setRewards(rewardsDetails)
    }, [data, errMsg, account])

    return (
        !isLoading && (errMsg || !data) ?
            <ToolTip label="WALLET rewards are not available without a connection to the relayer">
                <Button small border disabled onClick={showWalletTokenModal}>Unavailable</Button>
            </ToolTip>
            :
            <Button small border disabled={isLoading} onClick={showWalletTokenModal}>{ hidePrivateValue(claimableWalletToken.claimableNow.toFixed(3)) } WALLET</Button>
    )
}

export default WalletTokenButton
