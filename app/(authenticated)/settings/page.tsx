import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

export const dynamic = 'force-dynamic';

const SettingsPage: React.FC = () => {
  return (
    <AuthenticatedLayout>
      <h1>Settings Page</h1>
      {/* Add your settings component logic here */}
    </AuthenticatedLayout>
  );
};

export default SettingsPage;