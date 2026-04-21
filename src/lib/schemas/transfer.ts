import { z } from 'zod';

export const transferSchema = z.object({
    receiver: z.string().min(1, 'Receiver is required'),
    amount: z.number({ error: 'Amount must be a number' }).positive('Amount must be a positive number'),
    memo: z.string().optional(),
});

export type TransferFormData = z.infer<typeof transferSchema>;
