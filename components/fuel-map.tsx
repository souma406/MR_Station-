'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { StationWithPrices } from '@/lib/types'

interface FuelMapProps {
  stations: StationWithPrices[]
  selectedStation?: StationWithPrices | null
  onStationSelect?: (station: StationWithPrices) => void
  userLocation?: { lat: number; lng: number } | null
  center?: { lat: number; lng: number }
  zoom?: number
  className?: string
}

export function FuelMap({
  stations,
  selectedStation,
  onStationSelect,
  userLocation,
  center = { lat: 18.0735, lng: -15.9582 }, // Nouakchott center
  zoom = 6,
  className = '',
}: FuelMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const userMarker = useRef<maplibregl.Marker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [center.lng, center.lat],
      zoom: zoom,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [center.lat, center.lng, zoom])

  // Create marker element with gas station icon
  const createMarkerElement = useCallback((station: StationWithPrices, isSelected: boolean) => {
    const el = document.createElement('div')
    el.className = 'station-marker'
    
    const lowestPrice = station.prices.length > 0
      ? Math.min(...station.prices.map(p => parseFloat(String(p.price))))
      : null

    const brand = station.brand?.toLowerCase() || ''
    const brandColors: Record<string, string> = {
      'total': '#dc2626',    // Red
      'naftal': '#16a34a',   // Green
      'star oil': '#ea580c', // Orange
      'petrom': '#0891b2',   // Cyan
      'shell': '#fbbf24',    // Yellow
      'vivo energy': '#7c3aed', // Purple
    }
    
    const bgColor = isSelected ? '#1e40af' : (brandColors[brand] || '#374151')
    const strokeColor = isSelected ? '#1e3a8a' : '#1f2937'

    el.innerHTML = `
      <div class="relative cursor-pointer transition-transform hover:scale-110 ${isSelected ? 'scale-125 z-50' : 'z-10'}">
        <div class="relative flex flex-col items-center">
          <!-- Gas Station Icon -->
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background circle -->
            <circle cx="20" cy="20" r="18" fill="${bgColor}" stroke="${strokeColor}" stroke-width="2"/>
            <!-- Gas pump icon -->
            <g fill="white">
              <!-- Pump body -->
              <rect x="12" y="14" width="10" height="16" rx="1" fill="white"/>
              <rect x="13" y="15" width="8" height="6" rx="0.5" fill="${bgColor}"/>
              <!-- Pump display -->
              <rect x="14" y="16" width="6" height="4" rx="0.5" fill="white"/>
              <!-- Pump hose/nozzle -->
              <path d="M22 18 L26 18 L26 24 L24 26" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
              <circle cx="24" cy="27" r="2" fill="white"/>
              <!-- Base -->
              <rect x="11" y="28" width="12" height="3" rx="0.5" fill="white"/>
            </g>
          </svg>
          
          <!-- Price badge -->
          ${lowestPrice ? `
            <div class="absolute -bottom-2 bg-white px-2 py-0.5 rounded-full shadow-md border border-gray-200">
              <span class="text-xs font-bold text-gray-800">${lowestPrice.toFixed(0)} MRU</span>
            </div>
          ` : ''}
          
          <!-- Selection indicator -->
          ${isSelected ? `
            <div class="absolute -bottom-1 w-3 h-3 bg-blue-600 rounded-full animate-pulse border-2 border-white"></div>
          ` : ''}
        </div>
      </div>
    `
    return el
  }, [])

  // Update markers when stations change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing markers
    markers.current.forEach(marker => marker.remove())
    markers.current = []

    // Add new markers
    stations.forEach((station) => {
      const isSelected = selectedStation?.id === station.id
      const el = createMarkerElement(station, isSelected)

      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '280px',
      }).setHTML(`
        <div class="p-3">
          <h3 class="font-semibold text-foreground text-sm mb-1">${station.name}</h3>
          ${station.brand ? `<p class="text-xs text-muted-foreground mb-2">${station.brand}</p>` : ''}
          <p class="text-xs text-muted-foreground mb-2">${station.address || station.city}</p>
          ${station.prices.length > 0 ? `
            <div class="space-y-1">
              ${station.prices.slice(0, 3).map(p => `
                <div class="flex justify-between text-xs">
                  <span class="text-muted-foreground">${p.fuel_type_name}</span>
                  <span class="font-medium text-foreground">${parseFloat(String(p.price)).toFixed(2)} ${p.currency}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-xs text-muted-foreground">Prix non disponibles</p>'}
          <a href="/station/${station.id}" class="mt-3 block text-center text-xs text-accent hover:underline font-medium">
            Voir les détails
          </a>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(map.current!)

      el.addEventListener('click', () => {
        onStationSelect?.(station)
      })

      markers.current.push(marker)
    })

    // Fit bounds to show all markers
    if (stations.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      stations.forEach(station => {
        bounds.extend([station.longitude, station.latitude])
      })
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat])
      }
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 })
    }
  }, [stations, selectedStation, mapLoaded, createMarkerElement, onStationSelect, userLocation])

  // Update user location marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    if (userMarker.current) {
      userMarker.current.remove()
      userMarker.current = null
    }

    if (userLocation) {
      const el = document.createElement('div')
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <!-- Outer pulse rings -->
          <div class="absolute w-16 h-16 bg-blue-500/20 rounded-full animate-ping"></div>
          <div class="absolute w-10 h-10 bg-blue-500/30 rounded-full animate-pulse"></div>
          
          <!-- Location pin icon -->
          <div class="relative z-10">
            <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Pin shadow -->
              <ellipse cx="22" cy="48" rx="10" ry="3" fill="black" opacity="0.2"/>
              <!-- Pin body gradient -->
              <defs>
                <linearGradient id="pinGradient" x1="22" y1="2" x2="22" y2="42" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#3b82f6"/>
                  <stop offset="100%" stop-color="#1d4ed8"/>
                </linearGradient>
                <linearGradient id="innerGradient" x1="22" y1="8" x2="22" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#60a5fa"/>
                  <stop offset="100%" stop-color="#3b82f6"/>
                </linearGradient>
              </defs>
              <!-- Pin shape -->
              <path d="M22 2C12.059 2 4 10.059 4 20c0 7.5 12 22 18 26 6-4 18-18.5 18-26C40 10.059 31.941 2 22 2z" 
                fill="url(#pinGradient)" 
                stroke="#1e40af" 
                stroke-width="2"/>
              <!-- Inner circle -->
              <circle cx="22" cy="20" r="10" fill="url(#innerGradient)" stroke="white" stroke-width="2"/>
              <!-- User icon -->
              <g fill="white">
                <circle cx="22" cy="17" r="3"/>
                <path d="M16 25c0-3.314 2.686-6 6-6s6 2.686 6 6v2H16v-2z"/>
              </g>
            </svg>
            
            <!-- "Vous" label -->
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg border border-white">
              Vous
            </div>
          </div>
        </div>
      `

      userMarker.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current)
    }
  }, [userLocation, mapLoaded])

  // Center on selected station
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedStation) return

    map.current.flyTo({
      center: [selectedStation.longitude, selectedStation.latitude],
      zoom: 14,
      duration: 1000,
    })
  }, [selectedStation, mapLoaded])

  return (
    <div 
      ref={mapContainer} 
      className={`w-full h-full min-h-[400px] rounded-xl overflow-hidden shadow-inner ${className}`}
    />
  )
}
