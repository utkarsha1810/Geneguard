import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  Video,
  Phone,
  MessageSquare,
  Calendar,
  Award,
  MapPin,
  CheckCircle,
  Clock,
  Compass,
  AlertCircle,
  RefreshCw,
  X,
  Navigation,
} from 'lucide-react';
import './DoctorDirectory.css';
import {
  calculateHaversineDistance,
  resolveLocationInput,
  filterAndRankDoctors,
  verifiedIndianDoctors,
  INDIAN_CITY_COORDINATES,
} from '../../utils/doctorLocationFilter';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050/api';

const QUICK_CITIES = [
  { name: 'Mumbai', pin: '400001' },
  { name: 'New Delhi', pin: '110001' },
  { name: 'Bangalore', pin: '560001' },
  { name: 'Pune', pin: '411001' },
  { name: 'Hyderabad', pin: '500001' },
  { name: 'Chennai', pin: '600001' },
  { name: 'Kolkata', pin: '700001' },
  { name: 'Ahmedabad', pin: '380001' },
];

const DoctorDirectory = ({
  onStartConsultation,
  onBookAppointment,
  patientProfile = {},
}) => {
  const [doctors, setDoctors] = useState(verifiedIndianDoctors);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(true);
  const [apiSource, setApiSource] = useState('Open Healthcare Network (India)');

  // Search & Filter controls
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // User location state
  const [userPincode, setUserPincode] = useState('400001');
  const [userCity, setUserCity] = useState('Mumbai');
  const [userState, setUserState] = useState('Maharashtra');
  const [userCoords, setUserCoords] = useState({ lat: 18.9388, lng: 72.8354 });
  const [locationSource, setLocationSource] = useState('Detecting location…');
  const [hasLocation, setHasLocation] = useState(true);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Manual location picker UI state
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationError, setLocationError] = useState('');

  // ── STEP 1: AUTO-DETECT USER LOCATION ON COMPONENT MOUNT ──────────────────
  useEffect(() => {
    let isMounted = true;

    const detectLocation = async () => {
      setIsResolvingLocation(true);

      // Check 1: Patient Profile location check (from intake form or localStorage)
      try {
        const storedProfile = JSON.parse(localStorage.getItem('geneGuardPatientProfile') || '{}');
        const rawLoc = patientProfile.location || storedProfile.location;

        if (rawLoc && typeof rawLoc === 'string' && rawLoc.trim().length >= 2) {
          const resolved = resolveLocationInput(rawLoc);
          if (isMounted && resolved) {
            setUserCity(resolved.city);
            setUserState(resolved.state);
            setUserPincode(resolved.pincode);
            setUserCoords(resolved.coords);
            setLocationSource('Patient Intake Profile');
            setHasLocation(true);
            setLocationPermissionDenied(false);
            setIsResolvingLocation(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[DoctorDirectory] Intake location check error:', err.message);
      }

      // Check 2: Browser Geolocation API
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 4500,
              enableHighAccuracy: true,
            });
          });

          const { latitude, longitude } = position.coords;
          const detectedCoords = { lat: latitude, lng: longitude };

          // Find closest known Indian city hub based on detected GPS coordinates
          let closestCity = 'Mumbai';
          let closestState = 'Maharashtra';
          let closestPin = '400001';
          let minDistance = Infinity;

          for (const info of Object.values(INDIAN_CITY_COORDINATES)) {
            const dist = calculateHaversineDistance(latitude, longitude, info.lat, info.lng);
            if (dist !== null && dist < minDistance) {
              minDistance = dist;
              closestCity = info.city;
              closestState = info.state;
              closestPin = info.pincode;
            }
          }

          if (isMounted) {
            setUserCoords(detectedCoords);
            setUserCity(closestCity);
            setUserState(closestState);
            setUserPincode(closestPin);
            setLocationSource('Browser Geolocation (GPS)');
            setHasLocation(true);
            setLocationPermissionDenied(false);
            setIsResolvingLocation(false);
            return;
          }
        } catch (geoErr) {
          console.warn('[DoctorDirectory] Geolocation unavailable or permission denied:', geoErr.message);
          if (isMounted) {
            setLocationPermissionDenied(true);
            setLocationSource('Permission Denied — Showing All Doctors');
            // Retain default coordinates for distance calculations without breaking
            setUserCoords({ lat: 18.9388, lng: 72.8354 });
            setUserCity('Mumbai');
            setUserState('Maharashtra');
            setUserPincode('400001');
            setHasLocation(false);
          }
        }
      } else {
        if (isMounted) {
          setLocationSource('Default Location (Mumbai)');
          setHasLocation(true);
        }
      }

      if (isMounted) {
        setIsResolvingLocation(false);
      }
    };

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, [patientProfile.location]);

  // ── STEP 2: FETCH DOCTORS FROM MONGO DB (WITH SEED FALLBACK) ───────────────
  const fetchDoctorsFromMongoDB = useCallback(async (city, pin, coords) => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (pin) queryParams.append('pincode', pin);
      if (city) queryParams.append('location', city);
      if (coords && coords.lat && coords.lng) {
        queryParams.append('userLat', coords.lat);
        queryParams.append('userLng', coords.lng);
      }

      const res = await axios.get(`${API_BASE_URL}/doctors?${queryParams.toString()}`, {
        timeout: 4000,
      });

      if (res.data?.doctors && Array.isArray(res.data.doctors) && res.data.doctors.length > 0) {
        const mappedDocs = res.data.doctors.map((doc) => {
          const docLat = doc.lat != null ? doc.lat : null;
          const docLng = doc.lng != null ? doc.lng : null;

          return {
            id: doc._id || doc.registrationNumber || `doc_${Math.random()}`,
            _id: doc._id,
            name: doc.name,
            qualification: doc.qualification || 'MD (Medical Genetics)',
            specialty: doc.specialty || 'Clinical Geneticist',
            location: doc.location || 'Mumbai, Maharashtra',
            pincode: doc.pincode || '400001',
            lat: docLat,
            lng: docLng,
            registrationNumber: doc.registrationNumber || 'REG-100',
            experience: doc.experience || '5+ years',
            hospital: doc.hospital || 'Specialty Genomics Hospital',
            languages: Array.isArray(doc.languages) ? doc.languages : ['English', 'Hindi'],
            rating: typeof doc.rating === 'number' ? doc.rating : 4.8,
            status: doc.status === 'approved' ? 'Available' : doc.status === 'pending' ? 'In Consultation' : 'Available',
            rawStatus: doc.status || 'approved',
            fee: doc.consultationFee || '₹1,500',
            avatar: doc.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',
            source: doc.source || 'manual',
          };
        });

        setDoctors(mappedDocs);
        setApiSource('GeneGuard MongoDB Genomics Registry');
      }
    } catch (err) {
      console.warn('[DoctorDirectory] Backend doctors API note, using verified in-memory specialists list:', err.message);
      // Keep verifiedIndianDoctors as base data
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isResolvingLocation) {
      fetchDoctorsFromMongoDB(userCity, userPincode, userCoords);
    }
  }, [userCity, userPincode, userCoords, isResolvingLocation, fetchDoctorsFromMongoDB]);

  // ── STEP 3: DYNAMIC SPECIALTIES LIST ───────────────────────────────────────
  const specialties = useMemo(() => {
    const set = new Set(['All']);
    doctors.forEach((d) => {
      const spec = (d.specialty || '').toLowerCase();
      if (spec.includes('cancer') || spec.includes('onco')) {
        set.add('Hereditary Cancer');
      } else if (spec.includes('prenatal') || spec.includes('pediatric')) {
        set.add('Prenatal & Pediatric');
      } else if (spec.includes('cardio') || spec.includes('metabolic')) {
        set.add('Cardiovascular & Metabolic');
      } else if (spec.includes('neuro')) {
        set.add('Neurogenetics');
      } else {
        set.add('Clinical Geneticist');
      }
    });
    return Array.from(set);
  }, [doctors]);

  // ── STEP 4: DISTANCE RANKING & PROGRESSIVE RADIUS EXPANSION ENGINE ────────
  const filterOutput = useMemo(() => {
    return filterAndRankDoctors({
      doctors,
      userCoords,
      userCity,
      userState,
      userPincode,
      searchTerm,
      selectedSpecialty,
      statusFilter,
      localRadiusKm: 50,
      regionalRadiusKm: 300,
      hasLocation,
    });
  }, [doctors, userCoords, userCity, userState, userPincode, searchTerm, selectedSpecialty, statusFilter, hasLocation]);

  const filteredDoctors = filterOutput.doctors;
  const matchMode = filterOutput.matchMode;
  const fallbackNotice = filterOutput.fallbackNotice;

  // ── MANUAL LOCATION PICKER HANDLERS ───────────────────────────────────────
  const handleApplyLocation = (inputVal) => {
    setLocationError('');
    const cleanInput = (inputVal || locationInput).trim();

    if (!cleanInput) {
      setLocationError('Please enter a city name (e.g. Pune) or 6-digit pincode (e.g. 411001)');
      return;
    }

    const resolved = resolveLocationInput(cleanInput);
    setUserCity(resolved.city);
    setUserState(resolved.state);
    setUserPincode(resolved.pincode);
    setUserCoords(resolved.coords);
    setLocationSource('User Specified');
    setHasLocation(true);
    setLocationPermissionDenied(false);
    setIsEditingLocation(false);
    setLocationInput('');

    fetchDoctorsFromMongoDB(resolved.city, resolved.pincode, resolved.coords);
  };

  const handleQuickCitySelect = (cityObj) => {
    handleApplyLocation(cityObj.name);
  };

  const handleResetLocation = () => {
    setSearchTerm('');
    setSelectedSpecialty('All');
    setStatusFilter('All');
    const defaultLoc = resolveLocationInput('Mumbai');
    setUserCity(defaultLoc.city);
    setUserState(defaultLoc.state);
    setUserPincode(defaultLoc.pincode);
    setUserCoords(defaultLoc.coords);
    setLocationSource('Default Location (Mumbai)');
    setHasLocation(true);
    setLocationPermissionDenied(false);
    setIsEditingLocation(false);
  };

  return (
    <div className="doctor-directory-wrapper">
      {/* ─── Header ─── */}
      <div className="directory-header">
        <div>
          <span className="directory-badge">Verified Genomics Network</span>
          <h2>Connect with Certified Genetic Specialists</h2>
          <p>
            Real-time directory powered by {apiSource}. Hyper-local specialist matching with automatic regional distance expansion and direct consultation booking.
          </p>
        </div>
        <div className="directory-stats-chip">
          <span>Available Specialists:</span>
          <strong>{filteredDoctors.filter((d) => d.status === 'Available').length} Online</strong>
        </div>
      </div>

      {/* ─── Location Status & Manual Location Picker ─── */}
      <div className="user-location-banner">
        <div className="location-badge-pill">
          <MapPin size={18} />
          <span>
            {hasLocation ? (
              <>
                Showing specialists near <strong>{userCity}</strong> {userPincode ? `(${userPincode})` : ''}
                {userState && `, ${userState}`}
              </>
            ) : (
              <>Location access not set — Showing all specialists across India</>
            )}
          </span>
          <span className="location-source-tag">[{locationSource}]</span>
        </div>

        {isEditingLocation ? (
          <div className="location-override-box">
            <input
              type="text"
              className={`location-override-input ${locationError ? 'input-err' : ''}`}
              placeholder="Enter City (e.g. Pune, Bangalore) or 6-digit Pincode..."
              value={locationInput}
              onChange={(e) => {
                setLocationInput(e.target.value);
                if (locationError) setLocationError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyLocation()}
              autoFocus
            />
            <button className="location-save-btn" onClick={() => handleApplyLocation()}>
              Apply
            </button>
            <button
              className="location-cancel-btn"
              onClick={() => {
                setIsEditingLocation(false);
                setLocationError('');
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button className="location-change-btn" onClick={() => setIsEditingLocation(true)}>
            <Navigation size={14} />
            <span>Change Location</span>
          </button>
        )}

        {locationError && <div className="pincode-error-msg">{locationError}</div>}
      </div>

      {/* ─── Location Permission Denied Alert & Quick City Selector ─── */}
      {locationPermissionDenied && (
        <div className="location-denied-alert">
          <div className="denied-alert-head">
            <AlertCircle size={18} className="denied-icon" />
            <div className="denied-text">
              <strong>Location Access Was Not Granted</strong>
              <p>Select your city below or enter your location above to discover genetic counselors closest to you:</p>
            </div>
          </div>
          <div className="quick-cities-row">
            {QUICK_CITIES.map((city) => (
              <button
                key={city.name}
                className={`quick-city-chip ${userCity.toLowerCase() === city.name.toLowerCase() ? 'active' : ''}`}
                onClick={() => handleQuickCitySelect(city)}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Fallback & Radius Mode Explanation Banner ─── */}
      {!isResolvingLocation && fallbackNotice && (
        <div className={`location-feedback-banner status-${matchMode}`}>
          {matchMode === 'local' ? (
            <CheckCircle size={18} className="feedback-icon" />
          ) : matchMode === 'regional_fallback' ? (
            <Compass size={18} className="feedback-icon" />
          ) : matchMode === 'nationwide_fallback' ? (
            <AlertCircle size={18} className="feedback-icon" />
          ) : (
            <MapPin size={18} className="feedback-icon" />
          )}
          <div className="feedback-content">
            <span className="feedback-tag">
              {matchMode === 'local'
                ? 'Hyper-Local Match'
                : matchMode === 'regional_fallback'
                ? 'Regional Radius Expansion'
                : matchMode === 'nationwide_fallback'
                ? 'Nationwide Nearest Fallback'
                : 'All Verified Specialists'}
            </span>
            <p className="feedback-msg">{fallbackNotice}</p>
          </div>
        </div>
      )}

      {/* ─── Controls Bar (Search + Specialty + Status Filters) ─── */}
      <div className="directory-controls-bar">
        <div className="directory-search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by doctor name, specialty, hospital, city, or pincode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')} title="Clear search">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="directory-filters-row">
          <div className="filter-group">
            <Filter size={15} />
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              aria-label="Filter by Specialty"
            >
              {specialties.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <Clock size={15} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Availability"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available Now</option>
              <option value="In Consultation">In Consultation</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Doctor Cards Grid / Loading State ─── */}
      {isResolvingLocation || (isLoading && doctors.length === 0) ? (
        <div className="directory-loading">
          <div className="directory-spinner"></div>
          <p>Finding verified genetic specialists near {userCity || 'you'}...</p>
          <span className="loading-subtext">Calculating real-time travel distance &amp; scheduling availability</span>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="directory-empty">
          <AlertCircle size={40} className="empty-icon" />
          <h3>No doctors match your filter criteria</h3>
          <p>Try clearing your search query or selecting a different clinical specialty.</p>
          <button className="directory-reset-btn" onClick={handleResetLocation}>
            <RefreshCw size={15} />
            <span>Reset Filters &amp; Location</span>
          </button>
        </div>
      ) : (
        <div className="doctors-grid">
          {filteredDoctors.map((doctor) => {
            const isOnline = doctor.status === 'Available';
            const hasDist = doctor.distanceKm !== null && doctor.distanceKm !== undefined;
            const isNearby = hasDist && doctor.distanceKm <= 50;

            return (
              <div key={doctor.id} className={`doctor-card ${isOnline ? 'is-available' : 'is-busy'}`}>
                {/* Distance Badge Pill */}
                {hasDist ? (
                  <div
                    className={`doctor-distance-badge ${isNearby ? 'is-closest' : ''}`}
                    title={isNearby ? 'Local Specialist serving your immediate area' : 'Distance from your location'}
                  >
                    <MapPin size={12} />
                    <span>{isNearby ? `Nearby • ${doctor.distanceKm} km` : `${doctor.distanceKm} km away`}</span>
                  </div>
                ) : (
                  <div className="doctor-distance-badge is-tele" title="Available for real-time video/audio teleconsultation">
                    <Video size={12} />
                    <span>Teleconsultation • Online</span>
                  </div>
                )}

                {/* Doctor Card Top */}
                <div className="doctor-card-top">
                  <div className="doctor-avatar-wrap">
                    <img
                      src={doctor.avatar}
                      alt={doctor.name}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop';
                      }}
                    />
                    <span className={`status-dot ${isOnline ? 'online' : 'busy'}`}></span>
                  </div>

                  <div className="doctor-info-head">
                    <div className="doctor-name-row">
                      <h3>{doctor.name}</h3>
                      <span className={`status-toggle-pill ${isOnline ? 'available' : 'busy'}`}>
                        {doctor.status}
                      </span>
                    </div>
                    <span className="doctor-qualification">{doctor.qualification}</span>
                    <span className="doctor-specialty">{doctor.specialty}</span>
                  </div>
                </div>

                {/* Doctor Meta Details */}
                <div className="doctor-meta-grid">
                  <div className="meta-item meta-location">
                    <MapPin size={14} />
                    <span>{doctor.location} {doctor.pincode ? `(${doctor.pincode})` : ''}</span>
                  </div>
                  <div className="meta-item meta-exp">
                    <Clock size={14} />
                    <span>Exp: {doctor.experience}</span>
                  </div>
                  <div className="meta-item meta-reg">
                    <Award size={14} />
                    <span>Reg: {doctor.registrationNumber}</span>
                  </div>
                  <div className="meta-item meta-hospital">
                    <CheckCircle size={14} />
                    <span>{doctor.hospital}</span>
                  </div>
                </div>

                {/* Languages & Fee */}
                <div className="doctor-tags-row">
                  <div className="lang-tags">
                    {(doctor.languages || ['English', 'Hindi']).map((lang) => (
                      <span key={lang} className="lang-tag">{lang}</span>
                    ))}
                  </div>
                  <div className="doctor-fee">{doctor.fee}</div>
                </div>

                {/* Direct Action Buttons */}
                <div className="doctor-actions-row">
                  <button
                    className="action-btn chat-btn"
                    title="Start Encrypted Chat Consultation"
                    onClick={() => onStartConsultation(doctor, 'chat')}
                  >
                    <MessageSquare size={16} />
                    <span>Chat</span>
                  </button>

                  <button
                    className="action-btn audio-btn"
                    title="Start Real-Time Audio Consultation"
                    onClick={() => onStartConsultation(doctor, 'audio')}
                  >
                    <Phone size={16} />
                    <span>Audio</span>
                  </button>

                  <button
                    className="action-btn video-btn"
                    title="Start HD Video Consultation"
                    onClick={() => onStartConsultation(doctor, 'video')}
                  >
                    <Video size={16} />
                    <span>Video</span>
                  </button>

                  <button
                    className="action-btn book-btn"
                    title="Schedule Appointment Slot"
                    onClick={() => onBookAppointment(doctor)}
                  >
                    <Calendar size={16} />
                    <span>Book</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoctorDirectory;
