// This script creates a mock user in localStorage to bypass Auth0 authentication
// Run this in your browser console when you're having issues with Auth0 login

(function createMockUser() {
  // Create a mock user
  const mockUser = {
    name: 'Vincent Masci',
    email: 'user@example.com',
    picture: '',
    sub: 'auth0|user123',
    given_name: 'Vincent',
    family_name: 'Masci',
    nickname: 'mascivincent'
  };
  
  // Store mock authentication data
  localStorage.setItem('auth_user', JSON.stringify(mockUser));
  localStorage.setItem('auth_token', 'mock_token_' + Date.now());
  localStorage.setItem('auth_timestamp', Date.now().toString());
  
  console.log('Mock user created in localStorage. You should now be logged in.');
  console.log('Refresh the page to see the changes.');
})();
