export const MAPTILER_API_KEY = 'DFSAZFJXzvprKbxHrHXv'; // Replace with your actual API key

// Define geographic bounds for each region [minLon, minLat, maxLon, maxLat]
export const regionBounds: Record<string, [number, number, number, number]> = {
  'tasmania': [144.5, -43.7, 148.5, -40.5],
  'victoria-north': [141.0, -37.0, 150.0, -34.0],
  'victoria-south': [141.0, -39.2, 150.0, -37.0],
  'nsw-part1': [141.0, -37.0, 149.0, -28.0], // Western NSW
  'nsw-part2': [149.0, -37.0, 154.0, -28.0], // Eastern NSW
  'queensland': [138.0, -29.0, 154.0, -10.0],
  'south-australia': [129.0, -38.0, 141.0, -26.0],
  'western-australia': [112.0, -35.0, 129.0, -14.0],
  'nt-act': [129.0, -26.0, 139.0, -10.5], // Northern Territory + ACT
  'new-zealand': [166.0, -47.5, 179.0, -34.0]
};

// Define tile sources for each region
export const tileSources: Record<string, string> = {
  'tasmania': '0196150f-725e-7ed9-946d-0c834ce8fc95',
  'victoria-north': '0196195a-de88-76e9-843f-9e8a373cc078',
  'victoria-south': '01961954-9312-726f-a37b-320cfa76aea0',
  'nsw-part1': '01961a2c-f4ea-7748-a9a9-e98d2dcab3dc',
  'nsw-part2': '019619db-0a35-79cb-b098-2ac8ef8d8213',
  'queensland': '019619cb-40fa-7392-ac45-0a2bee28806b',
  'south-australia': '019619a2-1890-7dc3-b3a5-cd6ede88f26a',
  'western-australia': '01961a53-6bf9-70b5-96f6-60c0be7cc9d0',
  'nt-act': '0196800b-307f-74ac-9634-e1004495bdf0',
  'new-zealand': '01968004-0de6-7e5e-8dc8-9e452336a543'
};
