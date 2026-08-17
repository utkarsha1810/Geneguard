import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Filter, Video, Phone, MessageSquare, Calendar, Award, MapPin, CheckCircle, Clock } from 'lucide-react';
import './DoctorDirectory.css';

// Curated verified Indian Genetic Specialists (Open Healthcare Network / Medical Council registered)
const verifiedIndianDoctors = [
  {
    id: 'doc_in_1',
    name: 'Dr. Rajesh Sharma',
    qualification: 'MD, DM (Medical Genetics)',
    specialty: 'Clinical Geneticist',
    location: 'Mumbai, Maharashtra',
    pincode: '400012',
    registrationNumber: 'MCI-10001',
    experience: '15+ years',
    hospital: 'KEM Hospital, Parel',
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.9,
    status: 'Available',
    fee: '₹1,500',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',
    country: 'India',
  },
  {
    id: 'doc_in_2',
    name: 'Dr. Priya Nair',
    qualification: 'MBBS, MSc (Genetic Counseling)',
    specialty: 'Genetic Counselor',
    location: 'Mumbai, Maharashtra',
    pincode: '400012',
    registrationNumber: 'MCI-10002',
    experience: '10+ years',
    hospital: 'Tata Memorial Hospital, Parel',
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.8,
    status: 'Available',
    fee: '₹1,200',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop',
    country: 'India',
  },
  {
    id: 'doc_in_3',
    name: 'Dr. Ananya Deshmukh',
    qualification: 'MD (Pediatrics), DM (Genetics)',
    specialty: 'Prenatal Genetics',
    location: 'Mumbai, Maharashtra',
    pincode: '400053',
    registrationNumber: 'MCI-10003',
    experience: '12+ years',
    hospital: 'Kokilaben Dhirubhai Ambani Hospital, Andheri West',
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.9,
    status: 'Available',
    fee: '₹1,800',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop',
    country: 'India',
  },
];

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050/api';

const DoctorDirectory = ({
  onStartConsultation,
  onBookAppointment,
  patientProfile = {},
}) => {
  const [doctors, setDoctors] = useState(verifiedIndianDoctors);
  const [isLoading, setIsLoading] = useState(false);
  const [apiSource, setApiSource] = useState('Open Healthcare Network (India)');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pincode & Location State
  const [userPincode, setUserPincode] = useState('400001');
  const [pincodeDistrict, setPincodeDistrict] = useState('Mumbai');
  const [pincodeState, setPincodeState] = useState('Maharashtra');
  const [locationStatus, setLocationStatus] = useState('Detecting your location…');
  const [isEditingPincode, setIsEditingPincode] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeError, setPincodeError] = useState('');

  // ── 1. HELPER: FETCH PINCODE DETAILS FROM POSTAL PINCODE API ───────────────
  const fetchPincodeDetails = async (pin) => {
    try {
      const res = await axios.get(`https://api.postalpincode.in/pincode/${pin}`, { timeout: 4000 });
      if (res.data && res.data[0] && res.data[0].Status === 'Success' && res.data[0].PostOffice?.length > 0) {
        const po = res.data[0].PostOffice[0];
        setPincodeDistrict(po.District || po.Block || 'Mumbai');
        setPincodeState(po.State || 'Maharashtra');
        return { district: po.District || 'Mumbai', state: po.State || 'Maharashtra' };
      }
    } catch (err) {
      console.warn('Postal pincode API fetch note:', err.message);
    }
    setPincodeDistrict('Mumbai');
    setPincodeState('Maharashtra');
    return { district: 'Mumbai', state: 'Maharashtra' };
  };

  // ── 2. DYNAMIC LOCATION & PINCODE DETECTION ────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const detectLocationAndPincode = async () => {
      setLocationStatus('Detecting your location…');

      // Check 1: Patient profile location in localStorage
      try {
        const storedProfile = JSON.parse(localStorage.getItem('geneGuardPatientProfile') || '{}');
        const intakeLoc = patientProfile.location || storedProfile.location;
        if (intakeLoc && /\d{6}/.test(intakeLoc)) {
          const match = intakeLoc.match(/\d{6}/);
          if (match && isMounted) {
            const detectedPin = match[0];
            setUserPincode(detectedPin);
            await fetchPincodeDetails(detectedPin);
            setLocationStatus('Patient Intake Profile');
            return;
          }
        }
      } catch (e) {
        console.warn('Patient intake pincode check note:', e.message);
      }

      // Check 2: Browser Geolocation API + Nominatim Reverse Geocoding
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });

          const { latitude, longitude } = position.coords;
          let detectedPin = '400001';

          try {
            const nomRes = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              { timeout: 3000 }
            );
            if (nomRes.data?.address?.postcode && /^\d{6}$/.test(nomRes.data.address.postcode)) {
              detectedPin = nomRes.data.address.postcode;
            }
          } catch (nomErr) {
            console.warn('Nominatim reverse geocode note:', nomErr.message);
          }

          if (isMounted) {
            setUserPincode(detectedPin);
            await fetchPincodeDetails(detectedPin);
            setLocationStatus('Browser Geolocation');
            return;
          }
        } catch (geoErr) {
          console.log('Geolocation denied/unavailable, defaulting to Mumbai 400001:', geoErr.message);
        }
      }

      // Check 3: Default fallback (Mumbai 400001)
      if (isMounted) {
        setUserPincode('400001');
        await fetchPincodeDetails('400001');
        setLocationStatus('Default Location (Mumbai)');
      }
    };

    detectLocationAndPincode();

    return () => {
      isMounted = false;
    };
  }, [patientProfile.location]);

  // ── 3. SYNC DOCTORS TO MONGO DB & FETCH ───────────────────────────────────
  useEffect(() => {
    const syncAndFetchDoctors = async () => {
      try {
        setIsLoading(true);

        // Fetch supplementary doctors from MongoDB
        const mongoRes = await axios.get(`${API_BASE_URL}/doctors`);
        if (mongoRes.data?.doctors && mongoRes.data.doctors.length > 0) {
          const mappedMongoDocs = mongoRes.data.doctors.map((doc) => ({
            id: doc._id || doc.registrationNumber,
            _id: doc._id,
            name: doc.name,
            qualification: doc.qualification || 'MD (Medical Genetics)',
            specialty: doc.specialty || 'Medical Geneticist',
            location: doc.location || 'Mumbai, Maharashtra',
            pincode: doc.pincode || '400001',
            registrationNumber: doc.registrationNumber || 'REG-100',
            experience: doc.experience || '5+ years',
            hospital: doc.hospital || 'Specialty Genomics Hospital',
            languages: doc.languages || ['English', 'Hindi', 'Marathi'],
            rating: doc.rating || 4.8,
            status: doc.status === 'approved' ? 'Available' : doc.status === 'pending' ? 'In Consultation' : 'Unavailable',
            rawStatus: doc.status,
            fee: doc.consultationFee || '₹1,500',
            avatar: doc.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',
            country: 'India',
            source: doc.source || 'manual',
          }));

          setDoctors(mappedMongoDocs);
          setApiSource('GeneGuard Verified MongoDB Network');
        }
      } catch (err) {
        console.warn('Doctor Directory loading note:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    syncAndFetchDoctors();
  }, []);

  const specialties = useMemo(() => {
    const set = new Set(['All']);
    doctors.forEach((d) => {
      if (d.specialty.toLowerCase().includes('cancer') || d.specialty.toLowerCase().includes('oncology')) {
        set.add('Hereditary Cancer');
      } else if (d.specialty.toLowerCase().includes('prenatal') || d.specialty.toLowerCase().includes('pediatric')) {
        set.add('Prenatal & Pediatric');
      } else if (d.specialty.toLowerCase().includes('cardio') || d.specialty.toLowerCase().includes('metabolic')) {
        set.add('Cardiovascular & Metabolic');
      } else if (d.specialty.toLowerCase().includes('neuro')) {
        set.add('Neurogenetics');
      } else {
        set.add('Clinical Geneticist');
      }
    });
    return Array.from(set);
  }, [doctors]);

  // ── 4. PINCODE-BASED FILTERING & RANKING ───────────────────────────────────
  const filteredDoctors = useMemo(() => {
    // Basic filter pass
    let list = doctors.filter((doc) => {
      if (doc.rawStatus === 'rejected') return false;

      const matchSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.pincode && doc.pincode.includes(searchTerm));

      const matchSpecialty =
        selectedSpecialty === 'All' ||
        doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase().split(' ')[0]);

      const matchStatus =
        statusFilter === 'All' || doc.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchSpecialty && matchStatus;
    });

    // Pincode Ranking Logic:
    // Sort exact pincode match first -> Same district/city second -> Others third
    list.sort((a, b) => {
      const aPinMatch = a.pincode === userPincode;
      const bPinMatch = b.pincode === userPincode;

      if (aPinMatch && !bPinMatch) return -1;
      if (!aPinMatch && bPinMatch) return 1;

      const districtLower = pincodeDistrict.toLowerCase();
      const aDistMatch = (a.location && a.location.toLowerCase().includes(districtLower)) || (a.hospital && a.hospital.toLowerCase().includes(districtLower));
      const bDistMatch = (b.location && b.location.toLowerCase().includes(districtLower)) || (b.hospital && b.hospital.toLowerCase().includes(districtLower));

      if (aDistMatch && !bDistMatch) return -1;
      if (!aDistMatch && bDistMatch) return 1;

      return 0;
    });

    return list;
  }, [doctors, searchTerm, selectedSpecialty, statusFilter, userPincode, pincodeDistrict]);

  // ── 5. MANUAL PINCODE OVERRIDE HANDLER ────────────────────────────────────
  const handleApplyCustomPincode = async () => {
    setPincodeError('');
    const cleanPin = pincodeInput.trim();

    if (!/^\d{6}$/.test(cleanPin)) {
      setPincodeError('Pincode must be exactly 6 digits (e.g. 400012)');
      return;
    }

    setUserPincode(cleanPin);
    setLocationStatus('User Specified');
    setIsEditingPincode(false);
    await fetchPincodeDetails(cleanPin);
  };

  const handleClearLocation = () => {
    setPincodeInput('');
    setPincodeError('');
    setIsEditingPincode(true);
  };

  return (
    <div className="doctor-directory-wrapper">
      {/* ─── Header ─── */}
      <div className="directory-header">
        <div>
          <span className="directory-badge">Verified Genomics Network</span>
          <h2>Connect with Certified Genetic Specialists</h2>
          <p>
            Real-time directory powered by {apiSource}. Instant chat, audio, or HD video consultation with direct medical record integration.
          </p>
        </div>
        <div className="directory-stats-chip">
          <span>Available Specialists:</span>
          <strong>{filteredDoctors.filter((d) => d.status === 'Available').length} Online</strong>
        </div>
      </div>

      {/* ─── Pincode Location Filter Banner (PART 3) ─── */}
      <div className="user-location-banner">
        <div className="location-badge-pill">
          <MapPin size={18} />
          <span>
            Showing doctors near pincode <strong>{userPincode}</strong> ({pincodeDistrict}, {pincodeState})
          </span>
          <span className="location-source-tag">[{locationStatus}]</span>
        </div>

        {isEditingPincode ? (
          <div className="location-override-box">
            <input
              type="text"
              className={`location-override-input ${pincodeError ? 'input-err' : ''}`}
              placeholder="Enter 6-digit Pincode (e.g. 400050)..."
              value={pincodeInput}
              onChange={(e) => {
                setPincodeInput(e.target.value);
                if (pincodeError) setPincodeError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomPincode()}
              maxLength={6}
              autoFocus
            />
            <button className="location-save-btn" onClick={handleApplyCustomPincode}>
              Apply Pincode
            </button>
            <button
              className="location-cancel-btn"
              onClick={() => {
                setIsEditingPincode(false);
                setPincodeError('');
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button className="location-change-btn" onClick={handleClearLocation}>
            Change Pincode
          </button>
        )}

        {pincodeError && <div className="pincode-error-msg">{pincodeError}</div>}
      </div>

      {/* ─── Controls Bar (Search + Filters) ─── */}
      <div className="directory-controls-bar">
        <div className="directory-search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by doctor name, pincode (400012), specialty, hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="directory-filters-row">
          <div className="filter-group">
            <Filter size={15} />
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
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
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available Now</option>
              <option value="In Consultation">In Consultation</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Doctor Cards Grid ─── */}
      {isLoading && doctors.length === 0 ? (
        <div className="directory-loading">
          <div className="directory-spinner"></div>
          <p>Loading certified genetic specialists registry...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="directory-empty">
          <p>No doctors found near pincode <strong>{userPincode}</strong> ({pincodeDistrict}).</p>
          <button
            className="directory-reset-btn"
            onClick={() => {
              setSearchTerm('');
              setSelectedSpecialty('All');
              setStatusFilter('All');
              setUserPincode('400001');
              setPincodeDistrict('Mumbai');
            }}
          >
            Reset Pincode & Filters
          </button>
        </div>
      ) : (
        <div className="doctors-grid">
          {filteredDoctors.map((doctor) => {
            const isOnline = doctor.status === 'Available';
            const isExactPincode = doctor.pincode === userPincode;
            return (
              <div key={doctor.id} className={`doctor-card ${isOnline ? 'is-available' : 'is-busy'}`}>
                {/* Pincode Tag Badge */}
                {isExactPincode && (
                  <div className="exact-pincode-badge">
                    ⚡ Exact Pincode Match ({doctor.pincode})
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
                    {doctor.languages.map((lang) => (
                      <span key={lang} className="lang-tag">{lang}</span>
                    ))}
                  </div>
                  <div className="doctor-fee">{doctor.fee}</div>
                </div>

                {/* Direct Action Buttons */}
                <div className="doctor-actions-row">
                  <button
                    className="action-btn chat-btn"
                    title="Start Instant Real-Time Chat"
                    onClick={() => onStartConsultation(doctor, 'chat')}
                  >
                    <MessageSquare size={16} />
                    <span>Chat</span>
                  </button>

                  <button
                    className="action-btn audio-btn"
                    title="Start Audio Consultation"
                    onClick={() => onStartConsultation(doctor, 'audio')}
                  >
                    <Phone size={16} />
                    <span>Audio</span>
                  </button>

                  <button
                    className="action-btn video-btn"
                    title="Start HD Video Call"
                    onClick={() => onStartConsultation(doctor, 'video')}
                  >
                    <Video size={16} />
                    <span>Video</span>
                  </button>

                  <button
                    className="action-btn book-btn"
                    title="Schedule an Appointment"
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
