import './AddressBook.scss'

import { FaAddressCard } from 'react-icons/fa'
import { MdOutlineAdd, MdClose, MdOutlineDelete } from 'react-icons/md'
import * as blockies from 'blockies-ts';
import { DropDown } from '..'
import { useCallback, useEffect, useState } from 'react'

const AddressBook = ({ accounts, selectedAcc, addresses, addAddress, removeAddress, newAddress, onClose, onSelectAddress }) => {
    const [address, setAddress] = useState('')
    const [name, setName] = useState('')
    const [isOpen, setOpenMenu] = useState(false)
    const [openAddAddress, setOpenAddAddress] = useState(false)

    const accountsList = accounts.filter(({ id }) => id !== selectedAcc)
    const accountType = ({ email, signerExtra }) => {
        const walletType = signerExtra && signerExtra.type === 'ledger' ? 'Ledger' : signerExtra && signerExtra.type === 'trezor' ? 'Trezor' : 'Web3'
        return email ? `Ambire account for ${email}` : `Ambire account (${walletType})`
    }
    const toIcon = seed => blockies.create({ seed }).toDataURL()
    const toIconBackgroundImage = seed => ({ backgroundImage: `url(${toIcon(seed)})`})
    const selectAddress = address => onSelectAddress ? onSelectAddress(address) : null
    
    const isAddAddressFormValid = address.length && name.length && /^0x[a-fA-F0-9]{40}$/.test(address)
    const onAddAddress = useCallback(() => {
        setOpenAddAddress(false)
        addAddress(name, address)
    }, [name, address, addAddress])

    const onMenuClose = useCallback(() => {
        setName('')
        setAddress('')
        setOpenMenu(false)
    }, [])

    useEffect(() => !isOpen && onClose ? onClose() : null, [isOpen, onClose])

    useEffect(() => {
        if (newAddress) {
            setAddress(newAddress)
            setOpenMenu(true)
            setOpenAddAddress(true)
        }
    }, [newAddress])

    return (
        <DropDown title={<FaAddressCard/>} className="address-book" open={isOpen} onClose={onMenuClose}>
            <div className="heading">
                <div className="title">
                    <FaAddressCard/> Address Book
                </div>
                {
                    !openAddAddress ?
                        <div className="button" onClick={() => setOpenAddAddress(true)}>
                            <MdOutlineAdd/>
                        </div>
                        :
                        <div className="button" onClick={() => setOpenAddAddress(false)}>
                            <MdClose/>
                        </div>
                }
            </div>
            {
                openAddAddress ?
                    <div id="add-address" className="content">
                        <div className="fields">
                            <input type="text" placeholder="Name" defaultValue={name} onInput={({ target }) => setName(target.value)}/>
                            <input type="text" autoComplete="nope" placeholder="Address" defaultValue={address} onInput={({ target }) => setAddress(target.value)}/>
                        </div>
                        <button className="button" disabled={!isAddAddressFormValid} onClick={onAddAddress}>
                            <MdOutlineAdd/> Add Address
                        </button>
                    </div>
                    :
                    !addresses.length && !accountsList.length ?
                        <div className="content">
                            Your Address Book is empty.
                        </div>
                        :
                        <div className="content">
                            {
                                <div className="items">
                                    {
                                        accountsList.map(account => (
                                            <div className="item" key={account.id} onClick={() => selectAddress(account.id)}>
                                                <div className="inner">
                                                    <div className="icon" style={toIconBackgroundImage(account.id)}></div>
                                                    <div className="details">
                                                        <label>{ accountType(account) }</label>
                                                        <div className="address">{ account.id }</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {
                                        addresses.map(({ name, address }) => (
                                            <div className="item" key={address + name}>
                                                <div className="inner" onClick={() => selectAddress(address)}>
                                                    <div className="icon" style={toIconBackgroundImage(address)}></div>
                                                    <div className="details">
                                                        <label>{ name }</label>
                                                        <div className="address">{ address }</div>
                                                    </div>
                                                </div>
                                                <div className="button" onClick={() => removeAddress(name, address)}>
                                                    <MdOutlineDelete/>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            }
                        </div>
            }
        </DropDown>
    )
}

export default AddressBook