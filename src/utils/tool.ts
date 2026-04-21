import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';

export const tool = {
    // Account abbreviation
    briefAccount: (account: string, prefixLength = 6, subfixLength = 5) => {
        if (account.length <= 12) return account;

        return (
            account.substring(0, prefixLength) +
            '...' +
            account.substring(subfixLength * -1, subfixLength)
        );
    },

    // Convert to BigNumber
    bignum: (number: string, base = 10) => {
        const num = isNaN(parseFloat(number)) ? '0' : number;
        return new BigNumber(num, base);
    },

    // Time formatting
    timeFormat: (date: string | number) => {
        return dayjs(date).format('YYYY/MM/DD HH:mm:ss');
    },

    // Random integer
    randomInt: (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min) + min);
    },
};
