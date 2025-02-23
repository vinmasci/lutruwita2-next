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
    const loadPlaces = () => {
      try {
        // Check if migration has been run before
        const migrationRun = localStorage.getItem('lutruwita2_migration_complete');
        if (!migrationRun) {
          const success = migratePlaceMetadata();
          if (success) {
            localStorage.setItem('lutruwita2_migration_complete', 'true');
          }
        }

        // Load places from localStorage
        const storedPlaces = localStorage.getItem(STORAGE_KEY);
        if (storedPlaces) {
          setPlaces(JSON.parse(storedPlaces));
        }
      } catch (error) {
        console.error('Failed to load places:', error);
      }
    };

    loadPlaces();
  }, []);

  useEffect(() => {
    // Save places to localStorage whenever they change
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  }, [places]);

  const updatePlace = async (id: string, updates: Partial<Place>) => {
    try {
      return new Promise<void>((resolve) => {
        setPlaces(prevPlaces => {
          const updatedPlaces = {
            ...prevPlaces,
            [id]: {
              ...(prevPlaces[id] || {}),
              ...updates,
            } as Place
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlaces));
          resolve();
          return updatedPlaces;
        });
      });
    } catch (error) {
      console.error('Failed to update place:', error);
      throw error;
    }
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
