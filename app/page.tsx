import { redirect } from 'next/navigation'

export default function RootPage() {
  // Skip auth for now - go directly to dashboard
  redirect('/(dashboard)')
}
