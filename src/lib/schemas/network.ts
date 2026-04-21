import { z } from 'zod';

export const customNetworkSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    chainId: z
        .string()
        .min(1, 'ChainId is required')
        .length(64, 'Length must be 64 characters'),
    endpoint: z
        .string()
        .min(1, 'Endpoint is required')
        .url('Endpoint must be a valid URL')
        .refine((val) => val.startsWith('https://'), {
            message: 'Endpoint must use HTTPS',
        }),
    tokenSymbol: z.string().min(1, 'Token symbol is required'),
    tokenContract: z.string().optional(),
    tokenPrecision: z
        .number()
        .int('Precision must be an integer')
        .min(0, 'Precision must be between 0-8')
        .max(8, 'Precision must be between 0-8')
        .optional(),
});

export type CustomNetworkFormData = z.infer<typeof customNetworkSchema>;
