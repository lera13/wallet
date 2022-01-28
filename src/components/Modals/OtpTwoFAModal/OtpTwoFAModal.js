import './OtpTwoFAModal.scss'

import { Modal, Button, TextInput, Loading } from 'components/common'
import { authenticator } from '@otplib/preset-default'
import QRCode from 'qrcode'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToasts } from 'hooks/toasts'
import { Wallet } from 'ethers'
import { fetchPost } from 'lib/fetch'
import { useModals } from 'hooks'

const OtpTwoFAModal = ({ relayerURL, selectedAcc, setCacheBreak }) => {
    const { hideModal } = useModals()
    const { addToast } = useToasts()

    const secret = useMemo(() => authenticator.generateSecret(20), []) 
    
    const [isLoading, setLoading] = useState(false)
    const [imageURL, setImageURL] = useState(null)
    const [receivedOtp, setReceivedOTP] = useState('')
    const [showSecret, setShowSecret] = useState(false)
    const [emailConfirmCode, setEmailConfirmCode] = useState('')

    const generateQR = useCallback(() => {
        const otpAuth = authenticator.keyuri(
            selectedAcc.email,
            'Ambire Wallet',
            secret
        )

        const qrCodeOptions = {
            quality: 1,
            margin: 1,
        }
        
        QRCode.toDataURL(otpAuth, qrCodeOptions, (error, url) => {
            if (error) {
                console.log(error)
                addToast(error.message, { error: true })
            } else {
                setImageURL(url)
            }
        })
    }, [addToast, secret, selectedAcc.email])

    useEffect(generateQR, [generateQR])

    const handleSubmit = e => {
        e.preventDefault()
        setLoading(true)
        verifyOTP()
    }

    const sendEmail = async() => {
        if (!relayerURL) {
            addToast('Email/pass accounts not supported without a relayer connection', { error: true })
            return
        }
        
        //TODO: Create a request that sends an email
        const { signature } = await fetchPost(`${relayerURL}/second-key/${selectedAcc.id}/ethereum/sign`, {})
    }

    const verifyOTP = async () => {
        const isValid = authenticator.verify({ token: receivedOtp, secret })
        const otp = secret

        if (!isValid) {
            addToast('Invalid or outdated OTP code entered. If you keep seeing this, please ensure your system clock is synced correctly.', { error: true })
            setLoading(false)
            return
        }

        try {
            const wallet = await Wallet.fromEncryptedJson(
                JSON.parse(selectedAcc.primaryKeyBackup),
                currentPassword
            )
            const sig = await wallet.signMessage(JSON.stringify({ otp }))

            //TODO: Remove the code above, create a request to get the signiture from the BE
            
            
            const resp = await fetchPost(`${relayerURL}/identity/${selectedAcc.id}/modify`, { otp, sig })

            if (resp.success) {
                addToast(`You have successfully enabled two-factor authentication.`)
                setCacheBreak()
                resetForm()
                hideModal()
            } else {
                throw new Error(`${resp.message || 'unknown error'}`)
            }
        } catch (e) {
            console.error(e)
            addToast('OTP: ' + e.message || e, { error: true })
        }

        setLoading(false)
    }

    const resetForm = () => {
        setEmailConfirmCode('')
        setReceivedOTP('')
    }

    return (
        <Modal title="Two Factor Authentication">
            <div id="otp-auth">
                <div className="img-wrapper">
                    <img alt="qr-code" src={imageURL}></img>
                </div>
                <div className="img-msg" style={{ marginBottom: showSecret ? '0px' : '22px'}}>
                    {!showSecret && 
                    (<span className="click-here" onClick={() => { setShowSecret(prevState => !prevState) }}>
                        Unable to scan code? Click here.
                    </span>)}
                    {showSecret && (<><span>Enter this OTP in your app:</span><div>{secret}</div></>)}
                </div>
                <form onSubmit={handleSubmit}>
                    <div>
                        <h4>Confirmation code sended via Email</h4>
                        <div className='input-wrapper'>
                            <TextInput
                                small
                                pattern='[0-9]+'
                                title='Confirmation code should be 6 digits'
                                autoComplete='nope'
                                required minLength={6} maxLength={6}
                                placeholder='Confirmation code'
                                value={emailConfirmCode}
                                onInput={value => setEmailConfirmCode(value)}
                            ></TextInput>
                            
                            <Button type="button" small onClick={sendEmail}>Send Email</Button>
                        </div>
                        <h4>Authenticator app code</h4>
                        <TextInput
                            placeholder="Enter the code from authenticator app"
                            onInput={setReceivedOTP}
                            value={receivedOtp}
                            pattern="[0-9]{6}"
                            required
                        />
                    </div>
                    <div className="buttons">
                        {!isLoading ? (<Button type="submit">Enable 2FA</Button>) : (<Button disabled><Loading /></Button>)}
                    </div>
                </form>
            </div>
        </Modal>
    )
}

export default OtpTwoFAModal
