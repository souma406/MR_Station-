'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { StationWithPrices } from '@/lib/types'

interface StationCardProps {
  station: StationWithPrices
  distance?: number
  selectedFuelType?: string
}

const fuelTypeColors: Record<string, string> = {
  GAZOLE: 'fuel-gazole',
  SP95: 'fuel-sp95',
  SP98: 'fuel-sp98',
  E10: 'fuel-e10',
  E85: 'fuel-e85',
  GPLC: 'fuel-gplc',
}

export function StationCard({ station, distance, selectedFuelType }: StationCardProps) {
  const sortedPrices = [...station.prices].sort((a, b) => {
    // If a fuel type is selected, show it first
    if (selectedFuelType) {
      if (a.fuel_type_code === selectedFuelType) return -1
      if (b.fuel_type_code === selectedFuelType) return 1
    }
    return parseFloat(String(a.price)) - parseFloat(String(b.price))
  })

  const lowestPrice = sortedPrices.length > 0 ? sortedPrices[0] : null

  return (
    <Link href={`/station/${station.id}`}>
      <Card className="group h-full transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {station.name}
              </CardTitle>
              {station.brand && (
                <p className="text-sm text-muted-foreground mt-0.5">{station.brand}</p>
              )}
            </div>
            {lowestPrice && (
              <div className="flex flex-col items-end shrink-0">
                <span className="text-lg font-bold text-primary">
                  {parseFloat(String(lowestPrice.price)).toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {lowestPrice.currency}/{lowestPrice.fuel_type_code}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{station.address || station.city}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="text-foreground font-medium">{station.city}</span>
                {station.postal_code && (
                  <span className="text-muted-foreground/70">({station.postal_code})</span>
                )}
              </span>
              {distance !== undefined && (
                <span className="flex items-center gap-1 text-accent">
                  <Navigation className="h-3.5 w-3.5" />
                  {distance.toFixed(1)} km
                </span>
              )}
            </div>
          </div>

          {sortedPrices.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sortedPrices.slice(0, 4).map((price) => (
                <Badge
                  key={price.fuel_type_code}
                  variant="secondary"
                  className={cn(
                    'text-xs font-medium px-2 py-0.5',
                    fuelTypeColors[price.fuel_type_code] || '',
                    selectedFuelType === price.fuel_type_code && 'ring-2 ring-primary ring-offset-1'
                  )}
                >
                  {price.fuel_type_code}: {parseFloat(String(price.price)).toFixed(2)}
                </Badge>
              ))}
              {sortedPrices.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{sortedPrices.length - 4}
                </Badge>
              )}
            </div>
          )}

          {sortedPrices.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
              <Clock className="h-3.5 w-3.5" />
              <span>Prix non disponibles</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
