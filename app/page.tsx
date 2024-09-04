import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1>Welcome to My App</h1>
      <Link href="/signin">Sign In</Link>
      <Link href="/signup">Sign Up</Link>
      <Link href="/dashboard">Dashboard</Link>
    </div>
  );
}