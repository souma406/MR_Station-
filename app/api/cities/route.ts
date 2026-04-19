import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cities = await prisma.station.groupBy({
      by: ['city'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { city: 'asc' }
    })

    const formattedCities = cities.map((c: any) => ({
      city: c.city,
      station_count: c._count.id
    }))

    return NextResponse.json({ cities: formattedCities })
  } catch (error) {
    console.error('Error fetching cities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cities', cities: [] },
      { status: 500 }
    )
  }
}
