'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Check, X, GripVertical, Settings, Activity, Database, Clock, Waves, Briefcase, Zap, Users, User, Mail, Palmtree, Ban, ShieldAlert } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface SystemOption { id: string; category: string; value: string; color: string | null; order: number }
interface TeamMember { id: string; name: string; email: string; role: string; createdAt: string; baseSalary: number; resendSenderEmail?: string | null; isSuspended: boolean }
interface EmailTemplate { id: string; name: string; subject: string; body: string; createdAt: string }
interface Holiday { id: string; name: string; description: string | null; date: string }

const SETTINGS_GROUPS = [
    {
        name: 'Definitions',
        categories: [
            { id: 'LEAD_STATUS', label: 'Lead Statuses', icon: Activity },
            { id: 'LEAD_INDUSTRY', label: 'Lead Industries', icon: Database },
            { id: 'LEAD_POSITION', label: 'Lead Positions', icon: Users },
            { id: 'OPPORTUNITY_STAGE', label: 'Opportunity Stages', icon: Zap },
            { id: 'TASK_PRIORITY', label: 'Task Priorities', icon: Briefcase },
            { id: 'LEAVE_TYPE', label: 'Leave Types', icon: Clock },
        ]
    },
    {
        name: 'Operation',
        categories: [
            { id: 'TEAM_MEMBERS', label: 'Team Members', icon: Users },
            { id: 'HOLIDAYS', label: 'Company Holidays', icon: Palmtree },
        ]
    },
    {
        name: 'Logic & Rules',
        categories: [
            { id: 'LEAD_POOL', label: 'Lead Reassignment', icon: Waves },
            { id: 'GAMIFICATION', label: 'Gamification & XP', icon: Zap },
        ]
    },
    {
        name: 'Connections',
        categories: [
            { id: 'EMAIL_INTEGRATION', label: 'Email Integration', icon: Mail }
        ]
    }
]

const CATEGORIES = SETTINGS_GROUPS.flatMap(g => g.categories)

export default function AdminSettings() {
    const [options, setOptions] = useState<SystemOption[]>([])
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [templates, setTemplates] = useState<EmailTemplate[]>([])
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processing, setProcessing] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [modalConfirm, setModalConfirm] = useState<{ title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' } | null>(null)
    const [configs, setConfigs] = useState<Record<string, string>>({
        RECYCLE_DAYS: '60', CLAIM_LIMIT: '10', RESEND_API_KEY: '', RESEND_WEBHOOK_SECRET: '',
        RECLAIM_HIGH: '7', WARN_HIGH: '5',
        RECLAIM_MEDIUM: '14', WARN_MEDIUM: '12',
        RECLAIM_LOW: '21', WARN_LOW: '19',
        XP_CALL_ATTEMPT: '15', XP_MAIL_ATTEMPT: '10', XP_TASK_COMPLETED: '10', XP_LEAD_CONVERTED: '50', XP_OPPORTUNITY_WON: '100', XP_POOL_CLAIM: '5',
        XP_LEAD_CREATED: '5', XP_TASK_CREATED: '3',
    })

    const [adding, setAdding] = useState(false)
    const [newValue, setNewValue] = useState('')
    const [newColor, setNewColor] = useState('#3b82f6')

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [editColor, setEditColor] = useState('')

    const [editingUser, setEditingUser] = useState<TeamMember | null>(null)
    const [editUserName, setEditUserName] = useState('')
    const [editUserEmail, setEditUserEmail] = useState('')
    const [editUserRole, setEditUserRole] = useState('')
    const [editUserSalary, setEditUserSalary] = useState(0)
    const [editUserSenderEmail, setEditUserSenderEmail] = useState('')
    const [editUserPassword, setEditUserPassword] = useState('')

    const [newUserName, setNewUserName] = useState('')
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserPassword, setNewUserPassword] = useState('')
    const [newUserRole, setNewUserRole] = useState('Sales Rep')
    const [newUserSalary, setNewUserSalary] = useState(0)

    const [templateId, setTemplateId] = useState<string | null>(null)
    const [templateName, setTemplateName] = useState('')
    const [templateSubject, setTemplateSubject] = useState('')
    const [templateBody, setTemplateBody] = useState('')

    const [holidayName, setHolidayName] = useState('')
    const [holidayDate, setHolidayDate] = useState('')
    const [holidayDesc, setHolidayDesc] = useState('')

    async function fetchData() {
        setLoading(true)
        try {
            const [optsRes, configRes, usersRes, holidayRes, templatesRes] = await Promise.all([
                fetch(`/api/admin/settings`), fetch(`/api/admin/config`), fetch(`/api/admin/users`), fetch(`/api/admin/holidays`), fetch(`/api/admin/email-templates`)
            ])
            if (optsRes.ok) setOptions((await optsRes.json()).options)
            else if (optsRes.status === 403) setError('Only System Admins can access configuration settings.')
            if (configRes.ok) { const d = await configRes.json(); setConfigs(prev => ({ ...prev, ...d.settings })) }
            if (usersRes.ok) setTeamMembers((await usersRes.json()).users)
            if (holidayRes.ok) setHolidays((await holidayRes.json()).holidays)
            if (templatesRes.ok) setTemplates((await templatesRes.json()).templates)
        } catch { setError('Failed to fetch data.') } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const filteredOptions = options.filter(o => o.category === activeCategory).sort((a, b) => a.order - b.order)

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setProcessing('add')
        const order = filteredOptions.length > 0 ? Math.max(...filteredOptions.map(o => o.order)) + 1 : 0
        const res = await fetch('/api/admin/settings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: activeCategory, value: newValue, color: newColor, order })
        })
        if (res.ok) { setOptions([...options, await res.json()]); setAdding(false); setNewValue(''); setNewColor('#3b82f6') }
        else alert((await res.json()).error || 'Failed to add option')
        setProcessing(null)
    }

    async function handleUpdateConfig(key: string, value: string) {
        setProcessing(key)
        const res = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) })
        if (res.ok) setConfigs(prev => ({ ...prev, [key]: value }))
        setProcessing(null)
    }

    async function handleEditSave() {
        if (!editingId) return
        setProcessing(editingId)
        const res = await fetch(`/api/admin/settings/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: editValue, color: editColor }) })
        if (res.ok) { const updated = await res.json(); setOptions(options.map(o => o.id === editingId ? updated : o)); setEditingId(null) }
        setProcessing(null)
    }

    async function handleDelete(id: string) {
        setProcessing(id)
        if ((await fetch(`/api/admin/settings/${id}`, { method: 'DELETE' })).ok) { setOptions(options.filter(o => o.id !== id)); setDeleteConfirmId(null) }
        setProcessing(null)
    }

    async function handleUserUpdate() {
        if (!editingUser) return
        setProcessing(editingUser.id)
        const res = await fetch(`/api/admin/users`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                id: editingUser.id, 
                name: editUserName, 
                email: editUserEmail, 
                role: editUserRole, 
                baseSalary: editUserSalary, 
                resendSenderEmail: editUserSenderEmail,
                password: editUserPassword || undefined
            }) 
        })
        if (res.ok) { 
            const updated = await res.json()
            setTeamMembers(teamMembers.map(u => u.id === updated.id ? { ...u, ...updated } : u))
            setEditingUser(null)
            setEditUserPassword('')
        }
        setProcessing(null)
    }

    async function handleAddUser(e: React.FormEvent) {
        e.preventDefault()
        setProcessing('add-user')
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newUserName,
                email: newUserEmail,
                password: newUserPassword,
                role: newUserRole,
                baseSalary: newUserSalary
            })
        })
        if (res.ok) {
            const newUser = await res.json()
            setTeamMembers(prev => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name)))
            setAdding(false)
            setNewUserName('')
            setNewUserEmail('')
            setNewUserPassword('')
            setNewUserRole('Sales Rep')
            setNewUserSalary(0)
        } else {
            alert((await res.json()).error || 'Failed to create user')
        }
        setProcessing(null)
    }

    async function handleUserDelete(id: string) {
        setModalConfirm({
            title: 'Delete Team Member',
            message: 'Are you sure you want to delete this team member? This action cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
                setProcessing(id)
                const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
                if (res.ok) setTeamMembers(teamMembers.filter(u => u.id !== id))
                setProcessing(null)
                setModalConfirm(null)
            }
        })
    }

    async function handleUserSuspend(id: string, currentlySuspended: boolean) {
        setModalConfirm({
            title: currentlySuspended ? 'Unsuspend Member' : 'Suspend Member',
            message: `Are you sure you want to ${currentlySuspended ? 'unsuspend' : 'suspend'} this team member?`,
            type: currentlySuspended ? 'info' : 'danger',
            onConfirm: async () => {
                setProcessing(id)
                const res = await fetch(`/api/admin/users`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isSuspended: !currentlySuspended }) })
                if (res.ok) setTeamMembers(teamMembers.map(u => u.id === id ? { ...u, isSuspended: !currentlySuspended } : u))
                setProcessing(null)
                setModalConfirm(null)
            }
        })
    }

    async function handleAddHoliday(e: React.FormEvent) {
        e.preventDefault(); setProcessing('add-holiday')
        const res = await fetch('/api/admin/holidays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: holidayName, date: holidayDate, description: holidayDesc }) })
        if (res.ok) { setHolidays([...holidays, await res.json()].sort((a,b)=>new Date(a.date).getTime() - new Date(b.date).getTime())); setAdding(false); setHolidayName(''); setHolidayDate(''); setHolidayDesc('') }
        setProcessing(null)
    }

    async function handleDeleteHoliday(id: string) {
        setProcessing(id); if ((await fetch(`/api/admin/holidays/${id}`, { method: 'DELETE' })).ok) setHolidays(holidays.filter(h => h.id !== id)); setProcessing(null)
    }

    async function handleSaveTemplate(e: React.FormEvent) {
        e.preventDefault(); setProcessing('template')
        const res = await fetch(templateId ? `/api/admin/email-templates/${templateId}` : '/api/admin/email-templates', { method: templateId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: templateName, subject: templateSubject, body: templateBody }) })
        if (res.ok) { await fetchData(); setAdding(false); setTemplateId(null); setTemplateName(''); setTemplateSubject(''); setTemplateBody('') }
        setProcessing(null)
    }

    async function handleDeleteEmailTemplate(id: string) {
        setModalConfirm({
            title: 'Delete Template',
            message: 'Are you sure you want to delete this email template?',
            type: 'danger',
            onConfirm: async () => {
                setProcessing(id)
                if ((await fetch(`/api/admin/email-templates/${id}`, { method: 'DELETE' })).ok) setTemplates(templates.filter(t => t.id !== id))
                setProcessing(null)
                setModalConfirm(null)
            }
        })
    }

    async function handleRestoreDefaults() {
        setModalConfirm({
            title: 'Restore Defaults',
            message: 'This will add all original standard job positions to your list. Continue?',
            type: 'info',
            onConfirm: async () => {
                setProcessing('import-defaults')
                const POSITIONS = [
                    "Retoucher", "Senior Retoucher", "Image Editor", "Photo Editor", "E-commerce Retoucher", 
                    "High-End Retoucher", "Colorist", "Art Director", "Creative Director", "Studio Manager", 
                    "Production Manager", "Photography Assistant", "Quality Control Specialist", "Visual Merchandiser", 
                    "CEO", "Founder", "Co-Founder", "Owner", "President", "Managing Director", 
                    "Operations Manager", "General Manager", "Project Manager", "Account Manager", "Marketing Manager"
                ]

                const existingValues = filteredOptions.map(o => o.value.toLowerCase())
                const toAdd = POSITIONS.filter(p => !existingValues.includes(p.toLowerCase()))

                if (toAdd.length === 0) {
                    alert('All standard positions are already present.')
                    setProcessing(null)
                    setModalConfirm(null)
                    return
                }

                let addedCount = 0
                for (const val of toAdd) {
                    const order = filteredOptions.length + addedCount
                    const res = await fetch('/api/admin/settings', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ category: 'LEAD_POSITION', value: val, color: '#6366f1', order })
                    })
                    if (res.ok) addedCount++
                }

                await fetchData()
                alert(`Successfully imported ${addedCount} standard positions.`)
                setProcessing(null)
                setModalConfirm(null)
            }
        })
    }

    if (error) return <div style={{ padding: 40, textAlign: 'center' }}>{error}</div>

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent-primary), #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' }}>
                        <Settings size={20} color="#fff" strokeWidth={2.5} />
                    </div>
                    Settings
                </h1>
                <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: 13, fontWeight: 600 }}>Global configurations, taxonomies, and team management settings.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
                
                {/* Precision Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {SETTINGS_GROUPS.map(group => (
                        <div key={group.name}>
                            <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10, paddingLeft: 12 }}>
                                {group.name}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {group.categories.map(cat => {
                                    const active = activeCategory === cat.id
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => { setActiveCategory(cat.id); setAdding(false) }}
                                            style={{
                                                width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 8,
                                                background: active ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                                color: active ? '#f8fafc' : '#94a3b8',
                                                display: 'flex', alignItems: 'center', gap: 10, fontSize: '12.5px', fontWeight: active ? 700 : 600,
                                                cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                                                border: 'none', overflow: 'hidden'
                                            }}
                                        >
                                            {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'var(--accent-primary)', borderRadius: '0 4px 4px 0' }} />}
                                            <cat.icon size={14} strokeWidth={active ? 2.5 : 2} style={{ color: active ? 'var(--accent-primary)' : 'inherit', opacity: active ? 1 : 0.7 }} />
                                            {cat.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Matrix Content Area */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, minHeight: 600, backdropFilter: 'blur(20px)', position: 'relative' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.3px' }}>{CATEGORIES.find(c => c.id === activeCategory)?.label}</h2>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {activeCategory === 'LEAD_POSITION' && !adding && (
                                <button 
                                    onClick={handleRestoreDefaults} 
                                    disabled={processing === 'import-defaults'}
                                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, border: '1px solid var(--border)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', textTransform: 'uppercase' }}
                                >
                                    {processing === 'import-defaults' ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Database size={12} strokeWidth={2.5} />}
                                    Restore Defaults
                                </button>
                            )}
                            {activeCategory === 'TEAM_MEMBERS' ? (
                                !adding && <button onClick={() => setAdding(true)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 900, background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}><Plus size={14} strokeWidth={3} /> New Member</button>
                            ) : activeCategory === 'EMAIL_INTEGRATION' ? (
                                !adding && <button onClick={() => { setAdding(true); setTemplateId(null); setTemplateName(''); setTemplateSubject(''); setTemplateBody('') }} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 900, background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}><Plus size={14} strokeWidth={3} /> New Template</button>
                            ) : activeCategory === 'HOLIDAYS' ? (
                                !adding && <button onClick={() => setAdding(true)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 900, background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}><Plus size={14} strokeWidth={3} /> Add Holiday</button>
                            ) : (
                                !adding && <button onClick={() => setAdding(true)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 900, background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}><Plus size={14} strokeWidth={3} /> Add Option</button>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: 24 }}>
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
                        ) : activeCategory === 'LEAD_POOL' ? (
                            <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                        <div style={{ width: 4, height: 16, background: 'var(--accent-primary)', borderRadius: 2 }} />
                                        <h4 style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto-Reclaim Timers</h4>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                        {[
                                            { id: 'HIGH', label: 'Priority: High', color: '#f43f5e', warn: configs.WARN_HIGH, reclaim: configs.RECLAIM_HIGH },
                                            { id: 'MEDIUM', label: 'Priority: Mid', color: '#f59e0b', warn: configs.WARN_MEDIUM, reclaim: configs.RECLAIM_MEDIUM },
                                            { id: 'LOW', label: 'Priority: Low', color: '#10b981', warn: configs.WARN_LOW, reclaim: configs.RECLAIM_LOW },
                                        ].map(lvl => (
                                            <div key={lvl.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', backdropFilter: 'blur(10px)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: lvl.color }} />
                                                    <h5 style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>{lvl.label}</h5>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 4, color: '#475569', textTransform: 'uppercase' }}>Warning (Days)</label>
                                                        <input type="number" value={lvl.warn} onChange={e => handleUpdateConfig(`WARN_${lvl.id}`, e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 4, color: '#475569', textTransform: 'uppercase' }}>Reclaim (Days)</label>
                                                        <input type="number" value={lvl.reclaim} onChange={e => handleUpdateConfig(`RECLAIM_${lvl.id}`, e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 4, color: '#f8fafc', textTransform: 'uppercase' }}>Lost Lead Cooldown</label>
                                        <p style={{ fontSize: 10, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>Days before a 'Lost' lead re-enters the pool.</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <input type="number" value={configs.RECYCLE_DAYS} onChange={e => handleUpdateConfig('RECYCLE_DAYS', e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 13, fontWeight: 900, outline: 'none' }} />
                                            <span style={{ fontSize: 10, fontWeight: 900, color: '#475569' }}>DAYS</span>
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 4, color: '#f8fafc', textTransform: 'uppercase' }}>Max Active Leads</label>
                                        <p style={{ fontSize: 10, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>Maximum leads a rep can actively own at once.</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <input type="number" value={configs.CLAIM_LIMIT} onChange={e => handleUpdateConfig('CLAIM_LIMIT', e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 13, fontWeight: 900, outline: 'none' }} />
                                            <span style={{ fontSize: 10, fontWeight: 900, color: '#475569' }}>MAX</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : activeCategory === 'GAMIFICATION' ? (
                            <div style={{ maxWidth: 900 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                    <div style={{ width: 4, height: 16, background: 'var(--accent-primary)', borderRadius: 2 }} />
                                    <h4 style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>XP Point Values</h4>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                    {[
                                        { key: 'CALL_ATTEMPT', label: 'Call Logged', desc: 'Phone call to a lead' },
                                        { key: 'MAIL_ATTEMPT', label: 'Email Sent', desc: 'Email sent to a lead' },
                                        { key: 'TASK_COMPLETED', label: 'Task Completed', desc: 'Task marked as done' },
                                        { key: 'TASK_CREATED', label: 'Task Created', desc: 'New task added' },
                                        { key: 'LEAD_CREATED', label: 'Lead Created', desc: 'New lead added' },
                                        { key: 'LEAD_CONVERTED', label: 'Lead Converted', desc: 'Lead advanced in stage' },
                                        { key: 'OPPORTUNITY_WON', label: 'Deal Won', desc: 'Opportunity closed as won' },
                                        { key: 'POOL_CLAIM', label: 'Pool Claim', desc: 'Lead claimed from the pool' },
                                    ].map(({ key, label, desc }) => (
                                        <div key={key} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', marginBottom: 2 }}>{label}</label>
                                                <label style={{ display: 'block', fontSize: 9, color: '#475569', fontWeight: 700, lineHeight: 1.2, marginBottom: 10 }}>{desc}</label>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <input type="number" value={configs[`XP_${key}`]} onChange={e => handleUpdateConfig(`XP_${key}`, e.target.value)} style={{ flex: 1, padding: 0, border: 'none', background: 'transparent', color: 'var(--accent-primary)', fontSize: 13, fontWeight: 900, outline: 'none', textAlign: 'center' }} />
                                                <span style={{ fontSize: 9, fontWeight: 950, color: '#475569' }}>XP</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : activeCategory === 'TEAM_MEMBERS' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {adding && (
                                    <form onSubmit={handleAddUser} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 12, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                                            <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Full Name</label><input value={newUserName} onChange={e => setNewUserName(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                            <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Email Address</label><input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                            <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Password</label><input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Role</label>
                                                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }}>
                                                    <option value="Sales Rep">Sales Rep</option>
                                                    <option value="Administrator">Administrator</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Base Salary (৳)</label>
                                                <input type="number" value={newUserSalary} onChange={e => setNewUserSalary(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                            <button type="button" onClick={() => setAdding(false)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>Cancel</button>
                                            <button type="submit" disabled={processing === 'add-user'} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>Create Account</button>
                                        </div>
                                    </form>
                                )}
                                {teamMembers.map(member => (
                                    <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', transition: 'all 0.2s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'var(--accent-primary)' }}>{member.name.substring(0,2).toUpperCase()}</div>
                                            <div>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc' }}>{member.name}</span>
                                                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{member.role}</span>
                                                    {member.isSuspended && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)', color: '#f43f5e', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><Ban size={10} /> Suspended</span>}
                                                </div>
                                                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{member.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => { setEditingUser(member); setEditUserName(member.name); setEditUserEmail(member.email); setEditUserRole(member.role); setEditUserSalary(member.baseSalary || 0); setEditUserSenderEmail(member.resendSenderEmail || ''); setEditUserPassword('') }} style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: '#94a3b8', fontSize: 10, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' }}>Edit</button>
                                            <button 
                                                onClick={() => handleUserSuspend(member.id, member.isSuspended)} 
                                                disabled={processing === member.id}
                                                style={{ 
                                                    padding: '5px 10px', 
                                                    border: `1px solid ${member.isSuspended ? '#10b98133' : '#f59e0b33'}`, 
                                                    borderRadius: 6, 
                                                    background: 'transparent', 
                                                    color: member.isSuspended ? '#10b981' : '#f59e0b', 
                                                    fontSize: 10, 
                                                    fontWeight: 950, 
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                {member.isSuspended ? 'Reactivate' : 'Suspend'}
                                            </button>
                                            <button 
                                                onClick={() => handleUserDelete(member.id)} 
                                                disabled={processing === member.id}
                                                style={{ 
                                                    padding: '5px 10px', 
                                                    border: '1px solid #ef444433', 
                                                    borderRadius: 6, 
                                                    background: 'transparent', 
                                                    color: '#f43f5e', 
                                                    fontSize: 10, 
                                                    fontWeight: 950, 
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                <Trash2 size={12} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activeCategory === 'EMAIL_INTEGRATION' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div style={{ maxWidth: 800 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                        <div style={{ width: 4, height: 16, background: 'var(--accent-primary)', borderRadius: 2 }} />
                                        <h4 style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Provider Settings</h4>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>API Access Token</label>
                                            <input type="password" value={configs.RESEND_API_KEY} onChange={e => handleUpdateConfig('RESEND_API_KEY', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Webhook Secret</label>
                                            <input type="password" value={configs.RESEND_WEBHOOK_SECRET} onChange={e => handleUpdateConfig('RESEND_WEBHOOK_SECRET', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                        <div style={{ width: 4, height: 16, background: '#10b981', borderRadius: 2 }} />
                                        <h4 style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Templates</h4>
                                    </div>
                                    {adding && (
                                        <form onSubmit={handleSaveTemplate} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(24px)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                                <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Template Name</label><input value={templateName} onChange={e => setTemplateName(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                                <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Email Subject</label><input value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                            </div>
                                            <div style={{ marginBottom: 12 }}><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Email Body (HTML)</label><textarea value={templateBody} onChange={e => setTemplateBody(e.target.value)} required rows={4} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 11, fontWeight: 700, outline: 'none', resize: 'none', lineHeight: 1.5 }} /></div>
                                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                                <button type="button" onClick={() => setAdding(false)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>Cancel</button>
                                                <button type="submit" disabled={processing === 'template'} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>Save Template</button>
                                            </div>
                                        </form>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {templates.length === 0 ? <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, padding: 20, textAlign: 'center' }}>No templates yet</div> : templates.map(t => (
                                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><Mail size={14} strokeWidth={2.5} /></div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc' }}>{t.name}</div>
                                                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{t.subject}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => { setAdding(true); setTemplateId(t.id); setTemplateName(t.name); setTemplateSubject(t.subject); setTemplateBody(t.body) }} style={{ padding: 6, background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}><Edit2 size={13} strokeWidth={2.5} /></button>
                                                    <button onClick={() => handleDeleteEmailTemplate(t.id)} style={{ padding: 6, background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={13} strokeWidth={2.5} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : activeCategory === 'HOLIDAYS' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {adding && (
                                     <form onSubmit={handleAddHoliday} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 8, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                                            <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Holiday Name</label><input value={holidayName} onChange={e => setHolidayName(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                            <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Date</label><input type="date" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} required style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                            <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Description</label><input value={holidayDesc} onChange={e => setHolidayDesc(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                            <button type="button" onClick={() => setAdding(false)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>Cancel</button>
                                            <button type="submit" disabled={processing === 'add-holiday'} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>Save Holiday</button>
                                        </div>
                                     </form>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                                    {holidays.map(h => (
                                        <div key={h.id} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc' }}>{h.name}</div>
                                                <div style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 900, marginTop: 2, textTransform: 'uppercase' }}>{format(parseISO(h.date), 'MMM dd, yyyy')}</div>
                                            </div>
                                            <button onClick={() => handleDeleteHoliday(h.id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 6, borderRadius: 6 }}><Trash2 size={13} strokeWidth={2.5} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {adding && (
                                    <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', marginBottom: 12 }}>
                                        <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Option name" required style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ padding: 0, width: 36, height: 32, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button type="button" onClick={() => setAdding(false)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>Cancel</button>
                                            <button type="submit" disabled={processing === 'add'} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>Add</button>
                                        </div>
                                    </form>
                                )}
                                {filteredOptions.length === 0 ? <div style={{ color: '#475569', fontSize: 11, fontWeight: 700, padding: 20, textAlign: 'center' }}>No options added yet</div> : filteredOptions.map(opt => (
                                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', transition: 'all 0.2s' }}>
                                        {editingId === opt.id ? (
                                            <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center' }}>
                                                <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ padding: 0, width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                                                <button onClick={handleEditSave} style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer' }}><Check size={16} strokeWidth={3} /></button>
                                                <button onClick={() => setEditingId(null)} style={{ border: 'none', background: 'transparent', color: '#f43f5e', cursor: 'pointer' }}><X size={16} strokeWidth={3} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color || '#3b82f6', boxShadow: `0 0 10px ${opt.color || '#3b82f6'}40` }} />
                                                    <span style={{ fontWeight: 800, fontSize: 13, color: '#f1f5f9' }}>{opt.value}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => { setEditingId(opt.id); setEditValue(opt.value); setEditColor(opt.color || '#3b82f6') }} style={{ padding: 6, border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer' }}><Edit2 size={13} strokeWidth={2.5} /></button>
                                                    <button onClick={() => handleDelete(opt.id)} style={{ padding: 6, border: 'none', background: 'transparent', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={13} strokeWidth={2.5} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal 
                isOpen={!!modalConfirm}
                onClose={() => setModalConfirm(null)}
                title={modalConfirm?.title || ''}
                message={modalConfirm?.message || ''}
                onConfirm={modalConfirm?.onConfirm || (() => {})}
                type={modalConfirm?.type || 'info'}
            />

            {/* Edit Executive Identity Modal */}
            {editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && setEditingUser(null)}>
                    <div style={{ width: 440, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, boxShadow: '0 0 50px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: 'radial-gradient(circle at 100% 0%, var(--accent-primary)15, transparent)', pointerEvents: 'none' }} />
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                <User size={18} strokeWidth={2.5} />
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>Update Account</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Full Name</label><input value={editUserName} onChange={e => setEditUserName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                                <div><label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Email Address</label><input value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} /></div>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Role</label>
                                <select value={editUserRole} onChange={e => setEditUserRole(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }}>
                                    <option value="Sales Rep">Sales Rep</option>
                                    <option value="Administrator">Administrator</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>Base Salary (৳)</label>
                                    <input type="number" value={editUserSalary} onChange={e => setEditUserSalary(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 9, fontWeight: 900, marginBottom: 6, color: '#475569', textTransform: 'uppercase' }}>New Password</label>
                                    <input type="password" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} placeholder="Leave blank to keep unchanged" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#f8fafc', fontSize: 12, fontWeight: 800, outline: 'none' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                <button onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: '#64748b', fontWeight: 900, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>Cancel</button>
                                <button onClick={handleUserUpdate} disabled={processing === editingUser.id} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 900, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Modal({ isOpen, onClose, title, message, onConfirm, type }: { isOpen: boolean, onClose: () => void, title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' }) {
    if (!isOpen) return null
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 1000 }}>
            <div className="modal glass" style={{ maxWidth: 440, padding: 32, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ 
                        width: 64, height: 64, 
                        background: type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                        color: type === 'danger' ? '#ef4444' : 'var(--accent-primary)', 
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
                    }}>
                        {type === 'danger' ? <ShieldAlert size={32} /> : <Database size={32} />}
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 10 }}>Cancel</button>
                    <button 
                        className="btn-primary" 
                        onClick={onConfirm} 
                        style={{ 
                            flex: 1, padding: '12px 0', borderRadius: 10,
                            background: type === 'danger' ? '#ef4444' : 'var(--accent-primary)', 
                            borderColor: type === 'danger' ? '#ef4444' : 'var(--accent-primary)' 
                        }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    )
}
