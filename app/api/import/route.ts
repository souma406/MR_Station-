import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'

const FUEL_COLUMNS: Record<string, string> = {
  gazole_price: 'GAZOLE',
  sp95_price: 'SP95',
  sp98_price: 'SP98',
  e10_price: 'E10',
  e85_price: 'E85',
  gplc_price: 'GPLC',
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    const content = await file.text()
    
    // Parse CSV with auto-detection of delimiter
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: content.includes(';') ? ';' : ',',
      relaxColumnCount: true,
    })

    const stats = {
      rowsRead: records.length,
      stationsCreated: 0,
      stationsUpdated: 0,
      pricesCreated: 0,
      pricesUpdated: 0,
      errors: 0,
    }
    const errors: string[] = []

    // Get fuel type IDs
    const fuelTypes = await sql`SELECT id, code FROM fuel_types`
    const fuelTypeMap = new Map(fuelTypes.map((ft: { id: number; code: string }) => [ft.code, ft.id]))

    for (let i = 0; i < records.length; i++) {
      const row = records[i]
      const rowNum = i + 2 // +2 for 1-based and header row

      try {
        // Validate required fields
        const externalId = row.id || row.external_id || `row-${rowNum}`
        const name = row.name || row.station_name
        const city = row.city || row.ville
        const latitude = parseFloat(row.latitude || row.lat)
        const longitude = parseFloat(row.longitude || row.lng || row.lon)

        if (!name) {
          errors.push(`Ligne ${rowNum}: Nom de station manquant`)
          stats.errors++
          continue
        }

        if (!city) {
          errors.push(`Ligne ${rowNum}: Ville manquante`)
          stats.errors++
          continue
        }

        if (isNaN(latitude) || isNaN(longitude)) {
          errors.push(`Ligne ${rowNum}: Coordonnées GPS invalides`)
          stats.errors++
          continue
        }

        // Upsert station
        const stationResult = await sql`
          INSERT INTO stations (external_id, name, brand, address, city, postal_code, latitude, longitude, country_code)
          VALUES (
            ${externalId},
            ${name},
            ${row.brand || row.marque || null},
            ${row.address || row.adresse || null},
            ${city},
            ${row.postal_code || row.code_postal || null},
            ${latitude},
            ${longitude},
            'MR'
          )
          ON CONFLICT (external_id, country_code) 
          DO UPDATE SET
            name = EXCLUDED.name,
            brand = COALESCE(EXCLUDED.brand, stations.brand),
            address = COALESCE(EXCLUDED.address, stations.address),
            city = EXCLUDED.city,
            postal_code = COALESCE(EXCLUDED.postal_code, stations.postal_code),
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, (xmax = 0) as inserted
        `

        const stationId = stationResult[0].id
        const wasInserted = stationResult[0].inserted

        if (wasInserted) {
          stats.stationsCreated++
        } else {
          stats.stationsUpdated++
        }

        // Process fuel prices
        for (const [column, fuelCode] of Object.entries(FUEL_COLUMNS)) {
          const priceValue = row[column]
          if (priceValue && priceValue !== '' && priceValue !== 'null') {
            const price = parseFloat(priceValue.replace(',', '.'))
            
            if (!isNaN(price) && price > 0) {
              const fuelTypeId = fuelTypeMap.get(fuelCode)
              
              if (fuelTypeId) {
                // Upsert current price
                const priceResult = await sql`
                  INSERT INTO current_prices (station_id, fuel_type_id, price, currency)
                  VALUES (${stationId}, ${fuelTypeId}, ${price}, 'MRU')
                  ON CONFLICT (station_id, fuel_type_id)
                  DO UPDATE SET
                    price = EXCLUDED.price,
                    updated_at = CURRENT_TIMESTAMP
                  RETURNING (xmax = 0) as inserted
                `

                if (priceResult[0].inserted) {
                  stats.pricesCreated++
                } else {
                  stats.pricesUpdated++
                }

                // Add to price history
                await sql`
                  INSERT INTO price_history (station_id, fuel_type_id, price, currency)
                  VALUES (${stationId}, ${fuelTypeId}, ${price}, 'MRU')
                `
              }
            }
          }
        }
      } catch (rowError) {
        errors.push(`Ligne ${rowNum}: ${rowError instanceof Error ? rowError.message : 'Erreur inconnue'}`)
        stats.errors++
      }
    }

    return NextResponse.json({
      success: stats.errors === 0 || stats.stationsCreated > 0 || stats.stationsUpdated > 0,
      message: `Import termine. ${stats.stationsCreated} stations creees, ${stats.stationsUpdated} mises a jour.`,
      stats,
      errors: errors.slice(0, 50),
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur lors du traitement du fichier: ' + (error instanceof Error ? error.message : 'Erreur inconnue'),
      },
      { status: 500 }
    )
  }
}
