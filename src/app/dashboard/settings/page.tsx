import { ReferralSection } from '@/app/components/settings/ReferralSection'

export default function SettingsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-8">
        {/* Other settings sections */}
        <ReferralSection />
      </div>
    </div>
  )
} 