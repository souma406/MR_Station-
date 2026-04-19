'use client'

import useSWR from 'swr'
import { Header } from '@/components/header'
import { StatsCard } from '@/components/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { 
  Fuel, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Clock
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const fuelTypeColors: Record<string, string> = {
  GAZOLE: 'fuel-gazole',
  SP95: 'fuel-sp95',
  SP98: 'fuel-sp98',
  E10: 'fuel-e10',
  E85: 'fuel-e85',
  GPLC: 'fuel-gplc',
}

export default function StatsPage() {
  const { data, isLoading } = useSWR<{
    totalStations: number
    totalCities: number
    averagePrices: {
      code: string
      name: string
      avg_price: number
      min_price: number
      max_price: number
      station_count: number
    }[]
    recentUpdates: {
      station_name: string
      city: string
      fuel_type: string
      price: number
      currency: string
      updated_at: string
    }[]
  }>('/api/stats', fetcher)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Statistiques</h1>
          <p className="text-muted-foreground">
            Vue d&apos;ensemble des prix du carburant en Mauritanie
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="h-8 w-8 text-primary" />
              <p className="text-muted-foreground">Chargement des statistiques...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Stations"
                value={data?.totalStations || 0}
                subtitle="Stations actives"
                icon={Fuel}
              />
              <StatsCard
                title="Villes Couvertes"
                value={data?.totalCities || 0}
                subtitle="En Mauritanie"
                icon={Building2}
              />
              <StatsCard
                title="Types de Carburant"
                value={data?.averagePrices?.length || 0}
                subtitle="Disponibles"
                icon={BarChart3}
              />
              <StatsCard
                title="Dernière MAJ"
                value={data?.recentUpdates?.[0] 
                  ? new Date(data.recentUpdates[0].updated_at).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'short' 
                    })
                  : '-'}
                subtitle="Mise à jour"
                icon={Clock}
              />
            </div>

            {/* Price Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Comparaison des prix par carburant
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.averagePrices && data.averagePrices.length > 0 ? (
                  <div className="space-y-6">
                    {data.averagePrices.map((fuel) => {
                      const minPrice = parseFloat(String(fuel.min_price))
                      const maxPrice = parseFloat(String(fuel.max_price))
                      const avgPrice = parseFloat(String(fuel.avg_price))
                      const range = maxPrice - minPrice
                      const avgPosition = range > 0 
                        ? ((avgPrice - minPrice) / range) * 100 
                        : 50

                      return (
                        <div key={fuel.code} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant="secondary" 
                                className={`${fuelTypeColors[fuel.code] || ''} font-medium`}
                              >
                                {fuel.code}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {fuel.name}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {fuel.station_count} station{Number(fuel.station_count) > 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Price Range Bar */}
                          <div className="relative">
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary/30 rounded-full"
                                style={{ width: '100%' }}
                              />
                            </div>
                            {/* Average Price Indicator */}
                            <div 
                              className="absolute top-0 h-3 w-1 bg-primary rounded-full"
                              style={{ left: `${avgPosition}%` }}
                            />
                          </div>

                          {/* Price Labels */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-emerald-600">
                              <TrendingDown className="h-3.5 w-3.5" />
                              <span className="font-medium">{minPrice.toFixed(2)} MRU</span>
                              <span className="text-muted-foreground text-xs">min</span>
                            </div>
                            <div className="text-center">
                              <span className="font-bold text-foreground">
                                {avgPrice.toFixed(2)} MRU
                              </span>
                              <span className="text-muted-foreground text-xs ml-1">moy.</span>
                            </div>
                            <div className="flex items-center gap-1 text-amber-600">
                              <span className="text-muted-foreground text-xs">max</span>
                              <span className="font-medium">{maxPrice.toFixed(2)} MRU</span>
                              <TrendingUp className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune donnée de prix disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Updates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Mises à jour récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.recentUpdates && data.recentUpdates.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentUpdates.map((update, index) => (
                      <div 
                        key={`${update.station_name}-${update.fuel_type}-${index}`}
                        className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {update.station_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {update.city}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {update.fuel_type}
                          </Badge>
                          <span className="font-semibold text-foreground min-w-[80px] text-right">
                            {parseFloat(String(update.price)).toFixed(2)} {update.currency}
                          </span>
                          <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                            {new Date(update.updated_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune mise à jour récente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
