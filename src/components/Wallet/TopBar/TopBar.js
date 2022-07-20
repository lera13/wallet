import "./TopBar.scss";

import React, { useState, useMemo } from "react";
import { NavLink, useRouteMatch } from "react-router-dom";
import { MdOutlineArrowForward, MdOutlineClose, MdOutlineMenu, MdRemoveRedEye, MdVisibilityOff, MdMenu, MdExitToApp } from "react-icons/md";
import Accounts from "./Accounts/Accounts";
import Networks from "./Networks/Networks";
import DApps from "./DApps/DApps";
import * as blockies from 'blockies-ts';
import Links from "./Links/Links";
import WalletTokenButton from "./WalletTokenButton/WalletTokenButton";
import { Button, ToolTip } from 'components/common';

const TopBar = ({
  connections,
  connect,
  disconnect,
  isWcConnecting,
  onSelectAcc,
  onRemoveAccount,
  selectedAcc,
  accounts,
  network,
  setNetwork,
  allNetworks,
  rewardsData,
  privateMode: { isPrivateMode, togglePrivateMode, hidePrivateValue },
  addRequest,
  userSorting,
  setUserSorting,
  dappsCatalog
}) => {
  const [isMenuOpen, setMenuOpen] = useState(false)
  const routeMatch = useRouteMatch('/wallet/dapps')

  const { isDappMode, toggleSideBarOpen, currentDappData, loadCurrentDappData } = dappsCatalog

  const dapModeTopBar = useMemo(() => isDappMode && routeMatch && currentDappData, [isDappMode, routeMatch])

  const account = accounts.find(({ id }) => id === selectedAcc)
  const accountIcon = blockies.create({ seed: account ? account.id : null }).toDataURL()

  return (
    <div id="topbar">
      <div id="mobile-menu" onClick={() => setMenuOpen(!isMenuOpen)}>
        <div className="icon" style={{backgroundImage: `url(${accountIcon})`}}></div>
        <MdOutlineArrowForward/>
        <div className="icon" style={{backgroundImage: `url(${network.icon})`}}></div>
        <div id="menu-button">
          { isMenuOpen ? <MdOutlineClose/> : <MdOutlineMenu/> }
        </div>
      </div>

      {dapModeTopBar ?
        <div className='dapp-menu'>
          <div className='dapp-menu-btns'>
            <ToolTip label='Open Ambire Wallet menu'>
              <Button className='ambire-menu-btn' clear mini icon={<MdMenu />}
                onClick={() => toggleSideBarOpen()}
              ></Button>
            </ToolTip>
            <div className='dapp-data'>
              <ToolTip label={`Connect to ${currentDappData?.title} with Ambire Wallet`}>
                <img className='dapp-logo' src={currentDappData?.logo} alt={currentDappData?.title}/>
              </ToolTip>
              <ToolTip label={`Exit from ${currentDappData?.title}`}>
                <Button
                  className='dapp-exit-btn'
                  secondary mini icon={<MdExitToApp /> }
                  onClick={() => loadCurrentDappData(null)}
                ></Button>
              </ToolTip>
            </div>
          </div>
        </div>
      :        
      <NavLink to={'/wallet/dashboard'}>
        <div id="logo" />
        <div id="icon" />
      </NavLink>     
      }

      <div className={`container ${isMenuOpen ? 'open' : ''}`}>
        {selectedAcc && <WalletTokenButton
          rewardsData={rewardsData}
          account={account}
          network={network}
          hidePrivateValue={hidePrivateValue}
          addRequest={addRequest}
        />}
        {isPrivateMode ? <MdVisibilityOff cursor="pointer" size={28} onClick={togglePrivateMode} /> : <MdRemoveRedEye cursor="pointer" size={28} onClick={togglePrivateMode} />}
        <DApps connections={connections} connect={connect} disconnect={disconnect} isWcConnecting={isWcConnecting}/>
        <Accounts accounts={accounts} selectedAddress={selectedAcc} onSelectAcc={onSelectAcc} onRemoveAccount={onRemoveAccount} hidePrivateValue={hidePrivateValue}  userSorting={userSorting} setUserSorting={setUserSorting}/>        
        <Networks setNetwork={setNetwork} network={network} allNetworks={allNetworks}  userSorting={userSorting}
        setUserSorting={setUserSorting} dappsCatalog={dappsCatalog} dapModeTopBar={dapModeTopBar}/>
        <Links/>
      </div>
    </div>
  );
};

export default TopBar;
