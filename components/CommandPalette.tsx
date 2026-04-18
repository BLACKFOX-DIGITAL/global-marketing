'use client'

import { useState, useEffect } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { Search, Briefcase, ListTodo, User } from 'lucide-react'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ leads: any[], opportunities: any[], tasks: any[] }>({ leads: [], opportunities: [], tasks: [] })
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 2) {
        setResults({ leads: [], opportunities: [], tasks: [] })
        return
      }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
      } catch (e) {
        console.error(e)
      }
    }
    
    const timeout = setTimeout(fetchResults, 200)
    return () => clearTimeout(timeout)
  }, [query])

  if (!open) return null

  const handleSelect = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Global Command Menu" className="command-palette-dialog">
      <div className="command-palette-overlay" onClick={() => setOpen(false)} />
      <div className="command-palette" style={{
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(40px)', 
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div className="command-palette-input-wrapper" style={{ display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <Search size={18} color="#64748b" />
          <Command.Input 
            value={query} 
            onValueChange={setQuery} 
            placeholder="Search leads, opportunities, tasks... (Cmd+K)" 
            className="command-palette-input cmdk-input-reset" 
            style={{ 
              border: 'none', background: 'transparent', color: '#f8fafc', 
              fontSize: 16, padding: '20px 16px', outline: 'none', width: '100%' 
            }}
          />
        </div>
        
        <Command.List className="command-palette-list">
          {query.length > 0 && results.leads.length === 0 && results.opportunities.length === 0 && results.tasks.length === 0 && (
            <Command.Empty className="command-palette-empty">No results found.</Command.Empty>
          )}

          {results.opportunities?.length > 0 && (
            <Command.Group heading="Opportunities" className="command-palette-group">
              {results.opportunities.map(opp => (
                <Command.Item key={opp.id} onSelect={() => handleSelect(`/opportunities/${opp.id}`)} className="command-palette-item">
                  <Briefcase size={16} />
                  <span>{opp.title}</span>
                  {opp.company && <span className="command-palette-item-muted">— {opp.company}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.leads?.length > 0 && (
            <Command.Group heading="Leads" className="command-palette-group">
              {results.leads.map(lead => (
                <Command.Item key={lead.id} onSelect={() => handleSelect(`/leads/${lead.id}`)} className="command-palette-item">
                  <User size={16} />
                  <span>{lead.name}</span>
                  {lead.company && <span className="command-palette-item-muted">— {lead.company}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.tasks?.length > 0 && (
            <Command.Group heading="Tasks" className="command-palette-group">
              {results.tasks.map(task => (
                <Command.Item key={task.id} onSelect={() => handleSelect(`/tasks`)} className="command-palette-item">
                  <ListTodo size={16} />
                  <span>{task.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
