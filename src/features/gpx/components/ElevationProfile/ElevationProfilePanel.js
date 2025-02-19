import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ElevationProfile } from './ElevationProfile';
import { ElevationPanel } from './ElevationProfile.styles';
import { IconButton, Box, ButtonBase } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { RouteDescriptionPanel } from '../RouteDescription/RouteDescriptionPanel';
export const ElevationProfilePanel = ({ route, header }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('elevation');
    const TabButton = ({ tab, label }) => (_jsx(ButtonBase, { onClick: () => setActiveTab(tab), sx: {
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '4px 4px 0 0',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderBottom: activeTab === tab ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            marginRight: '4px',
            '&:hover': {
                backgroundColor: 'rgba(45, 45, 45, 0.9)'
            }
        }, children: label }));
    return (_jsxs(ElevationPanel, { className: isCollapsed ? 'collapsed' : '', children: [_jsxs(Box, { sx: {
                    position: 'absolute',
                    top: '-24px',
                    left: '16px',
                    display: 'flex',
                    alignItems: 'flex-end'
                }, children: [_jsx(TabButton, { tab: "elevation", label: "Elevation" }), _jsx(TabButton, { tab: "description", label: "Description" })] }), _jsx(Box, { sx: {
                    position: 'absolute',
                    top: '-24px',
                    right: '16px',
                    backgroundColor: 'rgba(26, 26, 26, 0.9)',
                    borderRadius: '4px 4px 0 0',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderBottom: 'none'
                }, children: _jsx(IconButton, { onClick: () => setIsCollapsed(!isCollapsed), size: "small", sx: {
                        color: 'white',
                        padding: '2px',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                    }, children: isCollapsed ? _jsx(KeyboardArrowUpIcon, {}) : _jsx(KeyboardArrowDownIcon, {}) }) }), header, route && activeTab === 'elevation' && _jsx(ElevationProfile, { route: route }), route && activeTab === 'description' && _jsx(RouteDescriptionPanel, { route: route })] }));
};
