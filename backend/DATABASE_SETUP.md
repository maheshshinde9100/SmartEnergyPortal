# MongoDB Atlas Database Setup Guide

This guide will help you set up and test your MongoDB Atlas database for the Smart Energy Portal application.

## Prerequisites

1. **MongoDB Atlas Account**: Make sure you have a MongoDB Atlas account and cluster set up
2. **Environment Variables**: Ensure your `.env` file is properly configured
3. **Network Access**: Your IP address should be whitelisted in MongoDB Atlas

## Environment Configuration

Make sure your `backend/.env` file contains:

```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=smart-energy-portal

# Other required variables...
JWT_SECRET=your-jwt-secret
# ... etc
```

## Setup Scripts

### 1. Test Atlas Connection

First, test if your MongoDB Atlas connection is working:

```bash
cd backend
npm run test-atlas
```

This script will:
- ✅ Test connection to MongoDB Atlas
- ✅ Verify read/write operations
- ✅ List existing collections
- ✅ Show server information
- ✅ Test aggregation pipelines

### 2. Complete Database Setup

Run the full database setup to create all collections, indexes, and sample data:

```bash
cd backend
npm run setup-atlas
```

This script will:
- 🗄️ Create all required collections and indexes
- 👤 Create admin user and sample users
- 🔌 Create default and custom appliances with usage hints
- 💰 Set up tariff rate structure
- 📊 Generate sample consumption data for 6 months
- 🧪 Verify all database operations

## What Gets Created

### Collections and Indexes

1. **Users Collection**
   - Indexes: email, msebCustomerId, role
   - Admin user: `admin@portal.com` / `Admin@123`
   - Sample users: `user1@example.com`, `user2@example.com`, `user3@example.com` / `User@123`

2. **Appliances Collection**
   - Indexes: category, isCustom, createdBy, name (text)
   - 10 default appliances with usage hints
   - 2 sample custom appliances

3. **Consumption Collection**
   - Indexes: userId + month + year (unique), userId + submittedAt
   - 18 consumption records (6 months × 3 users)
   - Realistic usage patterns with seasonal variations

4. **TariffRates Collection**
   - Current MSEB tariff structure
   - 4-slab pricing model

### Sample Data Features

- **Realistic Usage Patterns**: Different appliances have appropriate usage hours
- **Seasonal Variations**: AC usage in summer months
- **Peak Time Analysis**: Appliances tagged with peak usage times
- **Regional Diversity**: Users from different cities (Mumbai, Pune, Nagpur)
- **Usage Hints**: Each appliance has min/max hours and peak time information

## Verification

After running the setup, you should see:

```
📊 Document counts:
  - Users: 4 (1 admin + 3 regular users)
  - Appliances: 12 (10 default + 2 custom)
  - Consumption Records: 18
  - Tariff Rates: 1

🔑 Login Credentials:
Admin: admin@portal.com / Admin@123
User1: user1@example.com / User@123
User2: user2@example.com / User@123
User3: user3@example.com / User@123
```

## Testing the Application

1. **Start the Backend Server**:
   ```bash
   cd backend
   npm start
   ```

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Login**:
   - Admin: `admin@portal.com` / `Admin@123`
   - User: `user1@example.com` / `User@123`

## Troubleshooting

### Connection Issues

If you get connection errors:

1. **Check IP Whitelist**: Ensure your IP is whitelisted in MongoDB Atlas
2. **Verify Credentials**: Check username/password in connection string
3. **Network Access**: Ensure you can access MongoDB Atlas from your network
4. **Connection String**: Verify the format of your MONGODB_URI

### Authentication Errors

```
MongoServerError: bad auth: authentication failed
```

- Check your username and password
- Ensure the database user has read/write permissions
- Verify the database name in the connection string

### Network Errors

```
MongoNetworkError: connection timed out
```

- Check your internet connection
- Verify MongoDB Atlas cluster is running
- Ensure your IP address is whitelisted

## Database Schema

### User Schema
```javascript
{
  email: String (unique),
  password: String (hashed),
  role: 'user' | 'admin',
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    address: { street, city, state, pincode }
  },
  msebCustomerId: String (unique),
  isVerified: Boolean,
  isActive: Boolean
}
```

### Appliance Schema
```javascript
{
  name: String,
  category: String,
  defaultWattage: Number,
  description: String,
  isCustom: Boolean,
  createdBy: ObjectId,
  usageHints: {
    minHours: Number,
    maxHours: Number,
    peakUsageTime: String,
    typicalUsage: String
  }
}
```

### Consumption Schema
```javascript
{
  userId: ObjectId,
  month: Number,
  year: Number,
  appliances: [{
    applianceId: ObjectId,
    quantity: Number,
    dailyHours: Number,
    customWattage: Number
  }],
  totalUnits: Number,
  estimatedBill: Number
}
```

## API Endpoints

After setup, these endpoints will be available:

- `POST /api/auth/login` - User authentication
- `GET /api/appliances` - Get all appliances
- `GET /api/admin/overview` - Admin dashboard data
- `GET /api/admin/peak-usage` - Peak usage analysis
- And many more...

## Next Steps

1. Run the setup scripts
2. Test the connection
3. Start the application servers
4. Login and explore the features
5. Check the admin panel for peak usage analysis

Your Smart Energy Portal is now ready to use with a fully populated MongoDB Atlas database!