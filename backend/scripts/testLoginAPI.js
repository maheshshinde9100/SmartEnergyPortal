import axios from 'axios';

const testLoginAPI = async () => {
  try {
    console.log('🧪 Testing Login API Endpoint...\n');

    const API_URL = 'http://localhost:5000/api/auth/login';
    
    console.log('🔗 Testing endpoint:', API_URL);

    // Test admin login
    console.log('\n👤 Testing admin login...');
    const adminCredentials = {
      identifier: 'admin@portal.com',
      password: 'Admin@123'
    };

    console.log('Sending credentials:', {
      identifier: adminCredentials.identifier,
      password: '***' // Hide password in logs
    });

    try {
      const response = await axios.post(API_URL, adminCredentials, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Login successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', {
        success: response.data.success,
        message: response.data.message,
        user: response.data.data?.user ? {
          email: response.data.data.user.email,
          role: response.data.data.user.role,
          isActive: response.data.data.user.isActive
        } : 'No user data',
        hasAccessToken: !!response.data.data?.accessToken,
        hasRefreshToken: !!response.data.data?.refreshToken
      });

    } catch (error) {
      console.log('❌ Login failed!');
      console.log('Error status:', error.response?.status);
      console.log('Error message:', error.response?.data?.message || error.message);
      console.log('Full error response:', error.response?.data);
    }

    // Test user login
    console.log('\n👤 Testing user login...');
    const userCredentials = {
      identifier: 'user1@example.com',
      password: 'User@123'
    };

    try {
      const response = await axios.post(API_URL, userCredentials, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ User login successful!');
      console.log('User role:', response.data.data?.user?.role);

    } catch (error) {
      console.log('❌ User login failed!');
      console.log('Error:', error.response?.data?.message || error.message);
    }

    // Test invalid credentials
    console.log('\n🚫 Testing invalid credentials...');
    const invalidCredentials = {
      identifier: 'admin@portal.com',
      password: 'WrongPassword'
    };

    try {
      const response = await axios.post(API_URL, invalidCredentials, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('⚠️ Unexpected success with invalid credentials');

    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid credentials');
        console.log('Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testLoginAPI();