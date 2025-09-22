import { redirect } from 'next/navigation';

export default function AuthSignInRedirect() {
  // Redirect legacy route to the canonical login page
  redirect('/login');
}
