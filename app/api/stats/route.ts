import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get station count
    const stationCount = await prisma.station.count({
      where: { isActive: true }
    })

    // Get city count
    const cityCount = await prisma.station.groupBy({
      by: ['city'],
      where: { isActive: true },
      _count: { city: true }
    })

    // Get average prices per fuel type
    const avgPrices = await prisma.currentPrice.groupBy({
      by: ['fuelTypeId'],
      _avg: { price: true },
      _min: { price: true },
      _max: { price: true },
      _count: { stationId: true }
    })

    // Get fuel type details
    const fuelTypes = await prisma.fuelType.findMany()
    const fuelTypeMap = new Map<number, { code: string; name: string }>(
      fuelTypes.map((ft: { id: number; code: string; name: string }) => [ft.id, ft])
    )

    const formattedAvgPrices = avgPrices.map((ap: { fuelTypeId: number; _avg: { price: number | null }; _min: { price: number | null }; _max: { price: number | null }; _count: { stationId: number } }) => {
      const ft = fuelTypeMap.get(ap.fuelTypeId)
      return {
        code: ft?.code || 'UNKNOWN',
        name: ft?.name || 'Unknown',
        avg_price: ap._avg.price ? Math.round(ap._avg.price * 10000) / 10000 : 0,
        min_price: ap._min.price || 0,
        max_price: ap._max.price || 0,
        station_count: ap._count.stationId
      }
    })

    // Get recent price updates
    const recentUpdates = await prisma.currentPrice.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        station: { select: { name: true, city: true } },
        fuelType: { select: { name: true } }
      }
    })

    const formattedRecentUpdates = recentUpdates.map((ru: {
      station: { name: string; city: string } | null;
      fuelType: { name: string } | null;
      price: number;
      currency: string;
      updatedAt: Date;
    }) => ({
      station_name: ru.station?.name || 'Unknown',
      city: ru.station?.city || 'Unknown',
      fuel_type: ru.fuelType?.name || 'Unknown',
      price: ru.price,
      currency: ru.currency,
      updated_at: ru.updatedAt?.toISOString() || null
    }))

    return NextResponse.json({
      totalStations: stationCount,
      totalCities: cityCount.length,
      averagePrices: formattedAvgPrices,
      recentUpdates: formattedRecentUpdates,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
