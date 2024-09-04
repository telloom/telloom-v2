import ProtectedRoute from '@/components/ProtectedRoute';
import SignOut from '@/components/SignOut';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <h1>Dashboard</h1>
      <SignOut />
      {/* Dashboard content */}
    </ProtectedRoute>
  );
}