import { Dashboard } from '@/components/dashboard'

export const metadata = {
  title: 'Dashboard - Autopost',
  description: 'Manage your AI-powered social media campaigns',
}

// Temporary mock userId for testing without auth
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

export default function DashboardPage() {
  return <Dashboard userId={MOCK_USER_ID} />
}
