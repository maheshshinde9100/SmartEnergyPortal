import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Zap, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Register = () => {
  const [formData, setFormData] = useState({
    msebCustomerId: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    profile: {
      firstName: '',
      lastName: '',
      address: {
        village: '',
        city: '',
        pincode: '',
        state: 'Maharashtra'
      }
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);

  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: grandchild ? {
            ...prev[parent][child],
            [grandchild]: value
          } : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.msebCustomerId.trim()) {
      newErrors.msebCustomerId = 'MSEB Customer ID is required';
    } else if (!/^[A-Z0-9]{8,20}$/.test(formData.msebCustomerId.toUpperCase())) {
      newErrors.msebCustomerId = 'Invalid MSEB Customer ID format';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = 'Invalid mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.profile.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.profile.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.profile.address.village.trim()) {
      newErrors.village = 'Village is required';
    }

    if (!formData.profile.address.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.profile.address.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^[1-9][0-9]{5}$/.test(formData.profile.address.pincode)) {
      newErrors.pincode = 'Invalid pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }

    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep3()) {
      return;
    }

    const result = await register(formData);
    
    if (result.success) {
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please verify your email and mobile number.' 
        }
      });
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
        <p className="text-sm text-gray-600">Enter your MSEB details and contact information</p>
      </div>

      {/* MSEB Customer ID */}
      <div>
        <label htmlFor="msebCustomerId" className="form-label">
          MSEB Customer ID
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CreditCard size={20} className="text-gray-400" />
          </div>
          <input
            id="msebCustomerId"
            name="msebCustomerId"
            type="text"
            className={`form-input pl-10 uppercase ${errors.msebCustomerId ? 'border-red-300' : ''}`}
            placeholder="Enter your MSEB Customer ID"
            value={formData.msebCustomerId}
            onChange={handleChange}
          />
        </div>
        {errors.msebCustomerId && (
          <p className="mt-1 text-sm text-red-600">{errors.msebCustomerId}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="form-label">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail size={20} className="text-gray-400" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            className={`form-input pl-10 ${errors.email ? 'border-red-300' : ''}`}
            placeholder="Enter your email address"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Mobile */}
      <div>
        <label htmlFor="mobile" className="form-label">
          Mobile Number
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone size={20} className="text-gray-400" />
          </div>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            className={`form-input pl-10 ${errors.mobile ? 'border-red-300' : ''}`}
            placeholder="Enter your mobile number"
            value={formData.mobile}
            onChange={handleChange}
          />
        </div>
        {errors.mobile && (
          <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
        <p className="text-sm text-gray-600">Tell us about yourself and your location</p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="form-label">
            First Name
          </label>
          <input
            id="firstName"
            name="profile.firstName"
            type="text"
            className={`form-input ${errors.firstName ? 'border-red-300' : ''}`}
            placeholder="First name"
            value={formData.profile.firstName}
            onChange={handleChange}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="form-label">
            Last Name
          </label>
          <input
            id="lastName"
            name="profile.lastName"
            type="text"
            className={`form-input ${errors.lastName ? 'border-red-300' : ''}`}
            placeholder="Last name"
            value={formData.profile.lastName}
            onChange={handleChange}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Address Fields */}
      <div>
        <label htmlFor="village" className="form-label">
          Village/Area
        </label>
        <input
          id="village"
          name="profile.address.village"
          type="text"
          className={`form-input ${errors.village ? 'border-red-300' : ''}`}
          placeholder="Enter your village or area"
          value={formData.profile.address.village}
          onChange={handleChange}
        />
        {errors.village && (
          <p className="mt-1 text-sm text-red-600">{errors.village}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="form-label">
            City
          </label>
          <input
            id="city"
            name="profile.address.city"
            type="text"
            className={`form-input ${errors.city ? 'border-red-300' : ''}`}
            placeholder="City"
            value={formData.profile.address.city}
            onChange={handleChange}
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city}</p>
          )}
        </div>

        <div>
          <label htmlFor="pincode" className="form-label">
            Pincode
          </label>
          <input
            id="pincode"
            name="profile.address.pincode"
            type="text"
            className={`form-input ${errors.pincode ? 'border-red-300' : ''}`}
            placeholder="Pincode"
            value={formData.profile.address.pincode}
            onChange={handleChange}
          />
          {errors.pincode && (
            <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="state" className="form-label">
          State
        </label>
        <input
          id="state"
          name="profile.address.state"
          type="text"
          className="form-input bg-gray-50"
          value={formData.profile.address.state}
          readOnly
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Create Password</h3>
        <p className="text-sm text-gray-600">Choose a strong password for your account</p>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className={`form-input pr-10 ${errors.password ? 'border-red-300' : ''}`}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} className="text-gray-400" />
            ) : (
              <Eye size={20} className="text-gray-400" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="form-label">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            className={`form-input pr-10 ${errors.confirmPassword ? 'border-red-300' : ''}`}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} className="text-gray-400" />
            ) : (
              <Eye size={20} className="text-gray-400" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Password Requirements */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• At least 8 characters long</li>
          <li>• Contains uppercase and lowercase letters</li>
          <li>• Contains at least one number</li>
          <li>• Contains at least one special character (@$!%*?&)</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap size={32} className="text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join Smart Energy Portal today
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-8 h-0.5 ${
                    step < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Registration Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="btn-secondary"
                >
                  Previous
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary ml-auto"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary ml-auto disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="small" color="white" className="mr-2" />
                      Creating Account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;