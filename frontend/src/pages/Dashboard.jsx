import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { dashboardAPI } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const response = await dashboardAPI.getData();
        
        if (response.success) {
          setDashboardData(response.data);
        } else {
          toast.error('Failed to load dashboard data');
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        toast.error('Failed to load dashboard data');
      } finally {
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

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Unable to load dashboard data. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Handle different data structures for user vs admin
  const isAdmin = user?.role === 'admin';
  
  let currentConsumption, currentBill, lastConsumption, lastBill, consumptionChange, isConsumptionUp;
  let totalAppliances, recentActivity, insights;

  if (isAdmin) {
    // Admin dashboard data
    currentConsumption = dashboardData.currentMonth?.consumption || 0;
    currentBill = dashboardData.currentMonth?.revenue || 0;
    lastConsumption = 0; // We'll calculate this from trends if available
    lastBill = 0;
    consumptionChange = dashboardData.currentMonth?.growth || 0;
    isConsumptionUp = consumptionChange > 0;
    totalAppliances = dashboardData.system?.totalAppliances || 0;
    recentActivity = [
      { action: `${dashboardData.system?.recentUsers || 0} new users this month`, date: 'This month' },
      { action: `${dashboardData.system?.totalUsers || 0} total users`, date: 'System wide' },
      { action: `${dashboardData.currentMonth?.activeUsers || 0} active users`, date: 'This month' }
    ];
    insights = dashboardData.insights;
  } else {
    // User dashboard data
    const isEstimated = dashboardData.currentMonth?.isEstimated || false;
    currentConsumption = isEstimated 
      ? (dashboardData.currentMonth?.estimatedConsumption || 0)
      : (dashboardData.currentMonth?.consumption || 0);
    currentBill = isEstimated
      ? (dashboardData.currentMonth?.estimatedBill || 0)
      : (dashboardData.currentMonth?.bill || 0);
    
    // Calculate last month data from recent activity
    const lastMonthData = dashboardData.recentActivity?.find(activity => 
      activity.month === (new Date().getMonth() === 0 ? 12 : new Date().getMonth()) &&
      activity.year === (new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear())
    );
    
    lastConsumption = lastMonthData?.consumption || 0;
    lastBill = lastMonthData?.bill || 0;
    
    consumptionChange = dashboardData.currentMonth?.change || 0;
    isConsumptionUp = consumptionChange > 0;
    totalAppliances = dashboardData.appliances?.total || 0;
    
    recentActivity = dashboardData.recentActivity?.slice(0, 3).map(activity => ({
      action: `${activity.consumption} kWh consumed`,
      date: `${activity.month}/${activity.year}`
    })) || [];
    
    insights = dashboardData.insights;
  }

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

      {/* Info Banner for Estimated Data */}
      {!isAdmin && dashboardData.currentMonth?.isEstimated && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-orange-900 mb-1">
                Showing Estimated Consumption
              </h4>
              <p className="text-sm text-orange-800">
                You have {dashboardData.appliances?.total || 0} appliance(s) added, but no consumption data submitted yet. 
                The values shown are estimates based on typical appliance usage. 
                <button 
                  onClick={() => toast.info('Consumption submission feature coming soon! For now, use the sample data script: npm run add-sample-consumption', { duration: 6000 })}
                  className="font-medium underline ml-1 hover:text-orange-900"
                >
                  Submit your actual consumption data
                </button> to see accurate statistics and predictions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Consumption */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {isAdmin ? 'System Consumption' : 'Current Month'}
                {!isAdmin && dashboardData.currentMonth?.isEstimated && (
                  <span className="ml-2 text-xs text-orange-600 font-normal">(Estimated)</span>
                )}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {currentConsumption.toFixed(1)} kWh
              </p>
              <div className="flex items-center mt-2">
                {consumptionChange !== 0 ? (
                  <>
                    <TrendingUp 
                      size={16} 
                      className={isConsumptionUp ? 'text-red-500' : 'text-green-500'} 
                    />
                    <span className={`text-sm ml-1 ${isConsumptionUp ? 'text-red-600' : 'text-green-600'}`}>
                      {Math.abs(consumptionChange).toFixed(1)}% from last month
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    {dashboardData.currentMonth?.isEstimated ? 'Based on appliances' : 'No change'}
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Estimated Bill / Revenue */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {isAdmin ? 'System Revenue' : 'Estimated Bill'}
                {!isAdmin && dashboardData.currentMonth?.isEstimated && (
                  <span className="ml-2 text-xs text-orange-600 font-normal">(Estimated)</span>
                )}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{currentBill.toFixed(0)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {dashboardData.currentMonth?.isEstimated 
                  ? 'Based on appliance usage' 
                  : (lastBill > 0 ? `Last month: ₹${lastBill.toFixed(0)}` : 'Current month')
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <IndianRupee size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        {/* Users / Prediction */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {isAdmin ? 'Total Users' : 'Average Usage'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {isAdmin 
                  ? dashboardData.system?.totalUsers || 0
                  : `${dashboardData.user?.averageConsumption?.toFixed(1) || 0} kWh`
                }
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {isAdmin 
                  ? `${dashboardData.system?.activeUsers || 0} active`
                  : 'Monthly average'
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        {/* Appliances */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {isAdmin ? 'System Appliances' : 'My Appliances'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalAppliances}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {isAdmin ? 'Total registered' : 'In your account'}
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
        {/* Top Appliances / Monthly Trends */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {isAdmin ? 'Monthly Trends' : 'Top Appliances'}
            </h3>
            <Clock size={20} className="text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {isAdmin ? (
              // Admin: Show monthly trends
              dashboardData.monthlyTrends?.slice(0, 3).map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {trend.month}/{trend.year}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((trend.consumption / 1000) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{trend.consumption?.toFixed(1)} kWh</span>
                  </div>
                </div>
              )) || []
            ) : (
              // User: Show top appliances
              dashboardData.appliances?.topConsumers?.map((appliance, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">{appliance.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((appliance.wattage / 2000) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{appliance.wattage}W</span>
                  </div>
                </div>
              )) || []
            )}
            
            {/* Show message if no data */}
            {((isAdmin && (!dashboardData.monthlyTrends || dashboardData.monthlyTrends.length === 0)) ||
              (!isAdmin && (!dashboardData.appliances?.topConsumers || dashboardData.appliances.topConsumers.length === 0))) && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">
                  {isAdmin ? 'No trend data available' : 'No appliances added yet'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity / Insights */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {isAdmin ? 'System Insights' : 'Recent Activity'}
            </h3>
            <Calendar size={20} className="text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {isAdmin ? (
              // Admin: Show system insights and alerts
              <>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      System Health: {dashboardData.insights?.systemHealth || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">Current status</p>
                  </div>
                </div>
                
                {dashboardData.insights?.alerts?.map((alert, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === 'warning' ? 'bg-yellow-500' :
                      alert.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500">{alert.type}</p>
                    </div>
                  </div>
                )) || []}
                
                {(!dashboardData.insights?.alerts || dashboardData.insights.alerts.length === 0) && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No alerts at this time</p>
                  </div>
                )}
              </>
            ) : (
              // User: Show recent activity and recommendations
              <>
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.date}</p>
                    </div>
                  </div>
                ))}
                
                {insights?.recommendation && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb size={16} className="text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Recommendation</p>
                        <p className="text-xs text-blue-700 mt-1">{insights.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {recentActivity.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No recent activity</p>
                    <p className="text-xs text-gray-400 mt-1">Start by adding appliances or consumption data</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => {
              if (isAdmin) {
                toast.info('Admin users can view consumption data in Analytics');
                navigate('/analytics');
              } else {
                // For now, show message until Consumption page is created
                toast.info('Consumption submission feature coming soon! For now, consumption data can be added via API or scripts.', { duration: 5000 });
                // TODO: navigate('/consumption') when page is created
              }
            }}
            className="flex items-center justify-center p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <Zap size={20} className="text-primary-600 mr-2" />
            <span className="text-sm font-medium text-primary-700">
              {isAdmin ? 'View Consumption' : 'Add Consumption'}
            </span>
          </button>
          
          <button 
            onClick={() => navigate('/appliances')}
            className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <Lightbulb size={20} className="text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-700">Manage Appliances</span>
          </button>
          
          <button 
            onClick={() => navigate('/analytics')}
            className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <BarChart3 size={20} className="text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-700">View Analytics</span>
          </button>
          
          <button 
            onClick={() => {
              if (isAdmin) {
                toast.info('View user recommendations in User Management');
                navigate('/admin');
              } else if (dashboardData?.insights?.recommendation) {
                toast.success(dashboardData.insights.recommendation, { duration: 6000 });
              } else {
                toast.info('Add appliances and submit consumption data to get personalized recommendations');
              }
            }}
            className="flex items-center justify-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <AlertCircle size={20} className="text-orange-600 mr-2" />
            <span className="text-sm font-medium text-orange-700">Get Recommendations</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;