import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const stationId = parseInt(id)

    if (isNaN(stationId)) {
      return NextResponse.json(
        { error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    const stations = await sql`
      SELECT 
        s.id,
        s.external_id,
        s.name,
        s.brand,
        s.address,
        s.city,
        s.postal_code,
        s.country_code,
        s.latitude,
        s.longitude,
        s.services,
        s.is_active,
        s.created_at,
        s.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'fuel_type_code', ft.code,
              'fuel_type_name', ft.name,
              'price', cp.price,
              'currency', cp.currency,
              'updated_at', cp.updated_at
            )
          ) FILTER (WHERE cp.id IS NOT NULL),
          '[]'
        ) as prices
      FROM stations s
      LEFT JOIN current_prices cp ON s.id = cp.station_id
      LEFT JOIN fuel_types ft ON cp.fuel_type_id = ft.id
      WHERE s.id = ${stationId}
      GROUP BY s.id
    `

    if (stations.length === 0) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      )
    }

    // Get price history for this station
    const priceHistory = await sql`
      SELECT 
        ph.price,
        ph.currency,
        ph.recorded_at,
        ft.code as fuel_type_code,
        ft.name as fuel_type_name
      FROM price_history ph
      JOIN fuel_types ft ON ph.fuel_type_id = ft.id
      WHERE ph.station_id = ${stationId}
      ORDER BY ph.recorded_at DESC
      LIMIT 50
    `

    return NextResponse.json({
      station: stations[0],
      priceHistory,
    })
  } catch (error) {
    console.error('Error fetching station:', error)
    return NextResponse.json(
      { error: 'Failed to fetch station' },
      { status: 500 }
    )
  }
}
