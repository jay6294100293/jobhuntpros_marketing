import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/brand-profiles`;
const ACTIVE_BRAND_KEY = 'jhp_active_brand_id';

const BrandContext = createContext(null);

// Tracks the user's active brand profile app-wide so Marketing, Logo, and
// Legal all operate on the same brand without re-selecting it per page.
export const BrandProvider = ({ children }) => {
  const { user, token } = useAuth();
  const canUseBrands = !!(user?.tier && user.tier !== 'free');

  const [profiles, setProfiles] = useState([]);
  const [activeBrandId, setActiveBrandId] = useState(() => localStorage.getItem(ACTIVE_BRAND_KEY));
  const [loading, setLoading] = useState(false);

  const refreshProfiles = useCallback(async () => {
    if (!token || !canUseBrands) {
      setProfiles([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
      const list = data.profiles || [];
      setProfiles(list);
      // Keep the current selection if it still exists, otherwise default to most recent
      setActiveBrandId(prev => (prev && list.some(p => p.id === prev)) ? prev : (list[0]?.id || null));
    } catch {
      // Brand profiles are optional — fail silently
    } finally {
      setLoading(false);
    }
  }, [token, canUseBrands]);

  useEffect(() => { refreshProfiles(); }, [refreshProfiles]);

  useEffect(() => {
    if (activeBrandId) localStorage.setItem(ACTIVE_BRAND_KEY, activeBrandId);
    else localStorage.removeItem(ACTIVE_BRAND_KEY);
  }, [activeBrandId]);

  const activeBrand = profiles.find(p => p.id === activeBrandId) || null;

  const selectBrand = useCallback((idOrProfile) => {
    const id = typeof idOrProfile === 'string' ? idOrProfile : (idOrProfile?.id || null);
    setActiveBrandId(id);
  }, []);

  return (
    <BrandContext.Provider value={{ profiles, activeBrand, activeBrandId, selectBrand, refreshProfiles, loading, canUseBrands }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used inside BrandProvider');
  return ctx;
};
