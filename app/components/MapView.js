'use client'
import { useEffect, useRef, useState } from 'react'
import { getLeaflet } from '@/lib/leaflet'
import { useBasemapGallery } from './MapControls/useBasemapGallery'
import { useAccessibilityLegend } from './MapControls/useAccessibilityLegend'
import { useDrawHelpAlert } from './MapControls/useDrawHelpAlert'  // ✅ add this

export default function MapView() {
    const [map, setMap] = useState(null)

    useEffect(() => {
        ;(async () => {
            const L = await getLeaflet()
            const mapInstance = L.map('map', { zoomControl: false }).setView([50.4501, 30.5234], 14)
            setMap(mapInstance)
        })()
    }, [])

    // register controls
    useBasemapGallery(map)
    useAccessibilityLegend(map)
    useDrawHelpAlert(map)   // ✅ initialize new control

    return <div id="map" style={{ width: '100%', height: '100vh' }} />
}