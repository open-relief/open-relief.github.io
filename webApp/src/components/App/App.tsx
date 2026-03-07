import * as shared from 'shared';

type SharedWithInterledger = {
    org_maker_minds_hacko26: {
        InterledgerClient: new () => {
            setSelfAccount: (value: string) => void;
            setTargetAccount: (value: string) => void;
            sendPayment: (amount: number) => Promise<unknown>;
        };
    };
};

const typedShared = shared as unknown as SharedWithInterledger;
const ilp = new typedShared.org_maker_minds_hacko26.InterledgerClient();

ilp.setSelfAccount('$alice.example.com');
ilp.setTargetAccount('$bob.example.com');

export async function pay() {
    try {
        const result = await ilp.sendPayment(100);
        console.log('Payment result:', result);
    } catch (err) {
        console.error('Payment failed', err);
    }
}