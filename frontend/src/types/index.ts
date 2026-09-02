export interface Business {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  website?: string | null
  email: string[]
  rating?: number | null
  reviews?: number | null
  maps_url?: string | null
  latitude?: number | null
  longitude?: number | null
  facebook?: string | null
  instagram?: string | null
  tiktok?: string | null
  contact_page?: string | null
  scraped_at?: string
  status?: string
}

export interface SearchRequest {
  keyword: string
  location: string
  radius_km: number
  max_results: number
  output_format: 'excel' | 'csv' | 'json'
  // Performance overrides (pulled from settingsStore at submit time)
  max_concurrent?: number
  website_timeout?: number
  headless?: boolean
  scroll_steps?: number
  proxy_url?: string | null
}

export interface JobStatus {
  job_id: string
  status: string
  current: number
  total: number
  percent: number
  current_business?: string | null
  elapsed: number
  remaining?: number | null
}

export interface WSEvent {
  event: string
  data: Record<string, unknown>
}

export interface SearchResponse {
  job_id: string
  status: string
}