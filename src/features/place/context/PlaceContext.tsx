import React, { createContext, useContext, useEffect, useState } from 'react';
import { Place } from '../types/place.types';
import { migratePlaceMetadata } from '../utils/migration';

interface PlaceContextType {
  places: Record<string, Place>;
  updatePlace: (id: string, updates: Partial<Place>) => Promise<void>;
}

const STORAGE_KEY = 'lutruwita2_places';

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [places, setPlaces] = useState<Record<string, Place>>({});

  useEffect(() => {
    // Run migration first
    migratePlaceMetadata();

    // Load places from localStorage on mount
    const storedPlaces = localStorage.getItem(STORAGE_KEY);
    if (storedPlaces) {
      try {
        setPlaces(JSON.parse(storedPlaces));
      } catch (error) {
        console.error('Failed to parse stored places:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save places to localStorage whenever they change
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  }, [places]);

  const updatePlace = async (id: string, updates: Partial<Place>) => {
    setPlaces(prevPlaces => ({
      ...prevPlaces,
      [id]: {
        ...(prevPlaces[id] || {}),
        ...updates,
      } as Place
    }));
  };

  return (
    <PlaceContext.Provider value={{ places, updatePlace }}>
      {children}
    </PlaceContext.Provider>
  );
};

export const usePlaceContext = () => {
  const context = useContext(PlaceContext);
  if (context === undefined) {
    throw new Error('usePlaceContext must be used within a PlaceProvider');
  }
  return context;
};
