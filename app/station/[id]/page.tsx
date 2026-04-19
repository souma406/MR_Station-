'use client'

import { use } from 'react'
import useSWR from 'swr'
import { Header } from '@/components/header'
import { FuelMap } from '@/components/fuel-map'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Fuel, 
  ArrowLeft,
  ExternalLink,
  Droplets
} from 'lucide-react'
import Link from 'next/link'
import type { StationWithPrices } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const fuelTypeColors: Record<string, string> = {
  GAZOLE: 'fuel-gazole',
  SP95: 'fuel-sp95',
  SP98: 'fuel-sp98',
  E10: 'fuel-e10',
  E85: 'fuel-e85',
  GPLC: 'fuel-gplc',
}

interface PriceWithDetails {
  fuel_type_code: string
  fuel_type_name: string
  price: number
  currency: string
  updated_at?: string
}

export default function StationDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  
  const { data, isLoading, error } = useSWR<{
    station: StationWithPrices & { prices: PriceWithDetails[] }
    priceHistory: {
      price: number
      currency: string
      recorded_at: string
      fuel_type_code: string
      fuel_type_name: string
    }[]
  }>(`/api/stations/${id}`, fetcher)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-muted-foreground">Chargement de la station...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data?.station) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
            <Fuel className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Station non trouvée</h1>
          <p className="text-muted-foreground mb-6">
            Cette station n&apos;existe pas ou a été supprimée.
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l&apos;accueil
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const { station, priceHistory } = data
  const sortedPrices = [...station.prices].sort((a, b) => parseFloat(String(a.price)) - parseFloat(String(b.price)))
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux résultats
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Station Header Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      {station.name}
                    </CardTitle>
                    {station.brand && (
                      <p className="text-muted-foreground mt-1">{station.brand}</p>
                    )}
                  </div>
                  <a 
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Navigation className="h-4 w-4 mr-2" />
                      Itinéraire
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground">{station.address || 'Adresse non renseignée'}</p>
                    <p>{station.city}{station.postal_code && ` (${station.postal_code})`}</p>
                  </div>
                </div>

                {station.services && station.services.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {station.services.map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prices Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" />
                  Prix des carburants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedPrices.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedPrices.map((price, index) => (
                      <div
                        key={price.fuel_type_code}
                        className={`p-4 rounded-xl border border-border ${
                          index === 0 ? 'bg-primary/5 border-primary/30' : 'bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant="secondary" 
                            className={fuelTypeColors[price.fuel_type_code] || ''}
                          >
                            {price.fuel_type_code}
                          </Badge>
                          {index === 0 && (
                            <Badge className="bg-primary text-primary-foreground text-xs">
                              Meilleur prix
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {price.fuel_type_name}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {parseFloat(String(price.price)).toFixed(2)} 
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {price.currency}/L
                          </span>
                        </p>
                        {price.updated_at && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Mis à jour: {new Date(price.updated_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Fuel className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucun prix disponible pour cette station</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price History */}
            {priceHistory && priceHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Historique des prix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {priceHistory.slice(0, 20).map((entry, index) => (
                      <div 
                        key={`${entry.fuel_type_code}-${entry.recorded_at}-${index}`}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${fuelTypeColors[entry.fuel_type_code] || ''}`}
                          >
                            {entry.fuel_type_code}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.recorded_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">
                          {parseFloat(String(entry.price)).toFixed(2)} {entry.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Localisation</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64 lg:h-80">
                  <FuelMap
                    stations={[station]}
                    selectedStation={station}
                    center={{ lat: station.latitude, lng: station.longitude }}
                    zoom={14}
                  />
                </div>
                <div className="p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Coordonnées: {parseFloat(String(station.latitude)).toFixed(6)}, {parseFloat(String(station.longitude)).toFixed(6)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
