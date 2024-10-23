// app/sharer/dashboard/page.tsx
import { withRole } from '@/app/_utils/withRole'

export default async function SharerDashboardPage() {
  return await withRole(['Sharer'], async (supabase, user) => {
    // Your Sharer Dashboard Content
    return (
      <div>
        <h1>Sharer Dashboard</h1>
        <p>Welcome, {user.email}</p>
        {/* Other content */}
      </div>
    )
  })
}