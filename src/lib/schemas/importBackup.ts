import { z } from 'zod';

export const importBackupSchema = z
    .object({
        encryptPassword: z.string().min(1, 'Encrypt password is required'),
        password: z.string().min(1, 'Password is required').min(6, 'Password min length is 6'),
        passwordConfirm: z.string().min(1, 'Please confirm your password'),
        fileName: z.string().min(1, 'Backup file is required'),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        message: 'Passwords do not match',
        path: ['passwordConfirm'],
    });

export type ImportBackupFormData = z.infer<typeof importBackupSchema>;
