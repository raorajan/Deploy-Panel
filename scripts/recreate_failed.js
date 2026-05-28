#!/usr/bin/env node
(async () => {
  try {
    console.log('Fetching deployments...')
    const listRes = await fetch('http://localhost:5000/api/deployments')
    const listBody = await listRes.json()
    const items = Array.isArray(listBody) ? listBody : (listBody.data || [])
    const failed = items.filter(it => (it.status || '').toLowerCase() === 'failed')
    console.log(`Found ${failed.length} failed deployment(s).`)
    if (!failed.length) return
    for (const f of failed) {
      const payload = {
        clientName: f.clientName || 'Unknown',
        domain: f.domain || '',
        image: f.image || 'nginx:latest'
      }
      console.log('Creating deployment for:', payload)
      const res = await fetch('http://localhost:5000/api/deploy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      console.log('Create response:', JSON.stringify(json))
    }
  } catch (err) {
    console.error('Script error:', err)
    process.exit(1)
  }
})();
