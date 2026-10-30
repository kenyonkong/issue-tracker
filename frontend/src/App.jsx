import { useEffect, useMemo, useState } from 'react'

const STATUSES = ['Open', 'In Progress', 'Resolved']
const PRIORITIES = ['High', 'Medium', 'Low']

function ChoiceButtons({ label, options, value, onChange }) {
  return <fieldset><legend>{label}</legend><div className="choice-group">
    {options.map((option) => <button className={value === option ? 'choice selected' : 'choice'} key={option}
      type="button" aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}
  </div></fieldset>
}

function App() {
  const [issues, setIssues] = useState([])
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState(null)
  const [priority, setPriority] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState(null)

  useEffect(() => {
    let ignore = false
    fetch('/api/issues').then((response) => {
      if (!response.ok) throw new Error('Unable to load issues.')
      return response.json()
    }).then((data) => { if (!ignore) setIssues(data) })
      .catch((requestError) => { if (!ignore) setError(requestError.message) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  const visibleIssues = useMemo(() => {
    const priorityOrder = new Map(PRIORITIES.map((value, index) => [value, index]))
    const statusOrder = new Map(STATUSES.map((value, index) => [value, index]))
    const filteredIssues = issues.filter((issue) =>
      (statusFilter === 'All' || issue.status === statusFilter)
      && (priorityFilter === 'All' || issue.priority === priorityFilter),
    )

    if (statusFilter !== 'All' && priorityFilter === 'All') {
      return filteredIssues.sort((first, second) => priorityOrder.get(first.priority) - priorityOrder.get(second.priority))
    }
    if (priorityFilter !== 'All' && statusFilter === 'All') {
      return filteredIssues.sort((first, second) => statusOrder.get(first.status) - statusOrder.get(second.status))
    }
    return filteredIssues
  }, [issues, priorityFilter, statusFilter])

  async function handleSubmit(event) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return setError('Enter a title that is not only whitespace.')
    if (!priority || !status) return setError('Select both a priority and a status.')

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cleanTitle, description: description.trim(), priority, status }),
      })
      if (!response.ok) {
        const responseBody = await response.json().catch(() => null)
        const message = response.status === 409 && responseBody?.detail
          ? responseBody.detail
          : 'Unable to create the issue. Check the form and try again.'
        throw new Error(message)
      }
      const createdIssue = await response.json()
      setIssues((currentIssues) => [...currentIssues, createdIssue])
      setTitle('')
      setDescription('')
      setStatus(null)
      setPriority(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  function startEditing(issue) {
    setEditingId(issue.id)
    setEditValues({ description: issue.description, priority: issue.priority, status: issue.status })
    setError('')
  }

  async function saveIssue(issueId) {
    setError('')
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      })
      const responseBody = await response.json().catch(() => null)
      if (!response.ok) throw new Error(responseBody?.detail || `Unable to update issue #${issueId}.`)
      setIssues((currentIssues) => currentIssues.map((issue) => issue.id === issueId ? responseBody : issue))
      setEditingId(null)
      setEditValues(null)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function deleteIssue(issueId) {
    setError('')
    try {
      const response = await fetch(`/api/issues/${issueId}`, { method: 'DELETE' })
      if (!response.ok) {
        const responseBody = await response.json().catch(() => null)
        throw new Error(responseBody?.detail || `Unable to delete issue #${issueId}.`)
      }
      setIssues((currentIssues) => currentIssues.filter((issue) => issue.id !== issueId))
      if (editingId === issueId) {
        setEditingId(null)
        setEditValues(null)
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return <main>
    <header><p className="eyebrow">Issue tracker</p><h1>Keep work moving.</h1>
      <p className="subtitle">Create, prioritize, and follow issues through resolution.</p></header>
    <div className="layout">
      <section className="panel" aria-labelledby="create-heading">
        <h2 id="create-heading">Create an issue</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="title">Title *</label>
          <input id="title" value={title} onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs attention?" maxLength={200} required />
          <label htmlFor="description">Description <span className="optional">Optional</span></label>
          <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)}
            placeholder="Add useful context" rows="5" />
          <ChoiceButtons label="Priority *" options={PRIORITIES} value={priority} onChange={setPriority} />
          <ChoiceButtons label="Status *" options={STATUSES} value={status} onChange={setStatus} />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="submit-button" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create issue'}</button>
        </form>
      </section>

      <section className="panel" aria-labelledby="issues-heading">
        <div className="issues-heading"><div><p className="eyebrow">Workspace</p><h2 id="issues-heading">Issues</h2></div>
          <span className="count">{visibleIssues.length}</span></div>
        <nav className="filters" aria-label="Filter issues">
          <div className="filter-group" role="group" aria-label="Filter by status">
            <span className="filter-label">Status</span>
            {['All', ...STATUSES].map((option) => <button key={option} className={statusFilter === option ? 'filter active' : 'filter'}
              type="button" aria-pressed={statusFilter === option} onClick={() => setStatusFilter(option)}>{option}</button>)}
          </div>
          <div className="filter-group" role="group" aria-label="Filter by priority">
            <span className="filter-label">Priority</span>
            {['All', ...PRIORITIES].map((option) => <button key={option} className={priorityFilter === option ? 'filter active' : 'filter'}
              type="button" aria-pressed={priorityFilter === option} onClick={() => setPriorityFilter(option)}>{option}</button>)}
          </div>
        </nav>
        {error && <p className="error-message list-error" role="alert">{error}</p>}
        {loading ? <p className="empty-state">Loading issues…</p> : visibleIssues.length === 0 ?
          <p className="empty-state">No issues match the selected filters.</p> :
          <ul className="issue-list">{visibleIssues.map((issue) => <li className="issue-card" key={issue.id}>
            <div className="issue-topline"><span className={`priority priority-${issue.priority.toLowerCase()}`}>{issue.priority}</span>
              <span className="issue-id">#{issue.id}</span></div>
            <h3>{issue.title}</h3>
            {editingId === issue.id ? <div className="edit-fields">
              <label htmlFor={`edit-description-${issue.id}`}>Description</label>
              <textarea id={`edit-description-${issue.id}`} rows="3" value={editValues.description}
                onChange={(event) => setEditValues({ ...editValues, description: event.target.value })} />
              <label htmlFor={`edit-priority-${issue.id}`}>Priority</label>
              <select id={`edit-priority-${issue.id}`} value={editValues.priority}
                onChange={(event) => setEditValues({ ...editValues, priority: event.target.value })}>
                {PRIORITIES.map((option) => <option key={option}>{option}</option>)}
              </select>
              <label htmlFor={`edit-status-${issue.id}`}>Status</label>
              <select id={`edit-status-${issue.id}`} value={editValues.status}
                onChange={(event) => setEditValues({ ...editValues, status: event.target.value })}>
                {STATUSES.map((option) => <option key={option}>{option}</option>)}
              </select>
              <div className="issue-actions">
                <button type="button" className="action primary" onClick={() => saveIssue(issue.id)}>Save</button>
                <button type="button" className="action" onClick={() => { setEditingId(null); setEditValues(null) }}>Cancel</button>
              </div>
            </div> : <>
              {issue.description && <p>{issue.description}</p>}
              <div className="issue-footer">
                <span className={`status status-${issue.status.toLowerCase().replace(' ', '-')}`}>{issue.status}</span>
                <div className="issue-actions">
                  <button type="button" className="action" onClick={() => startEditing(issue)}>Edit</button>
                  <button type="button" className="action danger" onClick={() => deleteIssue(issue.id)}>Delete</button>
                </div>
              </div>
            </>}
          </li>)}</ul>}
      </section>
    </div>
  </main>
}

export default App
