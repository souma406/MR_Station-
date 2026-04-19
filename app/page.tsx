'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Header } from '@/components/header'
import { StationCard } from '@/components/station-card'
import { SearchFilters } from '@/components/search-filters'
import { StatsCard } from '@/components/stats-card'
import { Spinner } from '@/components/ui/spinner'
import { Fuel, MapPin, Building2, TrendingDown } from 'lucide-react'
import type { StationWithPrices, FuelType } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function HomePage() {
  const [searchParams, setSearchParams] = useState<Record<string, string>>({})
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  const queryString = new URLSearchParams({
    ...searchParams,
    ...(userLocation && { lat: String(userLocation.lat), lng: String(userLocation.lng) }),
  }).toString()

  const { data: stationsData, isLoading: stationsLoading } = useSWR<{
    stations: StationWithPrices[]
    count: number
  }>(`/api/stations${queryString ? `?${queryString}` : ''}`, fetcher)

  const { data: fuelTypesData } = useSWR<{ fuelTypes: FuelType[] }>('/api/fuel-types', fetcher)
  const { data: citiesData } = useSWR<{ cities: { city: string; station_count: number }[] }>(
    '/api/cities',
    fetcher
  )
  const { data: statsData } = useSWR<{
    totalStations: number
    totalCities: number
    averagePrices: { code: string; name: string; avg_price: number; min_price: number }[]
  }>('/api/stats', fetcher)

  const handleSearch = useCallback((params: Record<string, string | undefined>) => {
    const cleanParams: Record<string, string> = {}
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') {
        cleanParams[key] = value
      }
    })
    setSearchParams(cleanParams)
  }, [])

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setSearchParams(prev => ({ ...prev, sortBy: 'distance' }))
        setIsLocating(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Impossible de récupérer votre position')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const lowestGazole = statsData?.averagePrices?.find(p => p.code === 'GAZOLE')

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-10">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Trouvez le <span className="text-primary">meilleur prix</span> de carburant
            </h1>
            <p className="text-lg text-muted-foreground text-pretty">
              Comparez les prix du carburant dans toutes les stations-service de Mauritanie.
              Économisez sur chaque plein.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Stations"
              value={statsData?.totalStations || 0}
              icon={Fuel}
            />
            <StatsCard
              title="Villes"
              value={statsData?.totalCities || 0}
              icon={Building2}
            />
            <StatsCard
              title="Prix min Gazole"
              value={lowestGazole ? `${parseFloat(String(lowestGazole.min_price)).toFixed(2)} MRU` : '-'}
              icon={TrendingDown}
            />
            <StatsCard
              title="Zone couverte"
              value="Mauritanie"
              icon={MapPin}
            />
          </div>
        </section>

        {/* Search Section */}
        <section className="mb-8">
          <SearchFilters
            fuelTypes={fuelTypesData?.fuelTypes || []}
            cities={citiesData?.cities || []}
            onSearch={handleSearch}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
          />
        </section>

        {/* Results Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {stationsData?.count 
                ? `${stationsData.count} station${stationsData.count > 1 ? 's' : ''} trouvée${stationsData.count > 1 ? 's' : ''}`
                : 'Stations-service'}
            </h2>
          </div>

          {stationsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Spinner className="h-8 w-8 text-primary" />
              <p className="text-muted-foreground">Chargement des stations...</p>
            </div>
          ) : stationsData?.stations && stationsData.stations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stationsData.stations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  distance={(station as StationWithPrices & { distance?: number }).distance}
                  selectedFuelType={searchParams.fuelType}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Fuel className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucune station trouvée
              </h3>
              <p className="text-muted-foreground max-w-md">
                Essayez de modifier vos critères de recherche ou{' '}
                <button 
                  onClick={() => handleSearch({})} 
                  className="text-primary hover:underline"
                >
                  réinitialisez les filtres
                </button>
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Carburant Mauritanie</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Données mises à jour régulièrement. Prix indicatifs.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
