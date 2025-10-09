import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Zap, 
  TrendingUp, 
  Calendar, 
  AlertCircle,
  BarChart3,
  Clock,
  IndianRupee,
  Lightbulb
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    currentMonth: {
      consumption: 0,
      estimatedBill: 0,
      appliances: 0
    },
    lastMonth: {
      consumption: 0,
      bill: 0
    },
    prediction: {
      nextMonth: 0,
      confidence: 0
    },
    peakHours: [],
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchDashboardData = async () => {
      try {
        // Mock data for now
        setTimeout(() => {
          setDashboardData({
            currentMonth: {
              consumption: 245.5,
              estimatedBill: 1850,
              appliances: 12
            },
            lastMonth: {
              consumption: 220.3,
              bill: 1650
            },
            prediction: {
              nextMonth: 260.2,
              confidence: 85
            },
            peakHours: [
              { hour: '18:00-20:00', consumption: 45.2 },
              { hour: '20:00-22:00', consumption: 38.7 },
              { hour: '06:00-08:00', consumption: 32.1 }
            ],
            recentActivity: [
              { action: 'Consumption data submitted', date: '2 days ago' },
              { action: 'New appliance added: LED TV', date: '5 days ago' },
              { action: 'Monthly bill generated', date: '1 week ago' }
            ]
          });
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    );
  }

  const consumptionChange = ((dashboardData.currentMonth.consumption - dashboardData.lastMonth.consumption) / dashboardData.lastMonth.consumption * 100).toFixed(1);
  const isConsumptionUp = consumptionChange > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.profile?.firstName}!
            </h1>
            <p className="text-primary-100 mt-1">
              Here's your energy consumption overview for this month
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Zap size={32} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Consumption */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.currentMonth.consumption} kWh
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp 
                  size={16} 
                  className={isConsumptionUp ? 'text-red-500' : 'text-green-500'} 
                />
                <span className={`text-sm ml-1 ${isConsumptionUp ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.abs(consumptionChange)}% from last month
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Estimated Bill */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Estimated Bill</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{dashboardData.currentMonth.estimatedBill}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Last month: ₹{dashboardData.lastMonth.bill}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <IndianRupee size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        {/* Prediction */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Next Month Prediction</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.prediction.nextMonth} kWh
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {dashboardData.prediction.confidence}% confidence
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        {/* Active Appliances */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Appliances</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.currentMonth.appliances}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Tracked this month
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Lightbulb size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Peak Usage Hours</h3>
            <Clock size={20} className="text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {dashboardData.peakHours.map((peak, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{peak.hour}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full" 
                      style={{ width: `${(peak.consumption / 50) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{peak.consumption} kWh</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Calendar size={20} className="text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {dashboardData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
            <Zap size={20} className="text-primary-600 mr-2" />
            <span className="text-sm font-medium text-primary-700">Add Consumption</span>
          </button>
          
          <button className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <Lightbulb size={20} className="text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-700">Manage Appliances</span>
          </button>
          
          <button className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            <BarChart3 size={20} className="text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-700">View Analytics</span>
          </button>
          
          <button className="flex items-center justify-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
            <AlertCircle size={20} className="text-orange-600 mr-2" />
            <span className="text-sm font-medium text-orange-700">Get Recommendations</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;