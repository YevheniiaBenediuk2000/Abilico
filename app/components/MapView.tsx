'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Basic map setup (just a base OSM layer)
export default function MapView() {
    const mapRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!mapRef.current) return

        // Prevent double init
        if ((mapRef.current as any)._leaflet_id) return

        const map = L.map(mapRef.current).setView([50.4501, 30.5234], 13) // Kyiv

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map)

        return () => map.remove()
    }, [])

    return (
        <div
            ref={mapRef}
            id="map"
            style={{
                width: '100%',
                height: '80vh',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
        />
    )
}