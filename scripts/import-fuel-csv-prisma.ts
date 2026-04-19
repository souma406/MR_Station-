#!/usr/bin/env tsx
/**
 * Script d'import CSV vers Neon Database via Prisma ORM
 * =====================================================
 *
 * Ce script importe les données de stations et prix carburants
 * depuis un fichier CSV vers la base Neon PostgreSQL en utilisant Prisma.
 *
 * Fonctionnalités :
 * - Lecture et parsing du CSV
 * - Création/mise à jour des stations (idempotent)
 * - Création/mise à jour des types de carburants
 * - Création/mise à jour des prix courants
 * - Historisation des changements de prix
 * - Tracking des imports (ImportRun)
 * - Gestion des erreurs avec continuation
 */

import { readFileSync, existsSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { PrismaClient } from '@prisma/client'
import { join } from 'path'

const prisma = new PrismaClient()

// Configuration des colonnes de prix
const FUEL_COLUMNS: Record<string, { code: string; name: string }> = {
  gazole_price: { code: 'GAZOLE', name: 'Gasoil / Diesel' },
  sp95_price: { code: 'SP95', name: 'Super Sans Plomb 95' },
  sp98_price: { code: 'SP98', name: 'Super Sans Plomb 98' },
  e10_price: { code: 'E10', name: 'SP95-E10' },
  e85_price: { code: 'E85', name: 'Bioéthanol E85' },
  gplc_price: { code: 'GPLC', name: 'Gaz de Pétrole Liquéfié' },
}

interface CsvRow {
  id: string
  name: string
  brand?: string
  address?: string
  city: string
  postal_code?: string
  country_code?: string
  latitude: string
  longitude: string
  services?: string
  gazole_price?: string
  sp95_price?: string
  sp98_price?: string
  e10_price?: string
  e85_price?: string
  gplc_price?: string
  [key: string]: string | undefined
}

interface ImportStats {
  rowsRead: number
  stationsCreated: number
  stationsUpdated: number
  pricesCreated: number
  pricesUpdated: number
  pricesHistoryInserted: number
  errors: number
  errorMessages: string[]
}

async function initializeFuelTypes(): Promise<Map<string, number>> {
  const fuelTypeMap = new Map<string, number>()

  for (const [column, { code, name }] of Object.entries(FUEL_COLUMNS)) {
    const fuelType = await prisma.fuelType.upsert({
      where: { code },
      update: { name },
      create: {
        code,
        name,
        description: `Carburant ${name}`,
      },
    })
    fuelTypeMap.set(code, fuelType.id)
  }

  console.log(`   ✓ ${fuelTypeMap.size} types de carburant initialisés`)
  return fuelTypeMap
}

async function processStation(row: CsvRow, importRunId: number): Promise<{ stationId: number; isNew: boolean } | null> {
  try {
    const externalId = row.id
    const countryCode = row.country_code || 'MR'

    if (!externalId || !row.name) {
      throw new Error(`Ligne invalide: ID ou nom manquant`)
    }

    const lat = parseFloat(row.latitude)
    const lng = parseFloat(row.longitude)

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error(`Coordonnées invalides pour ${row.name}`)
    }

    // Upsert station
    const station = await prisma.station.upsert({
      where: {
        externalId_countryCode: {
          externalId,
          countryCode,
        },
      },
      update: {
        name: row.name,
        brand: row.brand || null,
        address: row.address || null,
        city: row.city,
        postalCode: row.postal_code || null,
        latitude: lat,
        longitude: lng,
        services: row.services ? row.services.split(',').map(s => s.trim()).filter(Boolean) : [],
        isActive: true,
      },
      create: {
        externalId,
        name: row.name,
        brand: row.brand || null,
        address: row.address || null,
        city: row.city,
        postalCode: row.postal_code || null,
        countryCode,
        latitude: lat,
        longitude: lng,
        services: row.services ? row.services.split(',').map(s => s.trim()).filter(Boolean) : [],
        isActive: true,
      },
    })

    // Check if this was a create or update
    const existingRecord = await prisma.station.findUnique({
      where: { id: station.id },
      select: { createdAt: true, updatedAt: true },
    })

    // Simple heuristic: if created and updated are very close, it's likely new
    const isNew = existingRecord &&
      Math.abs(existingRecord.createdAt.getTime() - existingRecord.updatedAt.getTime()) < 1000

    return { stationId: station.id, isNew }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.importRun.update({
      where: { id: importRunId },
      data: {
        errors: { increment: 1 },
        errorMessages: { push: `Station ${row.name}: ${message}` },
      },
    })
    return null
  }
}

async function processPrices(
  stationId: number,
  row: CsvRow,
  fuelTypeMap: Map<string, number>,
  importRunId: number
): Promise<{ created: number; updated: number; history: number }> {
  let created = 0
  let updated = 0
  let history = 0

  for (const [column, { code }] of Object.entries(FUEL_COLUMNS)) {
    const priceValue = row[column]

    if (!priceValue || priceValue === '') continue

    const price = parseFloat(priceValue.replace(',', '.'))
    if (isNaN(price) || price <= 0) continue

    const fuelTypeId = fuelTypeMap.get(code)
    if (!fuelTypeId) continue

    try {
      // Check if price already exists
      const existingPrice = await prisma.currentPrice.findUnique({
        where: {
          stationId_fuelTypeId: {
            stationId,
            fuelTypeId,
          },
        },
      })

      if (existingPrice) {
        // Price exists - check if it changed
        if (existingPrice.price !== price) {
          // Update current price
          await prisma.currentPrice.update({
            where: { id: existingPrice.id },
            data: {
              price,
              sourceUpdatedAt: new Date(),
            },
          })
          updated++

          // Insert into history
          await prisma.priceHistory.create({
            data: {
              stationId,
              fuelTypeId,
              price,
              currency: 'MRU',
            },
          })
          history++
        }
      } else {
        // Create new price
        await prisma.currentPrice.create({
          data: {
            stationId,
            fuelTypeId,
            price,
            currency: 'MRU',
            sourceUpdatedAt: new Date(),
          },
        })
        created++

        // Also insert into history
        await prisma.priceHistory.create({
          data: {
            stationId,
            fuelTypeId,
            price,
            currency: 'MRU',
          },
        })
        history++
      }
    } catch (error) {
      console.error(`   ⚠️ Erreur prix ${code} pour station ${stationId}:`, error)
    }
  }

  return { created, updated, history }
}

async function importCsv(filePath: string): Promise<void> {
  console.log('\n=== Import CSV vers Neon Database (Prisma) ===\n')

  // Check file exists
  if (!existsSync(filePath)) {
    console.error(`❌ Fichier non trouvé: ${filePath}`)
    process.exit(1)
  }

  console.log(`📁 Fichier: ${filePath}`)

  // Create import run record
  const importRun = await prisma.importRun.create({
    data: {
      filename: filePath.split('/').pop() || filePath,
      status: 'running',
    },
  })

  console.log(`🔄 Import ID: ${importRun.id}`)

  const stats: ImportStats = {
    rowsRead: 0,
    stationsCreated: 0,
    stationsUpdated: 0,
    pricesCreated: 0,
    pricesUpdated: 0,
    pricesHistoryInserted: 0,
    errors: 0,
    errorMessages: [],
  }

  try {
    // Initialize fuel types
    console.log('\n📋 Initialisation des types de carburant...')
    const fuelTypeMap = await initializeFuelTypes()

    // Read and parse CSV
    console.log('\n📖 Lecture du CSV...')
    const csvContent = readFileSync(filePath, 'utf-8')
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
    }) as CsvRow[]

    stats.rowsRead = records.length
    console.log(`   ✓ ${records.length} lignes à importer`)

    // Process each row
    console.log('\n⏳ Import des stations et prix...')
    let processed = 0
    const batchSize = 10

    for (let i = 0; i < records.length; i++) {
      const row = records[i]
      const result = await processStation(row, importRun.id)

      if (result) {
        const { stationId, isNew } = result
        if (isNew) {
          stats.stationsCreated++
        } else {
          stats.stationsUpdated++
        }

        // Process prices for this station
        const priceStats = await processPrices(stationId, row, fuelTypeMap, importRun.id)
        stats.pricesCreated += priceStats.created
        stats.pricesUpdated += priceStats.updated
        stats.pricesHistoryInserted += priceStats.history
      }

      processed++

      // Progress indicator
      if (processed % batchSize === 0 || processed === records.length) {
        process.stdout.write(`   Progress: ${processed}/${records.length}\r`)
      }
    }

    console.log(`\n   ✓ Import terminé`)

    // Update import run with final stats
    await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        status: 'completed',
        rowsRead: stats.rowsRead,
        stationsCreated: stats.stationsCreated,
        stationsUpdated: stats.stationsUpdated,
        pricesCreated: stats.pricesCreated,
        pricesUpdated: stats.pricesUpdated,
        errors: stats.errors,
        completedAt: new Date(),
      },
    })

  } catch (error) {
    // Mark import as failed
    await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        status: 'failed',
        errors: stats.errors + 1,
        errorMessages: { push: error instanceof Error ? error.message : String(error) },
        completedAt: new Date(),
      },
    })

    console.error('\n❌ Erreur lors de l\'import:', error)
    throw error
  }

  // Final summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 RÉSUMÉ DE L\'IMPORT')
  console.log('='.repeat(50))
  console.log(`Lignes lues:          ${stats.rowsRead}`)
  console.log(`Stations créées:      ${stats.stationsCreated}`)
  console.log(`Stations mises à jour: ${stats.stationsUpdated}`)
  console.log(`Prix créés:           ${stats.pricesCreated}`)
  console.log(`Prix mis à jour:      ${stats.pricesUpdated}`)
  console.log(`Historique inséré:    ${stats.pricesHistoryInserted}`)
  console.log(`Erreurs:              ${stats.errors}`)
  console.log('='.repeat(50))
}

// Main execution
const inputFile = process.argv[2] || './data/mauritania-fuel-demo.csv'

importCsv(inputFile)
  .then(() => {
    console.log('\n✅ Import terminé avec succès')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Import échoué:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
