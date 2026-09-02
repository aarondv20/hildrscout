import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistoryStore } from '../store/historyStore'
import { useLeadStore } from '../store/leadStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore, type NotificationType } from '../store/uiStore'
import type { Business, JobStatus, WSEvent } from '../types'

interface UseWebSocketResult {
  connected: boolean
  error: string | null
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000]

export function useWebSocket(jobId: string | null): UseWebSocketResult {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const store = useLeadStore

  const notify = useCallback((type: NotificationType, title: string, description?: string) => {
    useUIStore.getState().pushNotification({ type, title, description })
  }, [])

  const dispatchEvent = useCallback(
    (jobId: string, event: WSEvent) => {
      const { addLead, updateProgress, completeJob, stopJob, incrementEmails, incrementExports } =
        store.getState()
      switch (event.event) {
        case 'business_found': {
          // addLead performs a full upsert merge by ID — all fields from every
          // business_found event (initial "found" and enriched "scraped") are
          // merged automatically, so no manual set() calls are needed here.
          addLead(jobId, event.data as unknown as Business)
          if (event.data.status === 'found' && useSettingsStore.getState().notifyOnBusinessFound) {
            notify('info', 'Business Found', `${event.data.name} discovered.`)
          }
          break
        }
        case 'email_found':
          incrementEmails(1)
          if (useSettingsStore.getState().notifyOnEmailFound) {
            notify('info', 'Email Found', `Email found for ${event.data.business ?? 'a business'}.`)
          }
          break
        case 'export_completed':
          incrementExports()
          notify('success', 'Export Completed', 'Excel exported successfully.')
          break
        case 'progress':
          updateProgress(jobId, event.data as unknown as JobStatus)
          break
        case 'status': {
          const leads = store.getState().leads[jobId] ?? []
          const buildFinalize = (status: 'completed' | 'stopped' | 'error') => ({
            status,
            leadCount: leads.length,
            emailCount: leads.filter((b) => (b.email?.length ?? 0) > 0).length,
            phoneCount: leads.filter((b) => Boolean(b.phone)).length,
            completedAt: new Date().toISOString(),
            leads,
            topBusinesses: leads.slice(0, 5).map((b) => ({
              name: b.name,
              phone: b.phone ?? null,
              email: b.email?.[0] ?? null,
              website: b.website ?? null,
            })),
          })

          if (event.data.status === 'completed') {
            completeJob(jobId)
            useHistoryStore.getState().finalizeSession(jobId, buildFinalize('completed'))
            if (useSettingsStore.getState().notifyOnCompletion) {
              notify('success', 'Search Finished', `Search completed successfully with ${leads.length} businesses.`)
            }
          } else if (event.data.status === 'stopped') {
            stopJob(jobId)
            useHistoryStore.getState().finalizeSession(jobId, buildFinalize('stopped'))
            if (useSettingsStore.getState().notifyOnCompletion) {
              notify('warning', 'Search Stopped', 'The search was stopped.')
            }
          } else if (event.data.status === 'error') {
            useHistoryStore.getState().finalizeSession(jobId, buildFinalize('error'))
            if (useSettingsStore.getState().notifyOnCompletion) {
              notify('error', 'Search Failed', 'The search pipeline encountered an error.')
            }
          }
          break
        }
        case 'log':
          // eslint-disable-next-line no-console
          console.log('[WS LOG]', event.data)
          break
        case 'phone_found':
          store.getState().phoneFound(jobId, String(event.data.phone), String(event.data.business))
          break
      }
    },
    [store, notify],
  )

  useEffect(() => {
    if (!jobId) {
      setConnected(false)
      setError(null)
      return
    }

    let disposed = false

    const connect = () => {
      if (disposed) return
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const host = import.meta.env.VITE_API_BASE_URL
        ? new URL(import.meta.env.VITE_API_BASE_URL as string).host
        : window.location.host
      const ws = new WebSocket(`${protocol}://${host}/ws/${jobId}`)
      wsRef.current = ws

      ws.onopen = () => {
        retriesRef.current = 0
        setConnected(true)
        setError(null)
      }

      ws.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as WSEvent
          dispatchEvent(jobId, event)
        } catch {
          // ignore malformed frames
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection error')
      }

      ws.onclose = () => {
        setConnected(false)
        if (disposed) return
        if (retriesRef.current < MAX_RETRIES) {
          const delay = RETRY_DELAYS[retriesRef.current] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]
          retriesRef.current += 1
          timerRef.current = setTimeout(connect, delay)
        } else {
          setError('Could not establish WebSocket connection')
          notify('error', 'Connection Lost', 'Could not establish WebSocket connection. Check that the backend is reachable.')
        }
      }
    }

    connect()

    return () => {
      disposed = true
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
      wsRef.current = null
      setConnected(false)
    }
  }, [jobId, dispatchEvent, notify])

  return { connected, error }
}
