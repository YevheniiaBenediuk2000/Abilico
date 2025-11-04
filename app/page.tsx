'use client'

import { useRouter } from 'next/navigation'
import '@/styles/map.css'
import dynamic from 'next/dynamic'
const MapView = dynamic(() => import('./components/MapView'), { ssr: false })

export default function HomePage(): JSX.Element {
    const router = useRouter()

    return (
        <main
            style={{
                textAlign: 'center',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            {/* 🔹 Login button */}
            <div id="user-auth-buttons" style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => router.push('/auth')}
                    className="btn btn-primary"
                    style={{
                        padding: '0.6rem 1.2rem',
                        borderRadius: '6px',
                        backgroundColor: '#0d6efd',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                    }}
                >
                    Log in
                </button>
            </div>
            {/* 🔹 Map component */}
            <div id="map-container" style={{ width: '80%', maxWidth: '1200px' }}>
                <MapView />
            </div>
        </main>
    )
}