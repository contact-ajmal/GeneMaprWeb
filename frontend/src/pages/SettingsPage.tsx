import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, Shield, UserCog, Search, ChevronDown,
    ToggleLeft, ToggleRight, Trash2, Edit3, Check, X,
    Crown, FlaskConical, Eye, Lock, KeyRound, AlertTriangle,
    UserPlus, Plus, Mail, AtSign,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
    listUsers, updateUser, deleteUser, createUser,
    getRoles, createRole, deleteRole, getAllPermissions,
    type RolePermissions, type Permission,
} from '../api/admin'
import type { UserResponse } from '../api/auth'

type Tab = 'users' | 'roles'

const ROLE_COLORS: Record<string, string> = {
    admin: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    researcher: 'text-dna-cyan bg-dna-cyan/10 border-dna-cyan/30',
    viewer: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
}

const ROLE_ICONS: Record<string, typeof Crown> = {
    admin: Crown,
    researcher: FlaskConical,
    viewer: Eye,
}

function getRoleColor(role: string) {
    return ROLE_COLORS[role] || 'text-purple-400 bg-purple-400/10 border-purple-400/30'
}


// ═══════════════════════════════════════════════════════
// MODAL OVERLAY
// ═══════════════════════════════════════════════════════
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null
    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    className="relative glass-panel rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {children}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}


// ═══════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════════
export default function SettingsPage() {
    const { user: currentUser } = useAuth()
    const [activeTab, setActiveTab] = useState<Tab>('users')

    if (currentUser?.role !== 'admin') {
        return (
            <motion.div
                className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <Lock className="w-16 h-16 text-slate-600" />
                <h2 className="text-xl font-headline font-bold text-slate-300">Access Restricted</h2>
                <p className="text-slate-500 font-body">
                    Only administrators can access user management settings.
                </p>
            </motion.div>
        )
    }

    return (
        <motion.div
            className="p-6 max-w-7xl mx-auto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-headline font-bold text-slate-100 flex items-center gap-3">
                    <UserCog className="w-7 h-7 text-dna-cyan" />
                    Settings & Administration
                </h1>
                <p className="text-slate-400 font-body mt-1">
                    Manage users, roles, and system permissions
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
                {([
                    { key: 'users' as Tab, label: 'User Management', icon: Users },
                    { key: 'roles' as Tab, label: 'Roles & Permissions', icon: Shield },
                ]).map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm
              transition-all ${activeTab === key
                                ? 'bg-dna-cyan/20 text-dna-cyan shadow-glow-cyan'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'users' ? (
                    <UserManagementTab key="users" currentUserId={currentUser.id} />
                ) : (
                    <RolesTab key="roles" />
                )}
            </AnimatePresence>
        </motion.div>
    )
}


// ═══════════════════════════════════════════════════════
// USER MANAGEMENT TAB
// ═══════════════════════════════════════════════════════
function UserManagementTab({ currentUserId }: { currentUserId: string }) {
    const [users, setUsers] = useState<UserResponse[]>([])
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editRole, setEditRole] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [showCreateUser, setShowCreateUser] = useState(false)
    const [availableRoles, setAvailableRoles] = useState<RolePermissions[]>([])

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const data = await listUsers({
                search: search || undefined,
                role: roleFilter || undefined,
                page,
                page_size: 20,
            })
            setUsers(data.users)
            setTotal(data.total)
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }, [search, roleFilter, page])

    useEffect(() => { fetchUsers() }, [fetchUsers])
    useEffect(() => {
        getRoles().then(setAvailableRoles).catch(() => { })
    }, [])

    const handleToggleActive = async (user: UserResponse) => {
        try {
            await updateUser(user.id, { is_active: !user.is_active })
            fetchUsers()
        } catch { /* silent */ }
    }

    const handleRoleChange = async (userId: string) => {
        try {
            await updateUser(userId, { role: editRole })
            setEditingId(null)
            fetchUsers()
        } catch { /* silent */ }
    }

    const handleDelete = async (userId: string) => {
        try {
            await deleteUser(userId)
            setConfirmDeleteId(null)
            fetchUsers()
        } catch { /* silent */ }
    }

    const totalPages = Math.ceil(total / 20)

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
        >
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-dna-cyan/15
              text-slate-100 placeholder-slate-500 font-body text-sm
              focus:outline-none focus:border-dna-cyan/40 transition-colors"
                    />
                </div>

                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
                        className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white/5 border border-dna-cyan/15
              text-slate-300 font-body text-sm cursor-pointer
              focus:outline-none focus:border-dna-cyan/40 transition-colors"
                    >
                        <option value="">All Roles</option>
                        {availableRoles.map((r) => (
                            <option key={r.role} value={r.role}>{r.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <span className="text-sm text-slate-500 font-body">
                        {total} user{total !== 1 ? 's' : ''}
                    </span>
                    <motion.button
                        onClick={() => setShowCreateUser(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-sm font-semibold
              text-white bg-gradient-to-r from-dna-cyan to-blue-600
              hover:from-dna-cyan/90 hover:to-blue-500 shadow-glow-cyan transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <UserPlus className="w-4 h-4" />
                        Create User
                    </motion.button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-left px-5 py-3.5 text-xs font-body font-semibold text-slate-400 uppercase tracking-wider">User</th>
                            <th className="text-left px-5 py-3.5 text-xs font-body font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                            <th className="text-left px-5 py-3.5 text-xs font-body font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="text-left px-5 py-3.5 text-xs font-body font-semibold text-slate-400 uppercase tracking-wider">Last Login</th>
                            <th className="text-right px-5 py-3.5 text-xs font-body font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-12 text-slate-500 font-body">Loading users...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-12 text-slate-500 font-body">No users found</td></tr>
                        ) : users.map((user) => {
                            const RoleIcon = ROLE_ICONS[user.role] || Shield
                            const isSelf = user.id === currentUserId
                            return (
                                <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/[2%] transition-colors">
                                    {/* User Info */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                        bg-gradient-to-br ${user.is_active
                                                    ? 'from-dna-cyan/20 to-blue-600/20 text-dna-cyan border border-dna-cyan/20'
                                                    : 'from-slate-700 to-slate-800 text-slate-500 border border-slate-600'
                                                }`}>
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-body font-medium text-slate-200">
                                                    {user.full_name}
                                                    {isSelf && <span className="ml-2 text-[10px] text-dna-cyan bg-dna-cyan/10 px-1.5 py-0.5 rounded-full">you</span>}
                                                </p>
                                                <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Role */}
                                    <td className="px-5 py-4">
                                        {editingId === user.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={editRole}
                                                    onChange={(e) => setEditRole(e.target.value)}
                                                    className="appearance-none px-2 py-1 rounded-lg bg-white/10 border border-dna-cyan/30
                            text-slate-200 font-body text-sm focus:outline-none"
                                                >
                                                    {availableRoles.map((r) => (
                                                        <option key={r.role} value={r.role}>{r.label}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => handleRoleChange(user.id)} className="text-dna-green hover:text-dna-green/80">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-body font-medium ${getRoleColor(user.role)}`}>
                                                <RoleIcon className="w-3.5 h-3.5" />
                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace(/_/g, ' ')}
                                            </span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-body ${user.is_active ? 'text-dna-green' : 'text-dna-magenta'}`}>
                                            <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-dna-green' : 'bg-dna-magenta'}`} />
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>

                                    {/* Last Login */}
                                    <td className="px-5 py-4 text-xs text-slate-500 font-mono">
                                        {user.last_login
                                            ? new Date(user.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'Never'}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {!isSelf && (
                                                <>
                                                    <button
                                                        onClick={() => { setEditingId(user.id); setEditRole(user.role) }}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-dna-cyan hover:bg-dna-cyan/10 transition-colors"
                                                        title="Change role"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(user)}
                                                        className={`p-1.5 rounded-lg transition-colors ${user.is_active
                                                                ? 'text-slate-500 hover:text-amber-400 hover:bg-amber-400/10'
                                                                : 'text-slate-500 hover:text-dna-green hover:bg-dna-green/10'
                                                            }`}
                                                        title={user.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                    </button>
                                                    {confirmDeleteId === user.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg text-dna-magenta hover:bg-dna-magenta/10 transition-colors" title="Confirm delete">
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setConfirmDeleteId(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white/5 transition-colors" title="Cancel">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setConfirmDeleteId(user.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-dna-magenta hover:bg-dna-magenta/10 transition-colors" title="Delete user">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded-lg font-body text-sm transition-colors ${p === page ? 'bg-dna-cyan/20 text-dna-cyan' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* Create User Modal */}
            <CreateUserModal
                open={showCreateUser}
                onClose={() => setShowCreateUser(false)}
                onCreated={() => { setShowCreateUser(false); fetchUsers() }}
                availableRoles={availableRoles}
            />
        </motion.div>
    )
}


// ═══════════════════════════════════════════════════════
// CREATE USER MODAL
// ═══════════════════════════════════════════════════════
function CreateUserModal({
    open, onClose, onCreated, availableRoles,
}: {
    open: boolean
    onClose: () => void
    onCreated: () => void
    availableRoles: RolePermissions[]
}) {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('researcher')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const resetForm = () => {
        setFullName(''); setEmail(''); setPassword(''); setRole('researcher'); setError('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            await createUser({ full_name: fullName, email, password, role })
            resetForm()
            onCreated()
        } catch (err: any) {
            setError(err.message || 'Failed to create user')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal open={open} onClose={() => { resetForm(); onClose() }}>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-dna-cyan/10 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-dna-cyan" />
                    </div>
                    <div>
                        <h2 className="text-lg font-headline font-bold text-slate-100">Create New User</h2>
                        <p className="text-sm text-slate-500 font-body">Add a researcher, viewer, or admin</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-dna-magenta/10 border border-dna-magenta/30 text-sm text-dna-magenta">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-body font-medium text-slate-300 mb-1.5">Full Name</label>
                    <input
                        type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        placeholder="Dr. John Doe" required autoFocus
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-dna-cyan/15
              text-slate-100 placeholder-slate-500 font-body
              focus:outline-none focus:border-dna-cyan/50 focus:ring-1 focus:ring-dna-cyan/30 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-body font-medium text-slate-300 mb-1.5">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="researcher@lab.org" required
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-dna-cyan/15
                text-slate-100 placeholder-slate-500 font-body
                focus:outline-none focus:border-dna-cyan/50 focus:ring-1 focus:ring-dna-cyan/30 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-body font-medium text-slate-300 mb-1.5">Password</label>
                    <input
                        type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters" required minLength={8}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-dna-cyan/15
              text-slate-100 placeholder-slate-500 font-body
              focus:outline-none focus:border-dna-cyan/50 focus:ring-1 focus:ring-dna-cyan/30 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-body font-medium text-slate-300 mb-1.5">Role</label>
                    <div className="grid grid-cols-3 gap-2">
                        {availableRoles.map((r) => {
                            const RIcon = ROLE_ICONS[r.role] || Shield
                            return (
                                <button
                                    key={r.role}
                                    type="button"
                                    onClick={() => setRole(r.role)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-body transition-all ${role === r.role
                                            ? `${getRoleColor(r.role)} border-current`
                                            : 'text-slate-500 border-white/5 hover:border-white/10 hover:bg-white/[3%]'
                                        }`}
                                >
                                    <RIcon className="w-5 h-5" />
                                    <span className="font-medium">{r.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => { resetForm(); onClose() }}
                        className="flex-1 py-2.5 rounded-xl font-body text-sm text-slate-400
              border border-white/10 hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <motion.button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl font-body text-sm font-semibold text-white
              bg-gradient-to-r from-dna-cyan to-blue-600
              hover:from-dna-cyan/90 hover:to-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-glow-cyan transition-all flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4" />
                                Create User
                            </>
                        )}
                    </motion.button>
                </div>
            </form>
        </Modal>
    )
}


// ═══════════════════════════════════════════════════════
// ROLES & PERMISSIONS TAB
// ═══════════════════════════════════════════════════════
function RolesTab() {
    const [roles, setRoles] = useState<RolePermissions[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedRole, setExpandedRole] = useState<string | null>('admin')
    const [showCreateRole, setShowCreateRole] = useState(false)
    const [confirmDeleteRole, setConfirmDeleteRole] = useState<string | null>(null)

    const fetchRoles = useCallback(async () => {
        try {
            const data = await getRoles()
            setRoles(data)
        } catch { /* silent */ }
        setLoading(false)
    }, [])

    useEffect(() => { fetchRoles() }, [fetchRoles])

    const handleDeleteRole = async (roleName: string) => {
        try {
            await deleteRole(roleName)
            setConfirmDeleteRole(null)
            fetchRoles()
        } catch { /* silent */ }
    }

    if (loading) {
        return <div className="text-center py-12 text-slate-500 font-body">Loading roles...</div>
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500 font-body">
                    {roles.length} role{roles.length !== 1 ? 's' : ''} defined
                </p>
                <motion.button
                    onClick={() => setShowCreateRole(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-sm font-semibold
            text-white bg-gradient-to-r from-dna-green to-emerald-600
            hover:from-dna-green/90 hover:to-emerald-500 shadow-glow-green transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus className="w-4 h-4" />
                    Create Role
                </motion.button>
            </div>

            {/* Role Cards */}
            <div className="grid gap-4">
                {roles.map((role) => {
                    const RoleIcon = ROLE_ICONS[role.role] || Shield
                    const isExpanded = expandedRole === role.role
                    return (
                        <motion.div key={role.role} className="glass-panel rounded-2xl overflow-hidden" layout>
                            {/* Role Header */}
                            <div className="flex items-center">
                                <button
                                    onClick={() => setExpandedRole(isExpanded ? null : role.role)}
                                    className="flex-1 flex items-center gap-4 px-6 py-5 text-left hover:bg-white/[2%] transition-colors"
                                >
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${getRoleColor(role.role)}`}>
                                        <RoleIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-headline font-bold text-slate-200">{role.label}</h3>
                                            {role.is_system && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 font-mono">system</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 font-body mt-0.5">{role.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 font-mono">
                                            {role.permissions.length} perm{role.permissions.length !== 1 ? 's' : ''}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Delete custom role */}
                                {!role.is_system && (
                                    <div className="pr-4">
                                        {confirmDeleteRole === role.role ? (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleDeleteRole(role.role)} className="p-1.5 rounded-lg text-dna-magenta hover:bg-dna-magenta/10" title="Confirm">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setConfirmDeleteRole(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white/5" title="Cancel">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setConfirmDeleteRole(role.role)} className="p-1.5 rounded-lg text-slate-500 hover:text-dna-magenta hover:bg-dna-magenta/10 transition-colors" title="Delete role">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Permissions List */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-5 border-t border-white/5 pt-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {role.permissions.map((perm) => (
                                                    <div key={perm.key} className="flex items-start gap-3 p-3 rounded-xl bg-white/[3%] border border-white/5">
                                                        <KeyRound className="w-4 h-4 text-dna-cyan mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-body font-medium text-slate-300">{perm.label}</p>
                                                            <p className="text-xs text-slate-500 font-body mt-0.5">{perm.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {role.role === 'viewer' && (
                                                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
                                                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                                    <p className="text-xs text-amber-400/80 font-body">
                                                        Viewers have read-only access. They cannot upload samples, modify data, or generate new reports.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )
                })}
            </div>

            {/* Create Role Modal */}
            <CreateRoleModal
                open={showCreateRole}
                onClose={() => setShowCreateRole(false)}
                onCreated={() => { setShowCreateRole(false); fetchRoles() }}
            />
        </motion.div>
    )
}


// ═══════════════════════════════════════════════════════
// CREATE ROLE MODAL
// ═══════════════════════════════════════════════════════
function CreateRoleModal({
    open, onClose, onCreated,
}: {
    open: boolean
    onClose: () => void
    onCreated: () => void
}) {
    const [name, setName] = useState('')
    const [label, setLabel] = useState('')
    const [description, setDescription] = useState('')
    const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
    const [allPerms, setAllPerms] = useState<Permission[]>([])
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        getAllPermissions().then(setAllPerms).catch(() => { })
    }, [])

    const resetForm = () => {
        setName(''); setLabel(''); setDescription(''); setSelectedPerms(new Set()); setError('')
    }

    const togglePerm = (key: string) => {
        setSelectedPerms((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const handleLabelChange = (val: string) => {
        setLabel(val)
        // Auto-generate slug from label
        setName(val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (selectedPerms.size === 0) {
            setError('Select at least one permission')
            return
        }

        setSubmitting(true)
        try {
            await createRole({
                name,
                label,
                description,
                permissions: Array.from(selectedPerms),
            })
            resetForm()
            onCreated()
        } catch (err: any) {
            setError(err.message || 'Failed to create role')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal open={open} onClose={() => { resetForm(); onClose() }}>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-dna-green/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-dna-green" />
                    </div>
                    <div>
                        <h2 className="text-lg font-headline font-bold text-slate-100">Create New Role</h2>
                        <p className="text-sm text-slate-500 font-body">Define custom permissions for a new role</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-dna-magenta/10 border border-dna-magenta/30 text-sm text-dna-magenta">
                        {error}
                    </div>
                )}

                {/* Role Label */}
                <div>
                    <label className="block text-sm font-body font-medium text-slate-300 mb-1.5">Role Display Name</label>
                    <input
                        type="text" value={label} onChange={(e) => handleLabelChange(e.target.value)}
                        placeholder="e.g., Lab Technician" required autoFocus
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-dna-cyan/15
              text-slate-100 placeholder-slate-500 font-body
              focus:outline-none focus:border-dna-cyan/50 focus:ring-1 focus:ring-dna-cyan/30 transition-colors"
                    />
                    {name && (
                        <p className="mt-1 text-xs text-slate-500 font-mono flex items-center gap-1">
                            <AtSign className="w-3 h-3" /> Slug: {name}
                        </p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-body font-medium text-slate-300 mb-1.5">Description</label>
                    <input
                        type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of what this role can do"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-dna-cyan/15
              text-slate-100 placeholder-slate-500 font-body
              focus:outline-none focus:border-dna-cyan/50 focus:ring-1 focus:ring-dna-cyan/30 transition-colors"
                    />
                </div>

                {/* Permission Picker */}
                <div>
                    <label className="block text-sm font-body font-medium text-slate-300 mb-2">
                        Permissions
                        <span className="text-slate-500 font-normal ml-2">
                            ({selectedPerms.size} selected)
                        </span>
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                        {allPerms.map((perm) => {
                            const selected = selectedPerms.has(perm.key)
                            return (
                                <button
                                    key={perm.key}
                                    type="button"
                                    onClick={() => togglePerm(perm.key)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selected
                                            ? 'bg-dna-cyan/10 border-dna-cyan/30 text-slate-200'
                                            : 'bg-white/[2%] border-white/5 text-slate-400 hover:border-white/10'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${selected
                                            ? 'bg-dna-cyan border-dna-cyan text-white'
                                            : 'border-slate-600'
                                        }`}>
                                        {selected && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-body font-medium">{perm.label}</p>
                                        <p className="text-xs text-slate-500 font-body">{perm.description}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => { resetForm(); onClose() }}
                        className="flex-1 py-2.5 rounded-xl font-body text-sm text-slate-400
              border border-white/10 hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <motion.button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl font-body text-sm font-semibold text-white
              bg-gradient-to-r from-dna-green to-emerald-600
              hover:from-dna-green/90 hover:to-emerald-500
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-glow-green transition-all flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Create Role
                            </>
                        )}
                    </motion.button>
                </div>
            </form>
        </Modal>
    )
}
