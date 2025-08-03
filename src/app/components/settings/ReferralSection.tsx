import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

export function ReferralSection() {
  const { data: session } = useSession()
  const [copying, setCopying] = useState(false)

  if (!session?.user) return null

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${session.user.referral_code}`
  const creditsRemaining = 10 - session.user.referral_credits
  const creditsUsed = session.user.referral_credits

  const copyLink = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(referralLink)
      toast.success('Referral link copied!')
    } catch (error) {
      toast.error('Failed to copy link')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Referrals</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Your Referral Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2 bg-secondary/50 rounded-md text-sm"
            />
            <Button
              onClick={copyLink}
              disabled={copying}
              variant="outline"
            >
              {copying ? 'Copying...' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">People Referred</p>
            <p className="text-2xl font-semibold">{creditsUsed}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Free Months Remaining</p>
            <p className="text-2xl font-semibold">{creditsRemaining}/10</p>
          </div>
        </div>

        <div className="bg-secondary/30 rounded-md p-4 text-sm">
          <p className="font-medium mb-1">How it works</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Share your referral link with friends</li>
            <li>When they sign up, you get 1 month of Pro for free</li>
            <li>You can earn up to 10 free months</li>
            <li>Free months are applied automatically to your billing</li>
          </ul>
        </div>
      </div>
    </Card>
  )
} 