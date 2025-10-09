import { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  Settings, 
  Download,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Zap,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  Database
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  
  const [adminData, setAdminData] = useState({
    overview: {
      users: { total: 0, active: 0, verified: 0, inactive: 0 },
      consumption: { currentMonth: 0, lastMonth: 0, growth: 0 },
      revenue: { currentMonth: 0, total: 0 },
      appliances: { total: 0, custom: 0, default: 0 }
    },
    users: [],
    analytics: {
      monthlyTrends: [],
      regionalConsumption: [],
      topConsumers: []
    },
    predictions: {
      nextMonth: { consumption: 0, revenue: 0, users: 0 },
      confidence: 0,
      trend: 'stable',
      historicalData: []
    },
    peakUsage: {
      peakAnalysis: {
        byTimeOfDay: {},
        byCategory: {},
        topPeakAppliances: [],
        regionalPeakUsage: {},
        totalUsers: 0
      },
      peakHours: [],
      summary: {}
    },
    currentTariff: null
  });

  const [newTariff, setNewTariff] = useState({
    slabs: [
      { minUnits: 0, maxUnits: 100, ratePerUnit: 3.5 },
      { minUnits: 101, maxUnits: 300, ratePerUnit: 4.5 },
      { minUnits: 301, maxUnits: 500, ratePerUnit: 6.0 },
      { minUnits: 501, maxUnits: 999999, ratePerUnit: 7.5 }
    ],
    effectiveFrom: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [showTariffModal, setShowTariffModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      // Fetch all admin data in parallel with individual error handling
      const [overviewRes, usersRes, analyticsRes, predictionsRes, peakUsageRes, tariffRes] = await Promise.allSettled([
        adminAPI.getOverview(),
        adminAPI.getUsers({ page: 1, limit: 50 }),
        adminAPI.getAnalytics({ period: selectedPeriod }),
        adminAPI.getPredictions(),
        adminAPI.getPeakUsage(),
        adminAPI.getCurrentTariff()
      ]);

      setAdminData({
        overview: overviewRes.status === 'fulfilled' ? overviewRes.value.data : {
          users: { total: 0, active: 0, verified: 0, inactive: 0 },
          consumption: { currentMonth: 0, lastMonth: 0, growth: 0 },
          revenue: { currentMonth: 0, total: 0 },
          appliances: { total: 0, custom: 0, default: 0 }
        },
        users: usersRes.status === 'fulfilled' ? (usersRes.value.data.users || []) : [],
        analytics: analyticsRes.status === 'fulfilled' ? analyticsRes.value.data : {
          monthlyTrends: [],
          regionalConsumption: [],
          topConsumers: []
        },
        predictions: predictionsRes.status === 'fulfilled' ? predictionsRes.value.data : {
          nextMonth: { consumption: 0, revenue: 0, users: 0 },
          confidence: 0,
          trend: 'stable',
          historicalData: []
        },
        peakUsage: peakUsageRes.status === 'fulfilled' ? peakUsageRes.value.data : {
          peakAnalysis: {
            byTimeOfDay: {},
            byCategory: {},
            topPeakAppliances: [],
            regionalPeakUsage: {},
            totalUsers: 0
          },
          peakHours: [],
          summary: {}
        },
        currentTariff: tariffRes.status === 'fulfilled' ? tariffRes.value.data : null
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load admin data');
      setIsLoading(false);
    }
  };

  const handleTariffSubmit = async (e) => {
    e.preventDefault();
    try {
      // Mock API call
      toast.success('Tariff updated successfully');
      setShowTariffModal(false);
      fetchAdminData();
    } catch (error) {
      toast.error('Failed to update tariff');
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      if (action === 'view') {
        const response = await adminAPI.getUserDetails(userId);
        setSelectedUser(response.data);
        setShowUserModal(true);
      } else if (action === 'activate' || action === 'deactivate') {
        await adminAPI.toggleUserStatus(userId);
        toast.success(`User ${action}d successfully`);
        fetchAdminData();
      }
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const exportData = async (type) => {
    try {
      // Mock export functionality
      toast.success(`${type} data exported successfully`);
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  // Chart configurations
  const monthlyConsumptionData = {
    labels: (adminData.analytics?.monthlyTrends || []).map(item => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[item.month - 1];
    }),
    datasets: [
      {
        label: 'Total Consumption (kWh)',
        data: (adminData.analytics?.monthlyTrends || []).map(item => item.totalConsumption),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2
      },
      {
        label: 'Active Users',
        data: (adminData.analytics?.monthlyTrends || []).map(item => item.userCount),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        yAxisID: 'y1'
      }
    ]
  };

  const regionConsumptionData = {
    labels: (adminData.analytics?.regionalConsumption || []).map(item => item._id),
    datasets: [
      {
        data: (adminData.analytics?.regionalConsumption || []).map(item => item.totalConsumption),
        backgroundColor: [
          '#EF4444',
          '#F59E0B',
          '#10B981',
          '#3B82F6',
          '#8B5CF6'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
      },
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      }
    }
  };

  const filteredUsers = (adminData.users || []).filter(user => {
    const userName = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
    const userEmail = user.email || '';
    const userMsebId = user.msebCustomerId || '';
    
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userMsebId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'active' && user.isActive) ||
                         (selectedFilter === 'inactive' && !user.isActive);
    return matchesSearch && matchesFilter;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'consumption', label: 'Consumption Analytics', icon: Zap },
    { id: 'peak-usage', label: 'Peak Usage Analysis', icon: AlertTriangle },
    { id: 'predictions', label: 'Predictions & Forecasting', icon: TrendingUp },
    { id: 'tariffs', label: 'Tariff Management', icon: IndianRupee },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" text="Loading admin dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-purple-100 mt-1">
              Manage users, monitor consumption, and configure system settings
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Settings size={32} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Total Users</p>
                      <p className="text-2xl font-bold">{adminData.overview.users?.total?.toLocaleString() || 0}</p>
                      <p className="text-xs text-blue-200 mt-1">
                        {adminData.overview.users?.active || 0} active
                      </p>
                    </div>
                    <Users size={32} className="text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Monthly Consumption</p>
                      <p className="text-2xl font-bold">{adminData.overview.consumption?.currentMonth?.toLocaleString() || 0} kWh</p>
                      <p className="text-xs text-green-200 mt-1">
                        {adminData.overview.consumption?.growth > 0 ? '+' : ''}{adminData.overview.consumption?.growth?.toFixed(1) || 0}% growth
                      </p>
                    </div>
                    <Zap size={32} className="text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100">Monthly Revenue</p>
                      <p className="text-2xl font-bold">₹{(adminData.overview.revenue?.currentMonth / 1000)?.toFixed(1) || 0}K</p>
                      <p className="text-xs text-yellow-200 mt-1">
                        Current month
                      </p>
                    </div>
                    <IndianRupee size={32} className="text-yellow-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Total Appliances</p>
                      <p className="text-2xl font-bold">{adminData.overview.appliances?.total || 0}</p>
                      <p className="text-xs text-purple-200 mt-1">
                        {adminData.overview.appliances?.custom || 0} custom
                      </p>
                    </div>
                    <Settings size={32} className="text-purple-200" />
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Consumption & Users</h3>
                  <div className="h-80">
                    <Bar data={monthlyConsumptionData} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Consumption by Region</h3>
                  <div className="h-80">
                    <Doughnut data={regionConsumptionData} options={doughnutOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  
                  <button
                    onClick={() => exportData('users')}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Download size={16} className="mr-2" />
                    Export
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MSEB ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumption</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.profile?.firstName || 'N/A'} {user.profile?.lastName || ''}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.msebCustomerId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.consumption?.latest?.totalUnits || 0} kWh
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleUserAction(user._id, 'view')}
                                className="text-primary-600 hover:text-primary-900"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleUserAction(user._id, user.isActive ? 'deactivate' : 'activate')}
                                className={user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                                title={user.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {user.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Consumption Analytics Tab */}
          {activeTab === 'consumption' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Consumption Analytics</h3>
                <button
                  onClick={() => exportData('consumption')}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Download size={16} className="mr-2" />
                  Export Report
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Monthly Trends</h4>
                  <div className="h-80">
                    <Line data={monthlyConsumptionData} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Regional Distribution</h4>
                  <div className="h-80">
                    <Doughnut data={regionConsumptionData} options={doughnutOptions} />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Top Consuming Regions</h4>
                <div className="space-y-4">
                  {(adminData.analytics?.regionalConsumption || []).map((region, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">{region._id || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (region.totalConsumption / Math.max(...(adminData.analytics?.regionalConsumption || []).map(r => r.totalConsumption), 1)) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-20 text-right">
                          {region.totalConsumption?.toLocaleString() || 0} kWh
                        </span>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {region.userCount || 0} users
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Consumers */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Top Consumers</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Consumption</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average/Month</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(adminData.analytics?.topConsumers || []).map((consumer, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{consumer.name}</div>
                              <div className="text-sm text-gray-500">{consumer.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{consumer.city || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{consumer.totalConsumption?.toFixed(1) || 0} kWh</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{consumer.averageConsumption?.toFixed(1) || 0} kWh</td>
                          <td className="px-4 py-3 text-sm text-gray-900">₹{consumer.totalBill?.toFixed(2) || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Predictions & Forecasting Tab */}
          {activeTab === 'predictions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Predictions & Forecasting</h3>
                <button
                  onClick={fetchAdminData}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <TrendingUp size={16} className="mr-2" />
                  Refresh Predictions
                </button>
              </div>

              {/* Next Month Predictions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Predicted Consumption</p>
                      <p className="text-2xl font-bold">{adminData.predictions.nextMonth?.consumption?.toLocaleString() || 0} kWh</p>
                      <p className="text-xs text-blue-200 mt-1">Next month forecast</p>
                    </div>
                    <Zap size={32} className="text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Predicted Revenue</p>
                      <p className="text-2xl font-bold">₹{(adminData.predictions.nextMonth?.revenue / 1000)?.toFixed(1) || 0}K</p>
                      <p className="text-xs text-green-200 mt-1">Expected earnings</p>
                    </div>
                    <IndianRupee size={32} className="text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Active Users</p>
                      <p className="text-2xl font-bold">{adminData.predictions.nextMonth?.users || 0}</p>
                      <p className="text-xs text-purple-200 mt-1">Projected active users</p>
                    </div>
                    <Users size={32} className="text-purple-200" />
                  </div>
                </div>
              </div>

              {/* Prediction Confidence & Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Prediction Confidence</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Confidence Level</span>
                      <span className="text-lg font-semibold text-gray-900">{adminData.predictions.confidence || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          (adminData.predictions.confidence || 0) >= 80 ? 'bg-green-500' :
                          (adminData.predictions.confidence || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${adminData.predictions.confidence || 0}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        adminData.predictions.trend === 'increasing' ? 'bg-green-500' :
                        adminData.predictions.trend === 'decreasing' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">
                        Trend: <span className="font-medium capitalize">{adminData.predictions.trend || 'stable'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Prediction Factors</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Seasonal Adjustment</span>
                      <span className="text-sm font-medium text-gray-900">Applied</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Historical Data Points</span>
                      <span className="text-sm font-medium text-gray-900">{adminData.predictions.historicalData?.length || 0} months</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Algorithm</span>
                      <span className="text-sm font-medium text-gray-900">Weighted Moving Average</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">User Growth Factor</span>
                      <span className="text-sm font-medium text-gray-900">5% monthly</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical vs Predicted Chart */}
              {adminData.predictions.historicalData && adminData.predictions.historicalData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Historical Data & Prediction</h4>
                  <div className="h-80">
                    <Line 
                      data={{
                        labels: [
                          ...adminData.predictions.historicalData.map(item => {
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return `${months[item.month - 1]} ${item.year}`;
                          }),
                          'Next Month (Predicted)'
                        ],
                        datasets: [
                          {
                            label: 'Historical Consumption (kWh)',
                            data: [
                              ...adminData.predictions.historicalData.map(item => item.totalConsumption),
                              null
                            ],
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            fill: true
                          },
                          {
                            label: 'Predicted Consumption (kWh)',
                            data: [
                              ...Array(adminData.predictions.historicalData.length).fill(null),
                              adminData.predictions.nextMonth?.consumption || 0
                            ],
                            borderColor: 'rgb(239, 68, 68)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 3,
                            borderDash: [5, 5],
                            pointBackgroundColor: 'rgb(239, 68, 68)',
                            pointBorderColor: 'rgb(239, 68, 68)',
                            pointRadius: 6
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          tooltip: {
                            mode: 'index',
                            intersect: false,
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Consumption (kWh)'
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: 'Time Period'
                            }
                          }
                        },
                        interaction: {
                          mode: 'nearest',
                          axis: 'x',
                          intersect: false
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Peak Usage Analysis Tab */}
          {activeTab === 'peak-usage' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Peak Usage Analysis</h3>
                <button
                  onClick={fetchAdminData}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <AlertTriangle size={16} className="mr-2" />
                  Refresh Analysis
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100">Peak Period</p>
                      <p className="text-2xl font-bold capitalize">{adminData.peakUsage.summary?.topPeakPeriod?.period || 'Evening'}</p>
                      <p className="text-xs text-orange-200 mt-1">Highest consumption time</p>
                    </div>
                    <AlertTriangle size={32} className="text-orange-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Total Analyzed</p>
                      <p className="text-2xl font-bold">{adminData.peakUsage.summary?.totalConsumptionAnalyzed?.toFixed(0) || 0} kWh</p>
                      <p className="text-xs text-purple-200 mt-1">Consumption analyzed</p>
                    </div>
                    <BarChart3 size={32} className="text-purple-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-teal-100">Users Analyzed</p>
                      <p className="text-2xl font-bold">{adminData.peakUsage.summary?.totalUsersAnalyzed || 0}</p>
                      <p className="text-xs text-teal-200 mt-1">Active users</p>
                    </div>
                    <Users size={32} className="text-teal-200" />
                  </div>
                </div>
              </div>

              {/* Peak Hours Chart */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Peak Usage Hours</h4>
                <div className="space-y-3">
                  {(adminData.peakUsage.peakHours || []).slice(0, 8).map((hour, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-red-500' :
                          index === 1 ? 'bg-orange-500' :
                          index === 2 ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="font-medium text-gray-900">{hour.hour}</span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full capitalize">
                          {hour.period}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              index === 0 ? 'bg-red-500' :
                              index === 1 ? 'bg-orange-500' :
                              index === 2 ? 'bg-yellow-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.min(100, (hour.consumption / Math.max(...(adminData.peakUsage.peakHours || []).map(h => h.consumption), 1)) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-20 text-right">
                          {hour.consumption?.toFixed(1) || 0} kWh
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage by Time of Day */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Usage by Time of Day</h4>
                  <div className="space-y-4">
                    {Object.entries(adminData.peakUsage.peakAnalysis?.byTimeOfDay || {}).map(([period, data]) => (
                      <div key={period} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${
                            period === 'morning' ? 'bg-yellow-500' :
                            period === 'afternoon' ? 'bg-orange-500' :
                            period === 'evening' ? 'bg-red-500' :
                            period === 'night' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}></div>
                          <div>
                            <span className="font-medium text-gray-900 capitalize">{period.replace('-', ' ')}</span>
                            <p className="text-xs text-gray-500">{data.userCount || 0} users</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-gray-900">{data.totalUsage?.toFixed(1) || 0}</span>
                          <span className="text-sm text-gray-600 ml-1">kWh</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Top Peak Appliances</h4>
                  <div className="space-y-3">
                    {(adminData.peakUsage.peakAnalysis?.topPeakAppliances || []).slice(0, 8).map((appliance, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Zap size={16} className="text-primary-600" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{appliance.name}</span>
                            <p className="text-xs text-gray-500">{appliance.category} • {appliance.avgWattage}W</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">{appliance.usage?.toFixed(1) || 0} kWh</span>
                          <p className="text-xs text-gray-500">{appliance.count || 0} instances</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Usage by Category */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Peak Usage by Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(adminData.peakUsage.peakAnalysis?.byCategory || {}).map(([category, data]) => (
                    <div key={category} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900">{category}</h5>
                        <span className="text-lg font-bold text-primary-600">{data.totalUsage?.toFixed(1) || 0} kWh</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(data.peakTimes || {}).map(([time, usage]) => (
                          usage > 0 && (
                            <div key={time} className="flex justify-between text-sm">
                              <span className="text-gray-600 capitalize">{time.replace('-', ' ')}</span>
                              <span className="font-medium">{usage?.toFixed(1) || 0} kWh</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regional Peak Usage */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Regional Peak Usage</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Usage</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peak Period</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peak Usage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(adminData.peakUsage.peakAnalysis?.regionalPeakUsage || {}).map(([city, data]) => {
                        const peakPeriod = Object.entries(data.peakTimes || {}).reduce((max, [period, usage]) => 
                          usage > max.usage ? { period, usage } : max, { period: 'evening', usage: 0 }
                        );
                        return (
                          <tr key={city} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{city}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{data.totalUsage?.toFixed(1) || 0} kWh</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{data.userCount || 0}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full capitalize">
                                {peakPeriod.period.replace('-', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{peakPeriod.usage?.toFixed(1) || 0} kWh</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tariff Management Tab */}
          {activeTab === 'tariffs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Tariff Management</h3>
                <button
                  onClick={() => setShowTariffModal(true)}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus size={16} className="mr-2" />
                  Update Tariff
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Current Tariff Structure</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slab</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units Range</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate per Unit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {adminData.currentTariff?.slabs?.map((slab, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            Slab {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {slab.minUnits} - {slab.maxUnits === 999999 ? '∞' : slab.maxUnits} units
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{slab.ratePerUnit}/unit
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                            No tariff data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">System Reports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: 'Monthly Consumption Report', desc: 'Detailed consumption analysis', icon: BarChart3, type: 'consumption' },
                  { title: 'User Activity Report', desc: 'User engagement and activity', icon: Users, type: 'users' },
                  { title: 'Revenue Report', desc: 'Financial performance analysis', icon: IndianRupee, type: 'revenue' },
                  { title: 'System Performance', desc: 'Technical metrics and uptime', icon: Database, type: 'system' },
                  { title: 'Regional Analysis', desc: 'Geographic consumption patterns', icon: TrendingUp, type: 'regional' },
                  { title: 'Efficiency Report', desc: 'Energy efficiency insights', icon: Zap, type: 'efficiency' }
                ].map((report, index) => {
                  const Icon = report.icon;
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Icon size={24} className="text-primary-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{report.title}</h4>
                          <p className="text-sm text-gray-500">{report.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => exportData(report.type)}
                        className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Download size={16} className="mr-2" />
                        Generate Report
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tariff Modal */}
      {showTariffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Update Tariff Structure</h3>
              <button
                onClick={() => setShowTariffModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleTariffSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effective From
                </label>
                <input
                  type="date"
                  value={newTariff.effectiveFrom}
                  onChange={(e) => setNewTariff(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTariff.description}
                  onChange={(e) => setNewTariff(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of tariff changes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Tariff Slabs
                </label>
                <div className="space-y-4">
                  {newTariff.slabs.map((slab, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min Units</label>
                        <input
                          type="number"
                          value={slab.minUnits}
                          onChange={(e) => {
                            const newSlabs = [...newTariff.slabs];
                            newSlabs[index].minUnits = parseInt(e.target.value);
                            setNewTariff(prev => ({ ...prev, slabs: newSlabs }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max Units</label>
                        <input
                          type="number"
                          value={slab.maxUnits === 999999 ? '' : slab.maxUnits}
                          onChange={(e) => {
                            const newSlabs = [...newTariff.slabs];
                            newSlabs[index].maxUnits = e.target.value ? parseInt(e.target.value) : 999999;
                            setNewTariff(prev => ({ ...prev, slabs: newSlabs }));
                          }}
                          placeholder="∞"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Rate (₹/unit)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={slab.ratePerUnit}
                          onChange={(e) => {
                            const newSlabs = [...newTariff.slabs];
                            newSlabs[index].ratePerUnit = parseFloat(e.target.value);
                            setNewTariff(prev => ({ ...prev, slabs: newSlabs }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowTariffModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Update Tariff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">User Details & Predictions</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Personal Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedUser.user?.profile?.firstName} {selectedUser.user?.profile?.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedUser.user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">MSEB ID:</span>
                      <span className="font-medium">{selectedUser.user?.msebCustomerId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{selectedUser.user?.profile?.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedUser.user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedUser.user?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Street:</span>
                      <span className="font-medium">{selectedUser.user?.profile?.address?.street}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">City:</span>
                      <span className="font-medium">{selectedUser.user?.profile?.address?.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">State:</span>
                      <span className="font-medium">{selectedUser.user?.profile?.address?.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pincode:</span>
                      <span className="font-medium">{selectedUser.user?.profile?.address?.pincode}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consumption Statistics */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Consumption Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedUser.consumption?.statistics?.totalRecords || 0}</div>
                    <div className="text-sm text-gray-600">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedUser.consumption?.statistics?.totalConsumption || 0} kWh</div>
                    <div className="text-sm text-gray-600">Total Consumption</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">₹{selectedUser.consumption?.statistics?.totalBill || 0}</div>
                    <div className="text-sm text-gray-600">Total Bill</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedUser.consumption?.statistics?.averageConsumption || 0} kWh</div>
                    <div className="text-sm text-gray-600">Avg/Month</div>
                  </div>
                </div>
              </div>

              {/* Prediction Section */}
              {selectedUser.prediction && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp size={20} className="mr-2 text-blue-600" />
                    Next Month Prediction
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {selectedUser.prediction.nextMonth?.consumption || 0} kWh
                      </div>
                      <div className="text-sm text-gray-600">Predicted Consumption</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-green-600">
                        ₹{selectedUser.prediction.nextMonth?.estimatedBill || 0}
                      </div>
                      <div className="text-sm text-gray-600">Estimated Bill</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-purple-600">
                        {selectedUser.prediction.confidence || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Confidence Level</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 text-center">
                    Based on {selectedUser.prediction.basedOnMonths || 0} months of historical data
                  </div>
                </div>
              )}

              {/* Recent Consumption History */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Recent Consumption History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Consumption</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Appliances</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedUser.consumption?.history?.slice(0, 6).map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {record.month}/{record.year}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {record.totalUnits} kWh
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            ₹{record.estimatedBill?.toFixed(2) || 0}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {record.appliances?.length || 0} appliances
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Custom Appliances */}
              {selectedUser.customAppliances && selectedUser.customAppliances.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Custom Appliances</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedUser.customAppliances.map((appliance, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">{appliance.name}</div>
                            <div className="text-sm text-gray-600">{appliance.category}</div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {appliance.defaultWattage}W
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;