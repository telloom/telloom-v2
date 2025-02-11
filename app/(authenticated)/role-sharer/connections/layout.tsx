import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connections | Telloom',
  description: 'Manage your connections with listeners and executors',
};

export default function ConnectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 