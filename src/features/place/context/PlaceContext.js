import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { migratePlaceMetadata } from '../utils/migration';
const STORAGE_KEY = 'lutruwita2_places';
const PlaceContext = createContext(undefined);
export const PlaceProvider = ({ children }) => {
    const [places, setPlaces] = useState({});
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
            }
            catch (error) {
                console.error('Failed to load places:', error);
            }
        };
        loadPlaces();
    }, []);
    useEffect(() => {
        // Save places to localStorage whenever they change
        localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    }, [places]);
    const updatePlace = async (id, updates) => {
        setPlaces(prevPlaces => ({
            ...prevPlaces,
            [id]: {
                ...(prevPlaces[id] || {}),
                ...updates,
            }
        }));
    };
    return (_jsx(PlaceContext.Provider, { value: { places, updatePlace }, children: children }));
};
export const usePlaceContext = () => {
    const context = useContext(PlaceContext);
    if (context === undefined) {
        throw new Error('usePlaceContext must be used within a PlaceProvider');
    }
    return context;
};
