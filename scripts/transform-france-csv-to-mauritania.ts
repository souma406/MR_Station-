#!/usr/bin/env tsx
/**
 * Script de transformation CSV : France → Mauritanie (DÉMONSTRATION)
 * =================================================================
 *
 * IMPORTANT - DONNÉES DE DÉMONSTRATION UNIQUEMENT
 * -------------------------------------------------
 * Ce script transforme les données du fichier CSV français des prix des carburants
 * (source: data.gouv.fr) en un jeu de données de DÉMONSTRATION pour la Mauritanie.
 *
 * ⚠️  AVERTISSEMENT : Les données générées sont FICTIVES et à but démonstratif uniquement.
 *    Elles ne représentent PAS les prix réels en vigueur en Mauritanie.
 *    Les prix sont dérivés des données françaises et adaptés pour la démo.
 *
 * Source originale : https://www.data.gouv.fr/datasets/prix-des-carburants-en-france-flux-instantane-v2-amelioree
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import { join } from 'path'

// Villes mauritaniennes pour la démonstration avec coordonnées approximatives
const MAURITANIAN_CITIES = [
  { name: 'Nouakchott', lat: 18.0735, lng: -15.9582, offsetLat: 0.05, offsetLng: 0.08 },
  { name: 'Nouadhibou', lat: 20.9333, lng: -17.0333, offsetLat: 0.04, offsetLng: 0.06 },
  { name: 'Rosso', lat: 16.5138, lng: -15.8050, offsetLat: 0.03, offsetLng: 0.05 },
  { name: 'Kaédi', lat: 16.1500, lng: -13.5000, offsetLat: 0.03, offsetLng: 0.05 },
  { name: 'Kiffa', lat: 16.6167, lng: -11.4000, offsetLat: 0.03, offsetLng: 0.05 },
  { name: 'Zouérate', lat: 22.7300, lng: -12.4700, offsetLat: 0.04, offsetLng: 0.06 },
  { name: 'Atar', lat: 20.5167, lng: -13.0500, offsetLat: 0.03, offsetLng: 0.05 },
  { name: 'Aleg', lat: 17.0500, lng: -13.9167, offsetLat: 0.03, offsetLng: 0.05 },
  { name: 'Akjoujt', lat: 19.7500, lng: -14.3833, offsetLat: 0.03, offsetLng: 0.05 },
  { name: 'Néma', lat: 16.6170, lng: -7.2500, offsetLat: 0.03, offsetLng: 0.05 },
  { name: 'Sélibaby', lat: 15.1583, lng: -9.5550, offsetLat: 0.03, offsetLng: 0.05 },
]

// Marques pétroliers présents ou similaires en Mauritanie
const MAURITANIAN_BRANDS = [
  'Total',
  'Naftal',
  'Star Oil',
  'Petrom',
  'Vivo Energy',
  'Shell',
  ' independant'
]

// Mapping des types de carburants français vers une nomenclature simplifiée
const FUEL_MAPPING: Record<string, { code: string; name: string }> = {
  'Gazole': { code: 'GAZOLE', name: 'Gasoil / Diesel' },
  'SP95': { code: 'SP95', name: 'Super Sans Plomb 95' },
  'SP98': { code: 'SP98', name: 'Super Sans Plomb 98' },
  'E10': { code: 'E10', name: 'SP95-E10' },
  'E85': { code: 'E85', name: 'Bioéthanol E85' },
  'GPLc': { code: 'GPLC', name: 'Gaz de Pétrole Liquéfié' },
}

interface FrenchFuelStation {
  id: string
  latitude: string
  longitude: string
  cp: string
  pop: string
  adresse: string
  ville: string
  horaires?: string
  services?: string
  [key: string]: string | undefined
}

interface MauritaniaFuelStation {
  externalId: string
  name: string
  brand: string
  address: string
  city: string
  postalCode: string
  countryCode: string
  latitude: number
  longitude: number
  services: string
  gazolePrice: number | null
  sp95Price: number | null
  sp98Price: number | null
  e10Price: number | null
  e85Price: number | null
  gplcPrice: number | null
}

function generateRandomOffset(range: number): number {
  return (Math.random() - 0.5) * 2 * range
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateStationName(brand: string, city: string, index: number): string {
  const suffixes = ['Centre', 'Nord', 'Sud', 'Est', 'Ouest', 'Principale', 'Marché', 'Rond-point']
  const suffix = suffixes[index % suffixes.length] || 'Station'
  return `Station ${brand} ${city} ${suffix}`
}

function transformFrenchToMauritania(frenchData: FrenchFuelStation[], maxStations: number = 100): MauritaniaFuelStation[] {
  const stations: MauritaniaFuelStation[] = []
  const usedExternalIds = new Set<string>()

  for (let i = 0; i < Math.min(frenchData.length, maxStations); i++) {
    const french = frenchData[i]
    if (!french || !french.id) continue

    // Skip duplicates
    if (usedExternalIds.has(french.id)) continue
    usedExternalIds.add(french.id)

    // Select Mauritanian city based on index to distribute evenly
    const cityIndex = i % MAURITANIAN_CITIES.length
    const city = MAURITANIAN_CITIES[cityIndex]

    // Generate coordinates with small random offset for demo
    const lat = city.lat + generateRandomOffset(city.offsetLat)
    const lng = city.lng + generateRandomOffset(city.offsetLng)

    // Select brand
    const brand = getRandomElement(MAURITANIAN_BRANDS)

    // Generate demo address
    const address = `Zone ${getRandomElement(['Commerciale', 'Industrielle', 'Résidentielle', 'Portuaire', 'Centrale'])}, ${city.name}`

    // Extract fuel prices (convert from euros to ouguiya demo values)
    // Using approximate conversion and demo pricing
    const convertPrice = (euroPrice: string | undefined): number | null => {
      if (!euroPrice || euroPrice === '') return null
      const euro = parseFloat(euroPrice.replace(',', '.'))
      if (isNaN(euro) || euro <= 0) return null
      // Demo conversion: roughly 1 EUR ≈ 40 MRU (rate fluctuates, this is for demo)
      // Add some random variation for realism
      const variation = 0.9 + Math.random() * 0.2 // ±10% variation
      const mruPrice = euro * 40 * variation
      return Math.round(mruPrice * 100) / 100 // Round to 2 decimals
    }

    const station: MauritaniaFuelStation = {
      externalId: french.id,
      name: generateStationName(brand, city.name, i),
      brand,
      address,
      city: city.name,
      postalCode: String((cityIndex + 1) * 10000 + (i % 100)).padStart(5, '0'),
      countryCode: 'MR',
      latitude: Math.round(lat * 1000000) / 1000000,
      longitude: Math.round(lng * 1000000) / 1000000,
      services: french.services || '',
      gazolePrice: convertPrice(french['Gazole'] || french['gazole_prix'] || french['prix_gazole']),
      sp95Price: convertPrice(french['SP95'] || french['sp95_prix'] || french['prix_sp95']),
      sp98Price: convertPrice(french['SP98'] || french['sp98_prix'] || french['prix_sp98']),
      e10Price: convertPrice(french['E10'] || french['e10_prix'] || french['prix_e10']),
      e85Price: convertPrice(french['E85'] || french['e85_prix'] || french['prix_e85']),
      gplcPrice: convertPrice(french['GPLc'] || french['gplc_prix'] || french['prix_gplc'] || french['GPLC']),
    }

    stations.push(station)
  }

  return stations
}

function main() {
  console.log('=== Transformation CSV France → Mauritanie (DÉMO) ===\n')

  // Check for input file
  const inputPaths = [
    './data/prix-des-carburants-en-france-flux-instantane-v2.csv',
    './data/france-fuel-prices.csv',
    process.argv[2], // Allow command line argument
  ].filter(Boolean)

  let inputPath: string | null = null
  for (const path of inputPaths) {
    if (path && existsSync(path)) {
      inputPath = path
      break
    }
  }

  // If no input file found, generate synthetic demo data
  if (!inputPath) {
    console.log('⚠️  Fichier source français non trouvé.')
    console.log('    Recherche dans: ./data/prix-des-carburants-en-france-flux-instantane-v2.csv')
    console.log('    Ou spécifiez le chemin en argument: npx tsx scripts/transform-france-csv-to-mauritania.ts <chemin-fichier>')
    console.log('\n    Génération de données de démo synthétiques...\n')

    generateSyntheticDemoData()
    return
  }

  console.log(`📁 Fichier source: ${inputPath}`)

  // Read and parse French CSV
  let frenchData: FrenchFuelStation[]
  try {
    const csvContent = readFileSync(inputPath, 'utf-8')
    frenchData = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';', // French CSV typically uses semicolon
      relax_column_count: true,
    }) as FrenchFuelStation[]
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du CSV:', error)

    // Fallback to synthetic data
    console.log('\n    Fallback: Génération de données de démo synthétiques...\n')
    generateSyntheticDemoData()
    return
  }

  console.log(`📊 ${frenchData.length} stations françaises trouvées`)

  // Transform to Mauritania demo data
  const mauritaniaData = transformFrenchToMauritania(frenchData, 100)

  console.log(`🔄 ${mauritaniaData.length} stations transformées pour la démo Mauritanie`)

  // Ensure data directory exists
  const dataDir = './data'
  if (!existsSync(dataDir)) {
    const { mkdirSync } = require('fs')
    mkdirSync(dataDir, { recursive: true })
  }

  // Write output CSV
  const outputPath = './data/mauritania-fuel-demo.csv'
  const outputCsv = stringify(mauritaniaData, {
    header: true,
    delimiter: ';',
    columns: [
      { key: 'externalId', header: 'id' },
      { key: 'name', header: 'name' },
      { key: 'brand', header: 'brand' },
      { key: 'address', header: 'address' },
      { key: 'city', header: 'city' },
      { key: 'postalCode', header: 'postal_code' },
      { key: 'countryCode', header: 'country_code' },
      { key: 'latitude', header: 'latitude' },
      { key: 'longitude', header: 'longitude' },
      { key: 'services', header: 'services' },
      { key: 'gazolePrice', header: 'gazole_price' },
      { key: 'sp95Price', header: 'sp95_price' },
      { key: 'sp98Price', header: 'sp98_price' },
      { key: 'e10Price', header: 'e10_price' },
      { key: 'e85Price', header: 'e85_price' },
      { key: 'gplcPrice', header: 'gplc_price' },
    ],
  })

  writeFileSync(outputPath, outputCsv, 'utf-8')

  console.log(`\n✅ Fichier généré: ${outputPath}`)
  console.log(`   ${mauritaniaData.length} stations de démonstration`)

  // Summary by city
  const cityCount: Record<string, number> = {}
  for (const station of mauritaniaData) {
    cityCount[station.city] = (cityCount[station.city] || 0) + 1
  }

  console.log('\n📍 Répartition par ville:')
  for (const [city, count] of Object.entries(cityCount)) {
    console.log(`   - ${city}: ${count} stations`)
  }

  // Important warning
  console.log('\n' + '='.repeat(60))
  console.log('⚠️  AVERTISSEMENT IMPORTANT')
  console.log('='.repeat(60))
  console.log('Ce fichier contient des DONNÉES DE DÉMONSTRATION.')
  console.log('Les prix et coordonnées sont FICTIFS et dérivés des')
  console.log('données françaises pour des besoins de test/démo uniquement.')
  console.log('NE PAS utiliser comme référence de prix réels en Mauritanie.')
  console.log('='.repeat(60))
}

function generateSyntheticDemoData() {
  // Generate synthetic data when source CSV is not available
  const stations: MauritaniaFuelStation[] = []

  for (let i = 0; i < 50; i++) {
    const cityIndex = i % MAURITANIAN_CITIES.length
    const city = MAURITANIAN_CITIES[cityIndex]
    const brand = getRandomElement(MAURITANIAN_BRANDS)

    const lat = city.lat + generateRandomOffset(city.offsetLat)
    const lng = city.lng + generateRandomOffset(city.offsetLng)

    // Generate demo prices (in MRU - Ouguiya)
    const generateDemoPrice = (basePrice: number): number => {
      const variation = 0.9 + Math.random() * 0.2
      return Math.round(basePrice * variation * 100) / 100
    }

    const station: MauritaniaFuelStation = {
      externalId: `MR${String(i + 1).padStart(4, '0')}`,
      name: generateStationName(brand, city.name, i),
      brand,
      address: `Zone ${getRandomElement(['Commerciale', 'Industrielle', 'Résidentielle'])}, ${city.name}`,
      city: city.name,
      postalCode: String((cityIndex + 1) * 10000 + (i % 100)).padStart(5, '0'),
      countryCode: 'MR',
      latitude: Math.round(lat * 1000000) / 1000000,
      longitude: Math.round(lng * 1000000) / 1000000,
      services: 'Station-Service;Boutique;Lavage',
      gazolePrice: generateDemoPrice(48.50),
      sp95Price: generateDemoPrice(52.30),
      sp98Price: generateDemoPrice(55.80),
      e10Price: Math.random() > 0.5 ? generateDemoPrice(51.00) : null,
      e85Price: Math.random() > 0.7 ? generateDemoPrice(38.00) : null,
      gplcPrice: Math.random() > 0.6 ? generateDemoPrice(42.00) : null,
    }

    stations.push(station)
  }

  // Write output
  const dataDir = './data'
  if (!existsSync(dataDir)) {
    const { mkdirSync } = require('fs')
    mkdirSync(dataDir, { recursive: true })
  }

  const outputPath = './data/mauritania-fuel-demo.csv'
  const outputCsv = stringify(stations, {
    header: true,
    delimiter: ';',
    columns: [
      { key: 'externalId', header: 'id' },
      { key: 'name', header: 'name' },
      { key: 'brand', header: 'brand' },
      { key: 'address', header: 'address' },
      { key: 'city', header: 'city' },
      { key: 'postalCode', header: 'postal_code' },
      { key: 'countryCode', header: 'country_code' },
      { key: 'latitude', header: 'latitude' },
      { key: 'longitude', header: 'longitude' },
      { key: 'services', header: 'services' },
      { key: 'gazolePrice', header: 'gazole_price' },
      { key: 'sp95Price', header: 'sp95_price' },
      { key: 'sp98Price', header: 'sp98_price' },
      { key: 'e10Price', header: 'e10_price' },
      { key: 'e85Price', header: 'e85_price' },
      { key: 'gplcPrice', header: 'gplc_price' },
    ],
  })

  writeFileSync(outputPath, outputCsv, 'utf-8')

  console.log(`✅ Données synthétiques générées: ${outputPath}`)
  console.log(`   ${stations.length} stations de démonstration`)

  const cityCount: Record<string, number> = {}
  for (const station of stations) {
    cityCount[station.city] = (cityCount[station.city] || 0) + 1
  }

  console.log('\n📍 Répartition par ville:')
  for (const [city, count] of Object.entries(cityCount)) {
    console.log(`   - ${city}: ${count} stations`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('⚠️  DONNÉES DE DÉMONSTRATION SYNTHÉTIQUES')
  console.log('='.repeat(60))
  console.log('Ces données sont entièrement fictives, générées pour')
  console.log('la démonstration. Aucun lien avec des prix réels.')
  console.log('='.repeat(60))
}

main()
