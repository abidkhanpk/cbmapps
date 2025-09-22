
import { redirect } from 'next/navigation';

export default function AuthLoginRedirect() {
  // Redirect legacy route to the canonical login page
  redirect('/login');
}
