export interface FuelType {
  id: number
  code: string
  name: string
  description: string | null
}

export interface Station {
  id: number
  external_id: string | null
  name: string
  brand: string | null
  address: string | null
  city: string
  postal_code: string | null
  country_code: string
  latitude: number
  longitude: number
  services: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CurrentPrice {
  id: number
  station_id: number
  fuel_type_id: number
  price: number
  currency: string
  source_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface StationWithPrices extends Station {
  prices: {
    fuel_type_code: string
    fuel_type_name: string
    price: number
    currency: string
  }[]
}

export interface SearchParams {
  city?: string
  postalCode?: string
  fuelType?: string
  sortBy?: 'price' | 'distance' | 'name'
  sortOrder?: 'asc' | 'desc'
  lat?: number
  lng?: number
  radius?: number
}

export interface ImportResult {
  id: number
  filename: string
  status: 'running' | 'completed' | 'failed'
  rows_read: number
  stations_created: number
  stations_updated: number
  prices_created: number
  prices_updated: number
  errors: number
  error_messages: string[]
  started_at: string
  completed_at: string | null
}
