import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get station count
    const stationCount = await sql`
      SELECT COUNT(*) as count FROM stations WHERE is_active = true
    `

    // Get city count
    const cityCount = await sql`
      SELECT COUNT(DISTINCT city) as count FROM stations WHERE is_active = true
    `

    // Get average prices per fuel type
    const avgPrices = await sql`
      SELECT 
        ft.code,
        ft.name,
        ROUND(AVG(cp.price)::numeric, 4) as avg_price,
        ROUND(MIN(cp.price)::numeric, 4) as min_price,
        ROUND(MAX(cp.price)::numeric, 4) as max_price,
        COUNT(*) as station_count
      FROM current_prices cp
      JOIN fuel_types ft ON cp.fuel_type_id = ft.id
      GROUP BY ft.id, ft.code, ft.name
      ORDER BY ft.name
    `

    // Get recent price updates
    const recentUpdates = await sql`
      SELECT 
        s.name as station_name,
        s.city,
        ft.name as fuel_type,
        cp.price,
        cp.currency,
        cp.updated_at
      FROM current_prices cp
      JOIN stations s ON cp.station_id = s.id
      JOIN fuel_types ft ON cp.fuel_type_id = ft.id
      ORDER BY cp.updated_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      totalStations: parseInt(stationCount[0]?.count || '0'),
      totalCities: parseInt(cityCount[0]?.count || '0'),
      averagePrices: avgPrices,
      recentUpdates,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
