'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Mail,
  Download,
  Search,
  MoreVertical,
  X,
  Shield,
  Eye,
  UserCheck,
  Clock,
  
  Loader2,
  Check,
  
  
  RefreshCw,
  Activity
} from 'lucide-react'

// Types
interface TeamMember {
  id: string
  user_id: string | null
  name: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'pending'
  last_active_at: string | null
  created_at: string
}

interface TeamInvite {
  id: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  invited_by: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
  updated_at: string
}

const roleConfig = {
  owner: { label: 'Owner', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Shield },
  admin: { label: 'Admin', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: UserCheck },
  member: { label: 'Member', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Users },
  viewer: { label: 'Viewer', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Eye }
}

function timeAgo(date: string | null): string {
  if (!date) return 'Never'
  const now = new Date()
  const past = new Date(date)
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TeamClient() {
  const _router = useRouter()
  
  // State
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('member')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [_confirmDialog] = useState<{ open: boolean; action: string; member?: TeamMember }>({ open: false, action: '' })

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [membersRes, invitesRes] = await Promise.all([
          fetch('/api/team/members'),
          fetch('/api/team/invites')
        ])

        if (membersRes.ok) {
          const data = await membersRes.json()
          setMembers(data.members || [])
          setCurrentUserRole(data.currentUserRole || 'member')
        }

        if (invitesRes.ok) {
          const data = await invitesRes.json()
          setInvites(data.invites || [])
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching team data:', error)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!member.name?.toLowerCase().includes(query) && !member.email.toLowerCase().includes(query)) {
          return false
        }
      }

      // Role filter
      if (roleFilter !== 'all' && member.role !== roleFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && member.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [members, searchQuery, roleFilter, statusFilter])

  // KPIs
  const kpis = useMemo(() => ({
    totalMembers: members.filter(m => m.status === 'active').length,
    pendingInvites: invites.filter(i => i.status === 'pending').length,
    admins: members.filter(m => (m.role === 'owner' || m.role === 'admin') && m.status === 'active').length,
    viewers: members.filter(m => m.role === 'viewer' && m.status === 'active').length
  }), [members, invites])

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'
  const hasActiveFilters = searchQuery || roleFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter('all')
    setStatusFilter('all')
  }

  // Action handlers
  const _handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/team/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      })

      if (response.ok) {
        // Optimistic update
        setMembers(prev => prev.map(m => 
          m.user_id === userId ? { ...m, role: newRole as any } : m
        ))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to change role')
      }
    } catch (error) {
      console.error('Error changing role:', error)
      alert('Failed to change role')
    }
  }

  const _handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return
    }

    try {
      const response = await fetch('/api/team/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        // Remove from state
        setMembers(prev => prev.filter(m => m.user_id !== userId))
        setSelectedMember(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  const handleResendInvite = async (inviteId: string) => {
    try {
      const response = await fetch('/api/team/invite/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId })
      })

      if (response.ok) {
        // Update the invite timestamp
        setInvites(prev => prev.map(i => 
          i.id === inviteId ? { ...i, updated_at: new Date().toISOString() } : i
        ))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to resend invitation')
      }
    } catch (error) {
      console.error('Error resending invite:', error)
      alert('Failed to resend invitation')
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return
    }

    try {
      const response = await fetch('/api/team/invite/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId })
      })

      if (response.ok) {
        // Remove from state
        setInvites(prev => prev.filter(i => i.id !== inviteId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to revoke invitation')
      }
    } catch (error) {
      console.error('Error revoking invite:', error)
      alert('Failed to revoke invitation')
    }
  }

  const handleExportCSV = () => {
    const csv = [
      ['Name', 'Email', 'Role', 'Status', 'Last Active', 'Joined'].join(','),
      ...filteredMembers.map(m => [
        m.name,
        m.email,
        m.role,
        m.status,
        timeAgo(m.last_active_at),
        new Date(m.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
                <p className="text-sm text-gray-600">Manage members, roles, and invites for your workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                disabled={filteredMembers.length === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export CSV
              </button>
              {canManage && (
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Mail className="w-4 h-4 inline mr-2" />
                  Invite member
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
              </select>

              {hasActiveFilters && (
                <>
                  <div className="w-px h-6 bg-gray-200" />
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                icon={Users}
                label="Total Members"
                value={kpis.totalMembers}
                color="text-blue-600"
              />
              <KPICard
                icon={Mail}
                label="Pending Invites"
                value={kpis.pendingInvites}
                color="text-amber-600"
              />
              <KPICard
                icon={Shield}
                label="Admins"
                value={kpis.admins}
                color="text-purple-600"
              />
              <KPICard
                icon={Eye}
                label="Viewers"
                value={kpis.viewers}
                color="text-gray-600"
              />
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                <p className="text-sm text-gray-600">{filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}</p>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {hasActiveFilters ? 'No members match your filters' : "You're the first member"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {hasActiveFilters ? 'Try adjusting your filters' : 'Invite your team to get started'}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Clear filters
                    </button>
                  ) : canManage ? (
                    <button
                      onClick={() => setInviteModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Mail className="w-4 h-4 inline mr-2" />
                      Invite team members
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Active</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Joined</th>
                        {canManage && (
                          <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredMembers.map((member, idx) => (
                        <MemberRow
                          key={member.id}
                          member={member}
                          idx={idx}
                          canManage={canManage}
                          currentUserRole={currentUserRole}
                          members={members}
                          onSelect={setSelectedMember}
                          onRoleChange={(_role) => {/* TODO: Implement */}}
                          onRemove={() => {/* TODO: Implement */}}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending Invites */}
            {invites.filter(i => i.status === 'pending').length > 0 && (
              <InvitesCard 
                invites={invites.filter(i => i.status === 'pending')} 
                canManage={canManage}
                onResend={handleResendInvite}
                onRevoke={handleRevokeInvite}
              />
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <InviteModal
          onClose={() => setInviteModalOpen(false)}
          onSuccess={(newInvites) => {
            setInvites([...invites, ...newInvites])
            setInviteModalOpen(false)
          }}
        />
      )}

      {/* Member Detail Panel */}
      {selectedMember && (
        <MemberDetailPanel
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onResendInvite={handleResendInvite}
        />
      )}
    </div>
  )
}

// KPI Card Component
function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

// Member Row Component
function MemberRow({
  member,
  idx,
  canManage,
  currentUserRole,
  members,
  onSelect,
  onRoleChange: _onRoleChange,
  onRemove: _onRemove
}: {
  member: TeamMember
  idx: number
  canManage: boolean
  currentUserRole: string
  members: TeamMember[]
  onSelect: (member: TeamMember) => void
  onRoleChange: (role: string) => void
  onRemove: () => void
}) {
  const config = roleConfig[member.role]
  const Icon = config.icon
  const isLastOwner = member.role === 'owner' && members.filter(m => m.role === 'owner' && m.status === 'active').length === 1

  return (
    <tr
      onClick={() => onSelect(member)}
      className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
    >
      <td className="py-3 px-6">
        <div className="font-medium text-gray-900">{member.name || 'Pending'}</div>
      </td>
      <td className="py-3 px-6 text-gray-600">{member.email}</td>
      <td className="py-3 px-6">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${config.color}`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </td>
      <td className="py-3 px-6">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          member.status === 'active'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {member.status === 'active' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {member.status === 'active' ? 'Active' : 'Pending'}
        </span>
      </td>
      <td className="py-3 px-6 text-gray-600 text-sm">{timeAgo(member.last_active_at)}</td>
      <td className="py-3 px-6 text-gray-600 text-sm">{new Date(member.created_at).toLocaleDateString()}</td>
      {canManage && (
        <td className="py-3 px-6 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Show actions menu
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLastOwner && currentUserRole !== 'owner'}
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        </td>
      )}
    </tr>
  )
}

// Invites Card Component
function InvitesCard({ 
  invites, 
  canManage,
  onResend,
  onRevoke
}: { 
  invites: TeamInvite[]
  canManage: boolean
  onResend: (inviteId: string) => void
  onRevoke: (inviteId: string) => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Pending Invites</h2>
        <p className="text-sm text-gray-600">{invites.length} pending invitation{invites.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="divide-y divide-gray-200">
        {invites.map((invite) => (
          <div key={invite.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{invite.email}</div>
              <div className="text-sm text-gray-600">
                Invited {timeAgo(invite.created_at)} • {roleConfig[invite.role].label}
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onResend(invite.id)}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <RefreshCw className="w-4 h-4 inline mr-1" />
                  Resend
                </button>
                <button 
                  onClick={() => onRevoke(invite.id)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Revoke
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Invite Modal Component
function InviteModal({
  onClose,
  onSuccess
}: {
  onClose: () => void
  onSuccess: (invites: TeamInvite[]) => void
}) {
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<'member' | 'admin' | 'viewer'>('member')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const emailList = emails.split(',').map(e => e.trim()).filter(Boolean)
      
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailList, role, message })
      })

      if (response.ok) {
        const data = await response.json()
        onSuccess(data.invites || [])
      }
    } catch (error) {
      console.error('Error sending invites:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite team members</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email addresses
            </label>
            <input
              type="text"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Separate multiple emails with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to your invitation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !emails}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 inline mr-2" />
                  Send invitations
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Member Detail Panel Component
function MemberDetailPanel({
  member,
  onClose,
  onResendInvite
}: {
  member: TeamMember
  onClose: () => void
  onResendInvite?: (inviteId: string) => void
}) {
  const config = roleConfig[member.role]
  const Icon = config.icon
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  // Fetch activity when panel opens
  useEffect(() => {
    async function fetchActivity() {
      if (!member.user_id) return
      
      setLoadingActivity(true)
      try {
        const response = await fetch(`/api/team/activity?userId=${member.user_id}`)
        if (response.ok) {
          const data = await response.json()
          setActivities(data.activities || [])
        }
      } catch (error) {
        console.error('Error fetching activity:', error)
      } finally {
        setLoadingActivity(false)
      }
    }

    fetchActivity()
  }, [member.user_id])

  const formatActivity = (action: string) => {
    const actionMap: Record<string, string> = {
      'invite_sent': 'Invited to team',
      'invite_accepted': 'Accepted invitation',
      'invite_resent': 'Invitation resent',
      'role_changed': 'Role changed',
      'member_joined': 'Joined team',
      'member_removed': 'Removed from team'
    }
    return actionMap[action] || action
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50">
      <div className="bg-white w-full max-w-md h-full shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Member Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Member Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{member.name || 'Pending'}</h3>
                <p className="text-sm text-gray-600">{member.email}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Role</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${config.color}`}>
                  <Icon className="w-3 h-3" />
                  {config.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  member.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {member.status === 'active' ? 'Active' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Active</span>
                <span className="text-gray-900">{timeAgo(member.last_active_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Joined</span>
                <span className="text-gray-900">{new Date(member.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Recent Activity
            </h4>
            {loadingActivity ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity: any) => (
                  <div key={activity.id} className="text-sm border-l-2 border-gray-200 pl-3 py-1">
                    <div className="text-gray-900 font-medium">{formatActivity(activity.action)}</div>
                    <div className="text-xs text-gray-500">{timeAgo(activity.timestamp)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                No recent activity
              </div>
            )}
          </div>

          {/* Actions */}
          {member.status === 'pending' && member.id && onResendInvite && (
            <button 
              onClick={() => onResendInvite(member.id)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Resend invite
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

