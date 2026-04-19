'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Header } from '@/components/header'
import { FuelMap } from '@/components/fuel-map'
import { StationCard } from '@/components/station-card'
import { SearchFilters } from '@/components/search-filters'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { List, MapIcon, X } from 'lucide-react'
import type { StationWithPrices, FuelType } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function MapPage() {
  const [searchParams, setSearchParams] = useState<Record<string, string>>({})
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [selectedStation, setSelectedStation] = useState<StationWithPrices | null>(null)
  const [showList, setShowList] = useState(false)

  const queryString = new URLSearchParams({
    ...searchParams,
    ...(userLocation && { lat: String(userLocation.lat), lng: String(userLocation.lng) }),
  }).toString()

  const { data: stationsData, isLoading } = useSWR<{
    stations: StationWithPrices[]
    count: number
  }>(`/api/stations${queryString ? `?${queryString}` : ''}`, fetcher)

  const { data: fuelTypesData } = useSWR<{ fuelTypes: FuelType[] }>('/api/fuel-types', fetcher)
  const { data: citiesData } = useSWR<{ cities: { city: string; station_count: number }[] }>(
    '/api/cities',
    fetcher
  )

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

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-border bg-card/50">
          <SearchFilters
            fuelTypes={fuelTypesData?.fuelTypes || []}
            cities={citiesData?.cities || []}
            onSearch={handleSearch}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
          />
        </div>

        {/* Map and List Container */}
        <div className="flex-1 relative overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="flex flex-col items-center gap-4">
                <Spinner className="h-8 w-8 text-primary" />
                <p className="text-muted-foreground">Chargement de la carte...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Map */}
              <FuelMap
                stations={stationsData?.stations || []}
                selectedStation={selectedStation}
                onStationSelect={setSelectedStation}
                userLocation={userLocation}
                className="absolute inset-0"
              />

              {/* Mobile List Toggle */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:hidden z-10">
                <Button
                  onClick={() => setShowList(!showList)}
                  className="shadow-lg"
                >
                  {showList ? (
                    <>
                      <MapIcon className="h-4 w-4 mr-2" />
                      Carte
                    </>
                  ) : (
                    <>
                      <List className="h-4 w-4 mr-2" />
                      Liste ({stationsData?.count || 0})
                    </>
                  )}
                </Button>
              </div>

              {/* Desktop Side Panel */}
              <div className="hidden md:block absolute top-4 left-4 bottom-4 w-96 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-10">
                <div className="p-4 border-b border-border">
                  <h2 className="font-semibold text-foreground">
                    {stationsData?.count || 0} station{(stationsData?.count || 0) > 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-3">
                  {(stationsData?.stations || []).map((station) => (
                    <div
                      key={station.id}
                      onClick={() => setSelectedStation(station)}
                      className={`cursor-pointer transition-all ${
                        selectedStation?.id === station.id ? 'ring-2 ring-primary rounded-xl' : ''
                      }`}
                    >
                      <StationCard
                        station={station}
                        distance={(station as StationWithPrices & { distance?: number }).distance}
                        selectedFuelType={searchParams.fuelType}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile List Panel */}
              {showList && (
                <div className="md:hidden absolute inset-0 bg-background z-20 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-semibold text-foreground">
                      {stationsData?.count || 0} station{(stationsData?.count || 0) > 1 ? 's' : ''}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowList(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-3">
                    {(stationsData?.stations || []).map((station) => (
                      <div
                        key={station.id}
                        onClick={() => {
                          setSelectedStation(station)
                          setShowList(false)
                        }}
                      >
                        <StationCard
                          station={station}
                          distance={(station as StationWithPrices & { distance?: number }).distance}
                          selectedFuelType={searchParams.fuelType}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
