'use client'

import { useEffect } from 'react'

// ✅ Global styles
import 'bootstrap/dist/css/bootstrap.min.css'
import 'leaflet/dist/leaflet.css'
import '../assets/styles/poi-badge.css'

export default function MapContainer() {
    useEffect(() => {
        ;(async () => {
            // ✅ Dynamically load all client-only libraries
            const L = (await import('leaflet')).default
            await import('leaflet.markercluster')
            await import('leaflet.markercluster/dist/MarkerCluster.css')
            await import('leaflet.markercluster/dist/MarkerCluster.Default.css')
            await import('leaflet-draw')
            await import('leaflet-draw/dist/leaflet.draw.css')
            await import('leaflet-control-geocoder')
            await import('leaflet-control-geocoder/dist/Control.Geocoder.css')

            // ✅ Bootstrap JS (client-only)
            await import('bootstrap/dist/js/bootstrap.bundle.min.js')
            window.bootstrap = await import('bootstrap')

            // ✅ Load your main map logic
            await import('./mapMain.js')
        })()
    }, [])

    return (
        <div>
            {/* === Map container === */}
            <div id="map" style={{ width: '100%', height: '100vh' }}></div>

            {/* === Destination Search Bar === */}
            <div className="map-overlay" id="destination-search-bar">
                <input
                    id="destination-search-input"
                    type="search"
                    className="form-control form-control-lg search-input"
                    placeholder="Search place or click on the map…"
                    aria-label="Search places"
                    aria-controls="destination-suggestions"
                />
                <ul
                    id="destination-suggestions"
                    className="list-group w-100 shadow d-none search-suggestions"
                    aria-label="Search suggestions"
                ></ul>
            </div>

            {/* === Offcanvas (Details + Directions) === */}
            <div
                className="offcanvas offcanvas-start"
                id="placeOffcanvas"
                aria-labelledby="placeOffcanvasLabel"
                data-bs-backdrop="false"
            >
                <div className="offcanvas-header">
                    <h2 className="offcanvas-title" id="placeOffcanvasLabel">Details</h2>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>

                <div className="offcanvas-body">
                    {/* === Directions UI === */}
                    <div id="directions-ui" className="d-none">
                        <div id="departure-search-bar" className="position-relative mb-3">
                            <input
                                id="departure-search-input"
                                type="search"
                                className="form-control form-control-lg search-input"
                                placeholder="From…"
                            />
                            <ul
                                id="departure-suggestions"
                                className="list-group w-100 shadow d-none search-suggestions"
                            ></ul>
                        </div>
                    </div>

                    {/* === Details Panel === */}
                    <div id="details-panel" className="d-none">
                        <div className="d-grid gap-2 mb-3">
                            <div className="btn-group" role="group" aria-label="Quick route actions">
                                <button id="btn-start-here" type="button" className="btn btn-outline-primary">
                                    Start here
                                </button>
                                <button id="btn-go-here" type="button" className="btn btn-outline-danger">
                                    Go here
                                </button>
                            </div>
                        </div>

                        <ul id="details-list" className="list-group"></ul>

                        <form id="review-form" className="mt-3">
              <textarea
                  id="review-text"
                  className="form-control"
                  placeholder="Write your review…"
                  required
              ></textarea>
                            <button id="submit-review-btn" className="btn btn-primary mt-2">
                                Submit
                            </button>
                        </form>

                        <ul id="reviews-list" className="list-group mt-2"></ul>
                    </div>
                </div>
            </div>

            {/* === Obstacle Modal === */}
            <div className="modal fade" id="obstacleModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog">
                    <form className="modal-content" id="obstacle-form">
                        <div className="modal-header">
                            <h5 className="modal-title">Obstacle details</h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="modal-body">
                            <input
                                id="obstacle-title"
                                className="form-control"
                                placeholder="e.g., Damaged curb ramp"
                                required
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* === Accessibility Legend === */}
            <div id="accessibility-legend" className="alert alert-light"></div>

            {/* === Draw Help Alert (template for DrawHelpAlert control) === */}
            <div
                id="draw-help-alert"
                className="d-none alert alert-light alert-dismissible fade show shadow-sm mb-0"
                role="alert"
            >
                <div>
                    <h6 className="d-flex align-items-center gap-2">
                        <span className="fs-6" aria-hidden="true">🧱</span>
                        Draw obstacles
                    </h6>
                    <p className="mb-0" style={{ fontSize: "0.9rem" }}>
                        You can mark areas the route should avoid.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn-close ms-auto"
                    data-bs-dismiss="alert"
                    aria-label="Close"
                ></button>
            </div>

            {/* === Global Loading Bar === */}
            <div
                id="global-loading"
                className="position-fixed top-0 start-0 w-100 d-none"
                style={{ zIndex: 2000 }}
            >
                <div className="progress rounded-0" style={{ height: '0.24rem' }}>
                    <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        style={{ width: '100%' }}
                    ></div>
                </div>
            </div>

            {/* === Toast Stack === */}
            <div aria-live="polite" aria-atomic="true" className="position-relative">
                <div id="toast-stack" className="toast-container position-fixed top-0 end-0 p-3"></div>
            </div>
        </div>
    )
}