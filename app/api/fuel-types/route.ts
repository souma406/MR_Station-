import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const fuelTypes = await prisma.fuelType.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ fuelTypes })
  } catch (error) {
    console.error('Error fetching fuel types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fuel types', fuelTypes: [] },
      { status: 500 }
    )
  }
}
