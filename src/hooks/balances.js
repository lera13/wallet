import { useEffect, useState } from 'react';
import { supportedBalances, getBalances } from '../services/zapper';

import { ZAPPER_API_KEY } from '../config';

export default function useBalances({ currentNetwork, account }) {
    const [balances, setBalance] = useState([]);
    const [totalUSD, setTotalUSD] = useState({});

    const updateBalances = (currentNetwork, address) => {
        setBalance([]);
        supportedBalances(ZAPPER_API_KEY).then(supported => {
            const { apps } = supported.find(({ network }) => network === currentNetwork);
            apps.map(({ appId }) => getBalances(ZAPPER_API_KEY, currentNetwork, appId, address).then(balance => {
                setBalance(balances => [
                    ...balances,
                    {
                        appId,
                        ...Object.values(balance)[0]
                    }
                ]);
            }));
        });
    };

    useEffect(() => {
        updateBalances(currentNetwork, account);
    }, [currentNetwork, account]);

    useEffect(() => {
        const total = balances
            .filter(({ meta }) => meta && meta.length)
            .map(({ meta }) => meta.find(({ label }) => label === 'Total').value)
            .reduce((acc, curr) => acc + curr, 0)
            .toFixed(2);

        const [truncated, decimals] = total.split('.');
        const formated = Number(truncated).toLocaleString('en-US');

        setTotalUSD({
            full: total,
            formated,
            decimals
        });
    }, [balances]);

    return {
        balances,
        totalUSD
    }
}