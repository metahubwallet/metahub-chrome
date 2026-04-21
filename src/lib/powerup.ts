export function powerup(
    payer: string,
    receiver: string,
    cpuQuantity: string = '',
    netQuantity: string = '',
    powupState: any = null
) {
    const state = powupState ?? {};
    const cpuAmount = parseAmount(cpuQuantity);
    const netAmount = parseAmount(netQuantity);
    let cpuFrac = 0n;
    let netFrac = 0n;
    let cpuFee = 0;
    let netFee = 0;
    if (cpuAmount > 0n && state.cpu) {
        const r = calcFracAndFee(cpuAmount, state.cpu);
        cpuFrac = r.frac;
        cpuFee = r.fee;
    }
    if (netAmount > 0n && state.net) {
        const r = calcFracAndFee(netAmount, state.net);
        netFrac = r.frac;
        netFee = r.fee;
    }

    const totalFee = cpuFee + netFee;
    const minFee = Number(parseAmount(state.min_powerup_fee || '0.0001 EOS'));
    // Buffer to cover JS float vs on-chain int64 rounding divergence, and enforce min fee.
    const paymentUnits = Math.max(minFee, Math.ceil(totalFee));

    return {
        payer,
        receiver,
        days: parseInt(state.powerup_days) || 1,
        net_frac: netFrac.toString(),
        cpu_frac: cpuFrac.toString(),
        max_payment: formatAsset(paymentUnits),
    };
}

const RENTBW_FRAC = 1000000000000000n; // 10^15

function calcFracAndFee(amount: bigint, state: any): { frac: bigint; fee: number } {
    const weight = BigInt(state.weight);
    const frac = weight > 0n ? (amount * RENTBW_FRAC) / weight : 0n;
    const utilizationIncrease = (frac * weight) / RENTBW_FRAC;
    const fee = calcPowerupFee(state, Number(utilizationIncrease));
    return { frac, fee };
}

function calcPowerupFee(state: any, utilization_increase: number): number {
    if (utilization_increase <= 0) return 0;

    const min_price = Number(parseAmount(state.min_price));
    const max_price = Number(parseAmount(state.max_price));
    const exponent = parseFloat(state.exponent);
    const weight = parseFloat(state.weight);

    const priceFunction = (utilization: number): number => {
        const new_exponent = exponent - 1.0;
        if (new_exponent <= 0) return max_price;
        return min_price + (max_price - min_price) * Math.pow(utilization / weight, new_exponent);
    };

    const priceIntegralDelta = (start_utilization: number, end_utilization: number): number => {
        const coefficient = (max_price - min_price) / exponent;
        const start_u = start_utilization / weight;
        const end_u = end_utilization / weight;
        return (
            min_price * end_u -
            min_price * start_u +
            coefficient * Math.pow(end_u, exponent) -
            coefficient * Math.pow(start_u, exponent)
        );
    };

    let fee = 0;
    let start_utilization = parseFloat(state.utilization);
    const end_utilization = start_utilization + utilization_increase;
    const adjusted_utilization = parseFloat(state.adjusted_utilization);

    if (start_utilization < adjusted_utilization) {
        fee +=
            (priceFunction(adjusted_utilization) *
                Math.min(utilization_increase, adjusted_utilization - start_utilization)) /
            weight;
        start_utilization = adjusted_utilization;
    }
    if (start_utilization < end_utilization) {
        fee += priceIntegralDelta(start_utilization, end_utilization);
    }
    return Math.ceil(fee);
}

// Parses "5000.0000 EOS" → 50000000n (units of 10^-precision)
function parseAmount(quantity: string): bigint {
    const [amount] = quantity.split(' ');
    const digits = amount.replace('.', '');
    return BigInt(digits);
}

// Format integer smallest-units back into "X.XXXX EOS"
function formatAsset(units: number): string {
    const whole = Math.floor(units / 10000);
    const frac = String(units % 10000).padStart(4, '0');
    return `${whole}.${frac} EOS`;
}
