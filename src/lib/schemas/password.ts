import { z } from 'zod';

export const passwordSetupSchema = z
    .object({
        password: z.string().min(1, 'Password is required').min(6, 'Password min length is 6'),
        passwordConfirm: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        message: 'Passwords do not match',
        path: ['passwordConfirm'],
    });

export type PasswordSetupFormData = z.infer<typeof passwordSetupSchema>;
