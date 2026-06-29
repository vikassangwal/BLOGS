'use server';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/admin',
    });
    
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials.' };
        default:
          return { error: 'Something went wrong.' };
      }
    }
    throw error;
  }
}
