import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const postalCode = searchParams.get('postalCode')
    const fuelType = searchParams.get('fuelType')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    // Build Prisma query
    const whereClause: any = {
      isActive: true,
    }

    if (city) {
      whereClause.city = { contains: city, mode: 'insensitive' }
    }

    if (postalCode) {
      whereClause.postalCode = { startsWith: postalCode }
    }

    if (fuelType && fuelType !== 'all') {
      whereClause.prices = {
        some: {
          fuelType: {
            code: fuelType
          }
        }
      }
    }

    const stations = await prisma.station.findMany({
      where: whereClause,
      include: {
        prices: {
          include: {
            fuelType: true
          }
        }
      },
      orderBy: sortBy === 'name' 
        ? { name: sortOrder as 'asc' | 'desc' }
        : { id: 'asc' },
      take: 100,
    })

    // Transform to match expected format
    const formattedStations = stations.map((station: any) => ({
      id: station.id,
      external_id: station.externalId,
      name: station.name,
      brand: station.brand,
      address: station.address,
      city: station.city,
      postal_code: station.postalCode,
      country_code: station.countryCode,
      latitude: station.latitude,
      longitude: station.longitude,
      services: station.services,
      is_active: station.isActive,
      created_at: station.createdAt.toISOString(),
      updated_at: station.updatedAt.toISOString(),
      prices: station.prices.map((p: any) => ({
        fuel_type_code: p.fuelType.code,
        fuel_type_name: p.fuelType.name,
        price: p.price,
        currency: p.currency
      }))
    }))

    return NextResponse.json({
      stations: formattedStations,
      count: formattedStations.length,
    })
  } catch (error) {
    console.error('Error fetching stations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stations', stations: [], count: 0 },
      { status: 500 }
    )
  }
}
