import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import type { Business, JobStatus } from '../../types'

interface GoogleMapProps {
  businesses: Business[]
  selectedLead: Business | null
  center: { lat: number; lng: number } | null
  isSearching: boolean
  activeJobId?: string | null
  onSelectLead?: (business: Business | null) => void
  currentBusinessName?: string | null
  searchLocation?: string | null
  searchRadiusKm?: number | null
  jobStatus?: JobStatus | null
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

if (API_KEY) {
  setOptions({ key: API_KEY })
}

const PHILIPPINES_CENTER = { lat: 12.8797, lng: 121.774 }
const DEFAULT_ZOOM = 6
const MAX_RADIUS_ZOOM = 16
const RADIUS_FIT_PADDING = { top: 60, right: 60, bottom: 60, left: 60 }
const COMPLETE_FIT_PADDING = { top: 80, right: 80, bottom: 80, left: 80 }
const DONE_STATUSES = ['completed', 'stopped', 'error']

const DARK_MAP_STYLE: NonNullable<google.maps.MapOptions['styles']> = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
]

type MarkerState = 'selected' | 'highlighted' | 'error' | 'finished' | 'discovered'

const PIN_COLORS: Record<MarkerState, { fill: string; stroke: string }> = {
  selected: { fill: '#f97316', stroke: '#7c2d12' },
  highlighted: { fill: '#f97316', stroke: '#c2410c' },
  error: { fill: '#ef4444', stroke: '#b91c1c' },
  finished: { fill: '#22c55e', stroke: '#15803d' },
  discovered: { fill: '#3b82f6', stroke: '#1d4ed8' },
}

function getPin(state: MarkerState): google.maps.Icon {
  const { fill, stroke } = PIN_COLORS[state]
  if (state === 'selected') {
    return {
      url:
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="62" viewBox="0 0 44 62">` +
            `<path d="M22 1C10.4 1 1 10.4 1 22c0 16 21 39 21 39s21-23 21-39C43 10.4 33.6 1 22 1z" fill="${fill}" stroke="${stroke}" stroke-width="3"/>` +
            `<circle cx="22" cy="22" r="10" fill="#ffffff"/>` +
            `<circle cx="22" cy="22" r="5.5" fill="${fill}"/>` +
            `</svg>`,
        ),
      anchor: new google.maps.Point(22, 61),
    }
  }
  return {
    url:
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">` +
          `<path d="M15 1C7.3 1 1 7.3 1 15c0 10.5 14 26 14 26S29 25.5 29 15C29 7.3 22.7 1 15 1z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
          `<circle cx="15" cy="15" r="5.5" fill="#ffffff"/>` +
          `</svg>`,
      ),
    anchor: new google.maps.Point(15, 41),
  }
}

function resolveMarkerState(
  business: Business | undefined,
  selectedId: string | null,
  liveId: string | null,
): MarkerState {
  if (!business) return 'discovered'
  if (selectedId && business.id === selectedId) return 'selected'
  if (liveId && business.id === liveId) return 'highlighted'
  if (business.status === 'error') return 'error'
  if (business.status === 'scraped') return 'finished'
  return 'discovered'
}

function isInsideViewport(map: google.maps.Map, pos: google.maps.LatLng): boolean {
  const bounds = map.getBounds()
  return bounds ? bounds.contains(pos) : true
}

export function GoogleMap({
  businesses,
  selectedLead,
  center,
  isSearching,
  activeJobId,
  onSelectLead,
  currentBusinessName,
  searchLocation,
  searchRadiusKm,
  jobStatus,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const markerStatesRef = useRef<Map<string, MarkerState>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map())
  const radiusCircleRef = useRef<google.maps.Circle | null>(null)
  const positionedRef = useRef<{ jobId: string | null } | null>(null)
  const fittedOnDoneRef = useRef<string | null>(null)
  const cameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFitAtRef = useRef(0)
  const prevJobIdRef = useRef<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const theme = useUIStore((s) => s.theme)
  const businessesRef = useRef(businesses)
  businessesRef.current = businesses

  const scheduleCamera = (fn: () => void, ms = 250) => {
    if (cameraTimerRef.current) clearTimeout(cameraTimerRef.current)
    cameraTimerRef.current = setTimeout(() => {
      cameraTimerRef.current = null
      fn()
    }, ms)
  }

  const openInfoWindow = (business: Business) => {
    if (!infoWindowRef.current || !mapRef.current) return
    const marker = markersRef.current.get(business.id)
    if (!marker) return
    const content = `
      <div style="font-family: Inter, sans-serif; font-size: 13px; min-width: 180px; background: var(--color-card); color: var(--color-foreground); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--color-border);">
        <strong>${escapeHtml(business.name)}</strong>
        ${business.rating ? `<div style="color: var(--color-muted-foreground);">⭐ ${business.rating}${business.reviews ? ` (${business.reviews.toLocaleString()} reviews)` : ''}</div>` : ''}
        ${business.phone ? `<div style="color: var(--color-muted-foreground);">📞 ${escapeHtml(business.phone)}</div>` : ''}
        ${business.website ? `<div><a href="${escapeHtml(business.website)}" target="_blank" rel="noreferrer">Visit website</a></div>` : ''}
      </div>`
    infoWindowRef.current.setContent(content)
    infoWindowRef.current.open({ map: mapRef.current, anchor: marker })
  }

  useEffect(() => {
    if (!API_KEY || !containerRef.current) return

    const handleAuthFailure = () => {
      setMapError(
        'Invalid Google Maps API key. Check that frontend/.env has a real key with billing + the Maps JavaScript API enabled, and that the HTTP referrer is allowed.',
      )
    }
    ;(window as Window & { gm_authFailure?: () => void }).gm_authFailure = handleAuthFailure

    let cancelled = false

    const init = async () => {
      try {
        await importLibrary('maps')
      } catch (err) {
        setMapError(
          err instanceof Error && 'code' in err
            ? `Google Maps failed to load (${(err as { code?: string }).code}). Check the API key, billing, and HTTP referrer restrictions.`
            : 'Google Maps failed to load. Check the API key and browser console.',
        )
        return
      }

      if (cancelled || !containerRef.current) return

      const map = new google.maps.Map(containerRef.current, {
        center: center ?? PHILIPPINES_CENTER,
        zoom: DEFAULT_ZOOM,
        fullscreenControl: false,
        streetViewControl: false,
        styles: theme === 'dark' ? DARK_MAP_STYLE : undefined,
      })
      mapRef.current = map
      infoWindowRef.current = new google.maps.InfoWindow()
      clustererRef.current = new MarkerClusterer({ map, markers: [] })
      setMapReady(true)
    }

    init()

    return () => {
      cancelled = true
      if (cameraTimerRef.current) clearTimeout(cameraTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_KEY])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    mapRef.current.setOptions({ styles: theme === 'dark' ? DARK_MAP_STYLE : [] })
  }, [theme, mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current

    if (businesses.length === 0 && markersRef.current.size > 0) {
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current.clear()
      markerStatesRef.current.clear()
      clustererRef.current?.clearMarkers()
      return
    }

    const byId = new Map(businesses.map((b) => [b.id, b]))
    const currentId = currentBusinessName
      ? (businesses.find((b) => b.name === currentBusinessName)?.id ?? null)
      : null
    const selectedId = selectedLead?.id ?? null
    const liveId = selectedId ? null : isSearching ? currentId : null

    for (const business of businesses) {
      const lat = business.latitude
      const lng = business.longitude
      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
        // eslint-disable-next-line no-console
        console.warn('Unable to create marker. Business:', business.name, 'Reason: Missing coordinates.')
        continue
      }
      const pos = new google.maps.LatLng(lat, lng)

      let marker = markersRef.current.get(business.id)
      if (!marker) {
        const state = resolveMarkerState(business, selectedId, liveId)
        marker = new google.maps.Marker({
          map,
          position: pos,
          title: business.name,
          icon: getPin(state),
          zIndex: state === 'selected' ? 1000 : 0,
          animation: google.maps.Animation.DROP,
        })
        marker.addListener('click', () => {
          const latest = businessesRef.current.find((b) => b.id === business.id) ?? business
          openInfoWindow(latest)
          onSelectLead?.(latest)
        })
        markersRef.current.set(business.id, marker)
      }
      markerStatesRef.current.set(business.id, resolveMarkerState(business, selectedId, liveId))
    }

    for (const [id, marker] of markersRef.current) {
      const state = resolveMarkerState(byId.get(id), selectedId, liveId)
      const prev = markerStatesRef.current.get(id)
      if (prev !== state) {
        marker.setIcon(getPin(state))
        marker.setZIndex(state === 'selected' ? 1000 : 0)
        markerStatesRef.current.set(id, state)
      }
    }

    if (clustererRef.current) {
      clustererRef.current.clearMarkers()
      clustererRef.current.addMarkers([...markersRef.current.values()])
    }
  }, [businesses, mapReady, isSearching, currentBusinessName, selectedLead, onSelectLead])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !isSearching || !currentBusinessName) return
    if (selectedLead) return
    if (positionedRef.current?.jobId !== activeJobId) return
    const map = mapRef.current
    const business = businesses.find((b) => b.name === currentBusinessName)
    const marker = business ? markersRef.current.get(business.id) : undefined
    if (!marker) return
    const pos = marker.getPosition()
    if (!pos) return
    if (Date.now() - lastFitAtRef.current < 500) return
    if (isInsideViewport(map, pos)) return
    scheduleCamera(() => {
      map.panTo(pos)
      if (business) openInfoWindow(business)
    }, 200)
  }, [currentBusinessName, businesses, mapReady, isSearching, activeJobId, selectedLead])

  useEffect(() => {
    if (!mapReady || !selectedLead || !selectedLead.latitude || !selectedLead.longitude) return
    const pos = { lat: selectedLead.latitude, lng: selectedLead.longitude }
    lastFitAtRef.current = Date.now()
    mapRef.current?.panTo(pos)
    mapRef.current?.setZoom(15)
    openInfoWindow(selectedLead)
  }, [selectedLead, mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    if (prevJobIdRef.current === (activeJobId ?? null)) return
    prevJobIdRef.current = activeJobId ?? null
    if (activeJobId) {
      positionedRef.current = null
      fittedOnDoneRef.current = null
      return
    }
    radiusCircleRef.current?.setMap(null)
    radiusCircleRef.current = null
    mapRef.current.panTo(PHILIPPINES_CENTER)
    mapRef.current.setZoom(DEFAULT_ZOOM)
  }, [activeJobId, mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !activeJobId) return
    if (!searchLocation || searchRadiusKm == null) return
    if (positionedRef.current?.jobId === activeJobId) return
    const map = mapRef.current

    const positionCamera = (lat: number, lng: number) => {
      const pos = new google.maps.LatLng(lat, lng)
      radiusCircleRef.current?.setMap(null)
      radiusCircleRef.current = null
      const circle = new google.maps.Circle({
        map,
        center: pos,
        radius: searchRadiusKm * 1000,
        strokeColor: '#22c55e',
        strokeWeight: 2,
        strokeOpacity: 0.9,
        fillColor: '#22c55e',
        fillOpacity: 0.12,
        clickable: false,
        zIndex: 1,
      })
      radiusCircleRef.current = circle
      const bounds = circle.getBounds()
      if (bounds) {
        lastFitAtRef.current = Date.now()
        map.fitBounds(bounds, RADIUS_FIT_PADDING)
        google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          const zoom = map.getZoom()
          if (zoom !== undefined && zoom > MAX_RADIUS_ZOOM) map.setZoom(MAX_RADIUS_ZOOM)
        })
      } else {
        map.panTo(pos)
      }
      positionedRef.current = { jobId: activeJobId }
    }

    const cached = geocodeCacheRef.current.get(searchLocation)
    if (cached) {
      positionCamera(cached.lat, cached.lng)
      return
    }
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address: searchLocation }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location
        const lat = loc.lat()
        const lng = loc.lng()
        geocodeCacheRef.current.set(searchLocation, { lat, lng })
        positionCamera(lat, lng)
      } else {
        positionedRef.current = { jobId: activeJobId }
        // eslint-disable-next-line no-console
        console.warn(`Geocode failed for "${searchLocation}" (${status}); keeping current view.`)
      }
    })
  }, [searchLocation, searchRadiusKm, activeJobId, mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !activeJobId) return
    if (selectedLead) return
    if (!jobStatus || !DONE_STATUSES.includes(jobStatus.status)) return
    if (fittedOnDoneRef.current === activeJobId) return
    fittedOnDoneRef.current = activeJobId
    const map = mapRef.current
    if (markersRef.current.size === 0) return
    const bounds = new google.maps.LatLngBounds()
    let anyOutside = false
    markersRef.current.forEach((marker) => {
      const p = marker.getPosition()
      if (!p) return
      if (!isInsideViewport(map, p)) anyOutside = true
      bounds.extend(p)
    })
    if (!anyOutside) return
    lastFitAtRef.current = Date.now()
    map.fitBounds(bounds, COMPLETE_FIT_PADDING)
  }, [jobStatus, activeJobId, mapReady, selectedLead])

  if (!API_KEY) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card text-center p-6">
        <MapPin className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-[220px]">
          Add <code className="rounded bg-accent px-1.5 py-0.5 text-xs">VITE_GOOGLE_MAPS_KEY</code>{' '}
          to .env to enable live map
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-border">
      <div ref={containerRef} className="h-full w-full" />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card p-6">
          <div className="text-center">
            <MapPin className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm font-semibold text-foreground">Google Maps failed to load</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{mapError}</p>
          </div>
        </div>
      )}
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <p className="text-sm text-muted-foreground animate-pulse">Loading map...</p>
        </div>
      )}
      {isSearching && mapReady && (
        <div className="absolute left-3 top-3 rounded-full bg-card/95 border border-border px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
          <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-primary align-middle" />
          Searching...
        </div>
      )}
    </div>
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
