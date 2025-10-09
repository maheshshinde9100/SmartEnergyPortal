import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Key, 
  Save,
  Edit3,
  Camera,
  Shield,
  Bell,
  Globe
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [profileData, setProfileData] = useState(null);
  const [userStats, setUserStats] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    address: {
      village: '',
      city: '',
      pincode: '',
      state: ''
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    monthlyReports: true,
    energyAlerts: true,
    language: 'en',
    timezone: 'Asia/Kolkata'
  });

  // Fetch user profile and statistics from database
  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      // Fetch user profile
      const profileResponse = await userAPI.getProfile();
      if (profileResponse.success) {
        setProfileData(profileResponse.data);
        setFormData({
          firstName: profileResponse.data.profile?.firstName || '',
          lastName: profileResponse.data.profile?.lastName || '',
          email: profileResponse.data.email || '',
          mobile: profileResponse.data.mobile || '',
          address: {
            village: profileResponse.data.profile?.address?.village || '',
            city: profileResponse.data.profile?.address?.city || '',
            pincode: profileResponse.data.profile?.address?.pincode || '',
            state: profileResponse.data.profile?.address?.state || ''
          }
        });
      }

      // Fetch user statistics
      const statsResponse = await userAPI.getStats();
      if (statsResponse.success) {
        setUserStats(statsResponse.data);
      }

      // Fetch user preferences
      const preferencesResponse = await userAPI.getPreferences();
      if (preferencesResponse.success) {
        setPreferences(preferencesResponse.data);
      }
    } catch (error) {
      // Failed to fetch profile data
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceChange = async (key, value) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    };
    
    setPreferences(newPreferences);

    // Auto-save preferences
    try {
      const response = await userAPI.updatePreferences(newPreferences);
      if (response.success) {
        toast.success('Preferences updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update preferences');
      // Revert the change on error
      setPreferences(preferences);
    }
  };

  const validateProfileForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      errors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    if (!formData.address.village.trim()) {
      errors.village = 'Village/Area is required';
    }

    if (!formData.address.city.trim()) {
      errors.city = 'City is required';
    }

    if (!formData.address.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^[1-9][0-9]{5}$/.test(formData.address.pincode)) {
      errors.pincode = 'Please enter a valid 6-digit pincode';
    }

    if (!formData.address.state.trim()) {
      errors.state = 'State is required';
    }

    return errors;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateProfileForm();
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
      return;
    }

    setIsLoading(true);

    try {
      // Structure the data correctly for the backend
      const updateData = {
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        profile: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          address: {
            village: formData.address.village.trim(),
            city: formData.address.city.trim(),
            pincode: formData.address.pincode.trim(),
            state: formData.address.state.trim()
          }
        }
      };

      const response = await userAPI.updateProfile(updateData);
      if (response.success) {
        updateUser(response.data.user);
        toast.success(response.message || 'Profile updated successfully');
        setIsEditing(false);
        // Refresh profile data from database
        await fetchProfileData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validatePasswordForm();
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await userAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Bell }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profileData?.profile?.firstName?.[0] || 'U'}{profileData?.profile?.lastName?.[0] || 'N'}
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-100 hover:bg-gray-50 transition-colors">
              <Camera size={14} className="text-gray-600" />
            </button>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {profileData?.profile?.firstName || 'Loading...'} {profileData?.profile?.lastName || ''}
            </h1>
            <p className="text-gray-600">{profileData?.email || 'Loading...'}</p>
            <p className="text-sm text-gray-500">MSEB Customer ID: {profileData?.msebCustomerId || 'Loading...'}</p>
            {userStats && (
              <p className="text-xs text-gray-400 mt-1">
                Member since {Math.floor(userStats.accountAge / 30)} months • {userStats.totalConsumptionRecords} consumption records
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              profileData?.isVerified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {profileData?.isVerified ? 'Verified' : 'Pending Verification'}
            </div>
            
            {userStats && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Avg Monthly Usage</p>
                <p className="text-sm font-medium text-primary-600">
                  {userStats.averageMonthlyConsumption.toFixed(1)} kWh
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* User Statistics */}
              {userStats && (
                <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Account Statistics</h4>
                  
                  {userStats.hasConsumptionData ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary-600">{userStats.totalConsumptionRecords}</p>
                          <p className="text-sm text-gray-600">Consumption Records</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{userStats.averageMonthlyConsumption.toFixed(1)} kWh</p>
                          <p className="text-sm text-gray-600">Avg Monthly Usage</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{userStats.totalUserAppliances}</p>
                          <p className="text-sm text-gray-600">My Appliances</p>
                        </div>
                      </div>
                      
                      {/* Additional Statistics Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">₹{userStats.averageMonthlyBill?.toFixed(0) || '0'}</p>
                          <p className="text-sm text-gray-600">Avg Monthly Bill</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-orange-600">{userStats.totalConsumption?.toFixed(1) || '0'} kWh</p>
                          <p className="text-sm text-gray-600">Total Consumption</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${
                            userStats.consumptionTrend === 'increasing' ? 'text-red-600' :
                            userStats.consumptionTrend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {userStats.consumptionTrend === 'increasing' ? '↗️ Rising' :
                             userStats.consumptionTrend === 'decreasing' ? '↘️ Falling' : '→ Stable'}
                          </p>
                          <p className="text-sm text-gray-600">Usage Trend</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">📊</div>
                      <h5 className="text-lg font-medium text-gray-700 mb-2">No Consumption Data Yet</h5>
                      <p className="text-gray-500 mb-4">Start tracking your energy usage to see detailed statistics here.</p>
                      <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                        <div className="text-center">
                          <p className="text-xl font-bold text-purple-600">{userStats.totalUserAppliances}</p>
                          <p className="text-sm text-gray-600">My Appliances</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Account Age: </span>
                        <span className="font-medium">{Math.floor(userStats.accountAge / 30)} months</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Login: </span>
                        <span className="font-medium">
                          {userStats.lastLogin ? new Date(userStats.lastLogin).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status: </span>
                        <span className={`font-medium ${
                          userStats.verificationStatus?.email && userStats.verificationStatus?.mobile 
                            ? 'text-green-600' 
                            : 'text-yellow-600'
                        }`}>
                          {userStats.verificationStatus?.email && userStats.verificationStatus?.mobile 
                            ? 'Fully Verified' 
                            : 'Partial Verification'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Latest Activity */}
                    {userStats.latestConsumption && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="text-gray-600">Latest Record: </span>
                          <span className="font-medium">
                            {userStats.latestConsumption.month}/{userStats.latestConsumption.year} - 
                            {userStats.latestConsumption.units} kWh (₹{userStats.latestConsumption.bill?.toFixed(0)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center space-x-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit3 size={16} />
                  <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                </button>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <MapPin size={16} className="mr-2" />
                    Address Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="address.village"
                      placeholder="Village/Area"
                      value={formData.address.village}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    
                    <input
                      type="text"
                      name="address.city"
                      placeholder="City"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    
                    <input
                      type="text"
                      name="address.pincode"
                      placeholder="Pincode"
                      value={formData.address.pincode}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    
                    <input
                      type="text"
                      name="address.state"
                      placeholder="State"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <Save size={16} />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Change Password</span>
                </button>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Notifications</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
                      { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive alerts via SMS' },
                      { key: 'monthlyReports', label: 'Monthly Reports', desc: 'Get monthly consumption reports' },
                      { key: 'energyAlerts', label: 'Energy Alerts', desc: 'Get notified about high usage' }
                    ].map((pref) => (
                      <div key={pref.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{pref.label}</p>
                          <p className="text-sm text-gray-500">{pref.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences[pref.key]}
                            onChange={(e) => handlePreferenceChange(pref.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Regional Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                          value={preferences.language}
                          onChange={(e) => handlePreferenceChange('language', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="en">English</option>
                          <option value="hi">हिंदी</option>
                          <option value="mr">मराठी</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={preferences.timezone}
                        onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="Asia/Mumbai">Asia/Mumbai (IST)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;