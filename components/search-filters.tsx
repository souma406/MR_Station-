'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, MapPin, SlidersHorizontal, X } from 'lucide-react'
import type { FuelType } from '@/lib/types'

interface SearchFiltersProps {
  fuelTypes: FuelType[]
  cities: { city: string; station_count: number }[]
  onSearch: (params: {
    city?: string
    postalCode?: string
    fuelType?: string
    sortBy?: string
    sortOrder?: string
  }) => void
  onLocateMe?: () => void
  isLocating?: boolean
}

export function SearchFilters({
  fuelTypes,
  cities,
  onSearch,
  onLocateMe,
  isLocating,
}: SearchFiltersProps) {
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearch = useCallback(() => {
    onSearch({
      city: city || undefined,
      postalCode: postalCode || undefined,
      fuelType: fuelType || undefined,
      sortBy,
      sortOrder,
    })
  }, [city, postalCode, fuelType, sortBy, sortOrder, onSearch])

  const handleClear = useCallback(() => {
    setCity('')
    setPostalCode('')
    setFuelType('')
    setSortBy('name')
    setSortOrder('asc')
    onSearch({})
  }, [onSearch])

  const hasFilters = city || postalCode || fuelType

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une ville..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 h-11 bg-card"
          />
        </div>

        <Select value={fuelType} onValueChange={setFuelType}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 bg-card">
            <SelectValue placeholder="Type de carburant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {fuelTypes.map((ft) => (
              <SelectItem key={ft.code} value={ft.code}>
                {ft.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button onClick={handleSearch} className="h-11 px-6 shadow-sm">
            <Search className="h-4 w-4 mr-2" />
            Rechercher
          </Button>
          
          {onLocateMe && (
            <Button
              variant="outline"
              onClick={onLocateMe}
              disabled={isLocating}
              className="h-11 px-4"
              title="Me localiser"
            >
              <MapPin className={`h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card rounded-lg border border-border/60">
          <Input
            placeholder="Code postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="sm:w-[140px] bg-background"
          />

          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="sm:w-[200px] bg-background">
              <SelectValue placeholder="Sélectionner une ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.city} value={c.city}>
                  {c.city} ({c.station_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="sm:w-[160px] bg-background">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="price">Prix</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="sm:w-[140px] bg-background">
              <SelectValue placeholder="Ordre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Croissant</SelectItem>
              <SelectItem value="desc">Décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {hasFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtres actifs:</span>
          <div className="flex flex-wrap gap-2">
            {city && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setCity(''); handleSearch() }}
                className="h-7 text-xs"
              >
                Ville: {city}
                <X className="h-3 w-3 ml-1" />
              </Button>
            )}
            {postalCode && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setPostalCode(''); handleSearch() }}
                className="h-7 text-xs"
              >
                CP: {postalCode}
                <X className="h-3 w-3 ml-1" />
              </Button>
            )}
            {fuelType && fuelType !== 'all' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setFuelType(''); handleSearch() }}
                className="h-7 text-xs"
              >
                {fuelType}
                <X className="h-3 w-3 ml-1" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Effacer tout
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
