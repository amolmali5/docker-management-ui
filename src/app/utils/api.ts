import axios from 'axios';

// Always use a direct URL to the API server
// This will work both in development and when deployed in Docker
const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // Only consider 2xx responses as successful
  validateStatus: function (status) {
    // Return true only for successful status codes
    // This will cause axios to throw errors for non-2xx responses
    return status >= 200 && status < 300;
  },
});

// Add a response interceptor to handle errors better
api.interceptors.response.use(
  response => response, // Return successful responses as-is
  error => {
    // For errors, check if the response is HTML (which would cause JSON parse errors)
    if (error.response &&
      error.response.headers &&
      error.response.headers['content-type'] &&
      error.response.headers['content-type'].includes('text/html')) {
      // Create a more friendly error instead of letting it fail with "Unexpected token '<'"
      console.error('Received HTML response instead of JSON');
      return Promise.reject(new Error('Server returned an HTML response instead of JSON'));
    }
    return Promise.reject(error);
  }
);

export default api;
