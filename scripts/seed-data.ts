import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

const FUEL_COLUMNS: Record<string, string> = {
  gazole_price: 'GAZOLE',
  sp95_price: 'SP95',
  sp98_price: 'SP98',
  e10_price: 'E10',
  e85_price: 'E85',
  gplc_price: 'GPLC',
}

async function seedData() {
  console.log('Starting data seed...')

  try {
    // Read CSV file
    const csvContent = readFileSync('./scripts/sample-data.csv', 'utf-8')
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
    })

    console.log(`Found ${records.length} records to import`)

    // Get fuel type IDs
    const fuelTypes = await sql`SELECT id, code FROM fuel_types`
    const fuelTypeMap = new Map(fuelTypes.map((ft: { id: number; code: string }) => [ft.code, ft.id]))
    
    console.log('Fuel types loaded:', Array.from(fuelTypeMap.keys()))

    let stationsCreated = 0
    let pricesCreated = 0

    for (const row of records) {
      try {
        // Insert station
        const stationResult = await sql`
          INSERT INTO stations (external_id, name, brand, address, city, postal_code, latitude, longitude, country_code)
          VALUES (
            ${row.id},
            ${row.name},
            ${row.brand || null},
            ${row.address || null},
            ${row.city},
            ${row.postal_code || null},
            ${parseFloat(row.latitude)},
            ${parseFloat(row.longitude)},
            'MR'
          )
          ON CONFLICT (external_id, country_code) 
          DO UPDATE SET
            name = EXCLUDED.name,
            brand = COALESCE(EXCLUDED.brand, stations.brand),
            address = COALESCE(EXCLUDED.address, stations.address),
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `

        const stationId = stationResult[0].id
        stationsCreated++
        console.log(`Station created/updated: ${row.name} (ID: ${stationId})`)

        // Process fuel prices
        for (const [column, fuelCode] of Object.entries(FUEL_COLUMNS)) {
          const priceValue = row[column]
          if (priceValue && priceValue !== '') {
            const price = parseFloat(priceValue.replace(',', '.'))
            
            if (!isNaN(price) && price > 0) {
              const fuelTypeId = fuelTypeMap.get(fuelCode)
              
              if (fuelTypeId) {
                await sql`
                  INSERT INTO current_prices (station_id, fuel_type_id, price, currency)
                  VALUES (${stationId}, ${fuelTypeId}, ${price}, 'MRU')
                  ON CONFLICT (station_id, fuel_type_id)
                  DO UPDATE SET
                    price = EXCLUDED.price,
                    updated_at = CURRENT_TIMESTAMP
                `
                
                await sql`
                  INSERT INTO price_history (station_id, fuel_type_id, price, currency)
                  VALUES (${stationId}, ${fuelTypeId}, ${price}, 'MRU')
                `
                
                pricesCreated++
              }
            }
          }
        }
      } catch (rowError) {
        console.error(`Error processing row ${row.name}:`, rowError)
      }
    }

    console.log('\n=== Seed Complete ===')
    console.log(`Stations: ${stationsCreated}`)
    console.log(`Prices: ${pricesCreated}`)

  } catch (error) {
    console.error('Seed error:', error)
    process.exit(1)
  }
}

seedData()
