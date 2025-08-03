'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { useToast } from '@/app/components/ui/use-toast'

interface TeamMember {
  id: string
  role: string
  joined_at: string
  users: {
    id: string
    name: string | null
    email: string | null
  }
}

interface TeamSettingsProps {
  teamId: string
  isOwner: boolean
  isAdmin: boolean
}

export function TeamSettings({ teamId, isOwner, isAdmin }: TeamSettingsProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchMembers()
  }, [teamId])

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`)
      if (!response.ok) throw new Error('Failed to fetch members')
      const data = await response.json()
      setMembers(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      })

      if (!response.ok) throw new Error('Failed to send invite')

      toast({
        title: 'Success',
        description: 'Invitation sent successfully'
      })

      setInviteEmail('')
      setInviteRole('member')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive'
      })
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove member')

      toast({
        title: 'Success',
        description: 'Member removed successfully'
      })

      fetchMembers()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete team')

      toast({
        title: 'Success',
        description: 'Team deleted successfully'
      })

      router.push('/dashboard')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive'
      })
    }
  }

  if (!isOwner && !isAdmin) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        You don't have permission to manage team settings.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Members List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Team Members</h2>
        {loading ? (
          <div className="text-center py-4">Loading members...</div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-card rounded-lg border"
              >
                <div>
                  <div className="font-medium">
                    {member.users.name || member.users.email}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {member.role}
                  </div>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(member.users.id)}
                  >
                    Remove
                  </Button>
                )}
                {isAdmin && member.role === 'member' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(member.users.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Form */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Invite Members</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <Select
              value={inviteRole}
              onValueChange={(value: 'admin' | 'member') => setInviteRole(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="border-t pt-8">
          <h2 className="text-lg font-semibold mb-4 text-destructive">
            Danger Zone
          </h2>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Team
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  team and remove all members.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTeam}>
                  Delete Team
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
} 