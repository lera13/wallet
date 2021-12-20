import './LatticeModal.scss'

import { Modal, Button, TextInput, Loading } from '../../common'
import { useState } from 'react'
import { useToasts } from '../../../hooks/toasts'
import { Client } from 'gridplus-sdk'

const crypto = require('crypto')
// const privKey = crypto.randomBytes(32).toString('hex')
const privKey =
    '60dd502e869a7d3dac752cc7d5dd7dbe40b1f06293865c1e91f6b8f7ac938c00'
const HARDENED_OFFSET = 0x80000000

const LatticeModal = ({ addresses }) => {
    const { addToast } = useToasts()

    const [isLoading, setLoading] = useState(false)
    const [deviceId, setDeviceId] = useState('')
    const [secret, setSecret] = useState('')
    const [isSecretFieldShown, setIsSecretFieldShown] = useState(false)
    const [promiseResolve, setPromiseResolve] = useState(null)

    const clientConfig = {
        name: 'Ambire Wallet',
        crypto: crypto,
        privKey: privKey,
    }

    const client = new Client(clientConfig)


    const connectToDevice = async () => {
        setLoading(prevState => !prevState)
        //TODO Try/catch
        client.connect(deviceId, (err, isPaired) => {
            const getAddressesReqOpts = {
                startPath: [HARDENED_OFFSET+44, HARDENED_OFFSET+60, HARDENED_OFFSET, 0, 0],
                n: 10
            }

            if (err) {
                setLoading(prevState => !prevState)
                return addToast(`Lattice: ${err} Or check if the DeviceID is correct.`, { error: true })
            }

            if (typeof isPaired === 'undefined' || !isPaired) {
                setIsSecretFieldShown(prevState => !prevState)

                const enteringSecret = new Promise((resolve, reject) => { setPromiseResolve(() => resolve) })
            
                enteringSecret.then((res, rej) => {
                    setIsSecretFieldShown(prevState => !prevState)
                    
                    client.pair(res, err => {
                        if (err) {
                            setLoading(prevState => !prevState)
                            return addToast('Lattice: ' + err, { error: true })
                        }

                        client.getAddresses(getAddressesReqOpts, (err, res) => {
                            if (err) {
                                setLoading(prevState => !prevState)
                                return addToast(`Lattice: ${err}`, {
                                    error: true,
                                })
                            }

                            setLoading(prevState => !prevState)
                            addresses(res)
                        })
                    })
                })
            } else {
                client.getAddresses(getAddressesReqOpts, (err, res) => {
                    if (err) {
                        setLoading(false)
                        return addToast(`Lattice: ${err}`, { error: true })
                    }
                    
                    setLoading(prevState => !prevState)
                    addresses(res)
                })
            }
        })
    }

    const handleConfirmSecretClicked = () => {
        promiseResolve(secret)
    }

    return (
        <Modal title="Two Factor Authentication">
            <div id="grid-plus">
                <div>
                    <p>
                        The deviceId is listed on your Lattice under{' '}
                        <strong>Settings</strong>.
                    </p>
                    <h4>Device ID</h4>
                    <TextInput
                        placeholder="Enter the device ID"
                        onInput={value => setDeviceId(value)}
                    />
                    {isSecretFieldShown && (
                        <>
                            <h4>Secret</h4>
                            <TextInput
                                placeholder="Enter secret"
                                onInput={value => setSecret(value)}
                            />
                            <Button onClick={handleConfirmSecretClicked}>Pair Wallet</Button>
                        </>
                    )}
                    {isLoading ? (
                        <>
                            <h3>It may takes a while.</h3>
                            <h3>Please wait...</h3>
                        </>
                    ) : (
                        <></>
                    )}
                    <div className="buttons">
                        {!isLoading ? (
                            <Button onClick={connectToDevice}>
                                Connect to Wallet
                            </Button>
                        ) : (
                            <Button disabled>
                                <Loading />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}

export default LatticeModal
