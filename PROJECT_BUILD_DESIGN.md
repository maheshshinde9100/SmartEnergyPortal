# MERN Stack Smart Energy Portal - Build Design Document

## Project Overview
A comprehensive full-stack web application for electrical departments to provide consumers with intelligent energy management capabilities, built using the MERN stack (MongoDB, Express.js, React, Node.js).

## Architecture Overview

### Frontend (React + Vite)
- **Framework**: React 18 with functional components and hooks
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with glassmorphism design
- **Routing**: React Router v6
- **State Management**: React Context API + useReducer
- **Charts**: Chart.js or Recharts for analytics visualization
- **HTTP Client**: Axios for API communication

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express.js framework
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with refresh token mechanism
- **Security**: bcrypt, helmet, cors, rate-limiting
- **Validation**: express-validator for input validation
- **File Upload**: multer for handling file uploads
- **Email**: nodemailer for OTP and notifications

### Database Schema Design

#### Users Collection
```javascript
{
  _id: ObjectId,
  msebCustomerId: String (unique),
  email: String (unique),
  mobile: String (unique),
  password: String (hashed),
  profile: {
    firstName: String,
    lastName: String,
    address: {
      village: String,
      city: String,
      pincode: String,
      state: String
    }
  },
  isVerified: Boolean,
  role: String (enum: 'user', 'admin'),
  createdAt: Date,
  updatedAt: Date
}
```

#### Appliances Collection
```javascript
{
  _id: ObjectId,
  name: String,
  category: String,
  defaultWattage: Number,
  isCustom: Boolean,
  createdBy: ObjectId (ref: User),
  createdAt: Date
}
```

#### Consumption Records Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  month: Number,
  year: Number,
  appliances: [{
    applianceId: ObjectId (ref: Appliance),
    quantity: Number,
    dailyHours: Number,
    customWattage: Number
  }],
  totalUnits: Number,
  estimatedBill: Number,
  submittedAt: Date
}
```

#### Tariff Rates Collection
```javascript
{
  _id: ObjectId,
  slabs: [{
    minUnits: Number,
    maxUnits: Number,
    ratePerUnit: Number
  }],
  effectiveFrom: Date,
  createdBy: ObjectId (ref: User),
  isActive: Boolean
}
```

## API Endpoints Design

### Authentication Routes
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/refresh-token` - Token refresh
- `POST /api/auth/logout` - User logout

### User Routes
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/change-password` - Change password

### Appliance Routes
- `GET /api/appliances` - Get all appliances
- `POST /api/appliances` - Add custom appliance
- `PUT /api/appliances/:id` - Update appliance
- `DELETE /api/appliances/:id` - Delete custom appliance

### Consumption Routes
- `POST /api/consumption` - Submit monthly consumption
- `GET /api/consumption/history` - Get consumption history
- `GET /api/consumption/current` - Get current month data
- `GET /api/consumption/predictions` - Get consumption predictions

### Analytics Routes
- `GET /api/analytics/consumption-trends` - Get consumption trends
- `GET /api/analytics/peak-hours` - Get peak hour analysis
- `GET /api/analytics/comparisons` - Get comparative analysis

### Admin Routes
- `GET /api/admin/users` - Get all users
- `GET /api/admin/consumption-overview` - Get system-wide consumption
- `POST /api/admin/tariff` - Update tariff rates
- `GET /api/admin/reports` - Generate reports
- `GET /api/admin/export` - Export data

## Frontend Component Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── ErrorBoundary.jsx
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   │   └── OTPVerification.jsx
│   ├── dashboard/
│   │   ├── DashboardOverview.jsx
│   │   ├── ConsumptionChart.jsx
│   │   └── PredictionCard.jsx
│   ├── appliances/
│   │   ├── ApplianceList.jsx
│   │   ├── ApplianceForm.jsx
│   │   └── ConsumptionForm.jsx
│   ├── analytics/
│   │   ├── TrendsChart.jsx
│   │   ├── PeakHoursChart.jsx
│   │   └── ComparisonChart.jsx
│   └── admin/
│       ├── UserManagement.jsx
│       ├── TariffManagement.jsx
│       └── ReportsPanel.jsx
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── Appliances.jsx
│   ├── Analytics.jsx
│   ├── Profile.jsx
│   └── Admin.jsx
├── context/
│   ├── AuthContext.jsx
│   ├── ApplianceContext.jsx
│   └── ConsumptionContext.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useApi.js
│   └── useLocalStorage.js
├── services/
│   ├── api.js
│   ├── auth.js
│   └── calculations.js
└── utils/
    ├── constants.js
    ├── helpers.js
    └── validators.js
```

## Backend Structure

```
backend/
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── applianceController.js
│   ├── consumptionController.js
│   ├── analyticsController.js
│   └── adminController.js
├── models/
│   ├── User.js
│   ├── Appliance.js
│   ├── Consumption.js
│   └── TariffRate.js
├── middleware/
│   ├── auth.js
│   ├── validation.js
│   ├── errorHandler.js
│   └── rateLimiter.js
├── routes/
│   ├── auth.js
│   ├── users.js
│   ├── appliances.js
│   ├── consumption.js
│   ├── analytics.js
│   └── admin.js
├── services/
│   ├── emailService.js
│   ├── otpService.js
│   ├── predictionService.js
│   └── calculationService.js
├── utils/
│   ├── database.js
│   ├── logger.js
│   └── helpers.js
└── config/
    ├── database.js
    ├── jwt.js
    └── email.js
```

## Key Algorithms

### Energy Consumption Calculation
```javascript
const calculateMonthlyConsumption = (appliances) => {
  return appliances.reduce((total, appliance) => {
    const dailyConsumption = (appliance.wattage * appliance.dailyHours) / 1000; // kWh
    const monthlyConsumption = dailyConsumption * 30;
    return total + (monthlyConsumption * appliance.quantity);
  }, 0);
};
```

### Prediction Algorithm (Moving Average)
```javascript
const predictNextMonthConsumption = (historicalData) => {
  const weights = [0.4, 0.3, 0.2, 0.1]; // Recent months have higher weight
  const recentData = historicalData.slice(-4);
  
  const weightedSum = recentData.reduce((sum, data, index) => {
    return sum + (data.totalUnits * weights[index]);
  }, 0);
  
  const seasonalFactor = getSeasonalFactor(new Date().getMonth());
  return Math.round(weightedSum * seasonalFactor);
};
```

## Security Implementation

### JWT Token Strategy
- Access tokens (15 minutes expiry)
- Refresh tokens (7 days expiry)
- Token rotation on refresh
- Secure HTTP-only cookies for refresh tokens

### Input Validation
- Server-side validation using express-validator
- Client-side validation using custom hooks
- XSS protection with DOMPurify
- SQL injection prevention with parameterized queries

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- API endpoints: 100 requests per 15 minutes
- File upload: 10 requests per hour

## Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization and lazy loading
- Memoization with React.memo and useMemo
- Virtual scrolling for large lists
- Service worker for caching

### Backend
- Database indexing on frequently queried fields
- Response caching with Redis (future enhancement)
- Pagination for large datasets
- Compression middleware
- Connection pooling

## Deployment Strategy

### Development Environment
- Frontend: Vite dev server (port 5173)
- Backend: nodemon (port 5000)
- Database: Local MongoDB instance

### Production Environment
- Frontend: Static build deployed to CDN
- Backend: PM2 process manager
- Database: MongoDB Atlas
- Reverse proxy: Nginx
- SSL: Let's Encrypt certificates

## Testing Strategy

### Frontend Testing
- Unit tests: Jest + React Testing Library
- Integration tests: Cypress
- Component testing: Storybook

### Backend Testing
- Unit tests: Jest + Supertest
- API testing: Postman/Newman
- Load testing: Artillery

## Monitoring & Analytics

### Application Monitoring
- Error tracking: Sentry
- Performance monitoring: New Relic
- Uptime monitoring: Pingdom

### Business Analytics
- User behavior: Google Analytics
- Custom metrics: MongoDB aggregation pipelines
- Real-time dashboards: Chart.js with WebSocket updates

## Development Timeline

### Phase 1 (Weeks 1-4): Foundation
- Project setup and configuration
- Authentication system
- Basic user management
- Core appliance functionality

### Phase 2 (Weeks 5-8): Core Features
- Consumption tracking
- Basic predictions
- User dashboard
- Admin panel basics

### Phase 3 (Weeks 9-12): Advanced Features
- Advanced analytics
- Enhanced predictions
- Comprehensive admin features
- Mobile optimization

### Phase 4 (Weeks 13-16): Polish & Deploy
- Testing and bug fixes
- Performance optimization
- Security hardening
- Production deployment

This comprehensive build design provides a solid foundation for developing your Smart Energy Portal with scalability, security, and maintainability in mind.