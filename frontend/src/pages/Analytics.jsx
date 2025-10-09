import { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Calendar,
    Zap,
    Clock,
    Target,
    Activity,
    Filter,
    Download
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
import { analyticsAPI } from '../services/api';

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

const Analytics = () => {
    const [analyticsData, setAnalyticsData] = useState({
        trends: {
            monthly: [],
            yearly: []
        },
        peakHours: [],
        comparisons: {
            appliances: [],
            seasonal: []
        },
        efficiency: {
            score: 0,
            recommendations: []
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('6months');
    const [selectedView, setSelectedView] = useState('consumption');

    useEffect(() => {
        fetchAnalyticsData();
    }, [selectedPeriod]);

    const fetchAnalyticsData = async () => {
        setIsLoading(true);
        try {
            // Mock data for now - replace with actual API calls
            setTimeout(() => {
                setAnalyticsData({
                    trends: {
                        monthly: [
                            { month: 'Jan', consumption: 220, bill: 1650, prediction: 225 },
                            { month: 'Feb', consumption: 195, bill: 1450, prediction: 200 },
                            { month: 'Mar', consumption: 245, bill: 1850, prediction: 240 },
                            { month: 'Apr', consumption: 280, bill: 2100, prediction: 275 },
                            { month: 'May', consumption: 320, bill: 2400, prediction: 315 },
                            { month: 'Jun', consumption: 350, bill: 2650, prediction: 345 }
                        ],
                        yearly: [
                            { year: '2022', consumption: 2850, bill: 21500 },
                            { year: '2023', consumption: 3120, bill: 23400 },
                            { year: '2024', consumption: 2890, bill: 21800 }
                        ]
                    },
                    peakHours: [
                        { hour: '06:00', consumption: 25.5 },
                        { hour: '07:00', consumption: 32.1 },
                        { hour: '08:00', consumption: 28.7 },
                        { hour: '09:00', consumption: 18.3 },
                        { hour: '10:00', consumption: 15.2 },
                        { hour: '11:00', consumption: 12.8 },
                        { hour: '12:00', consumption: 22.4 },
                        { hour: '13:00', consumption: 26.1 },
                        { hour: '14:00', consumption: 24.8 },
                        { hour: '15:00', consumption: 21.5 },
                        { hour: '16:00', consumption: 19.7 },
                        { hour: '17:00', consumption: 28.9 },
                        { hour: '18:00', consumption: 45.2 },
                        { hour: '19:00', consumption: 48.7 },
                        { hour: '20:00', consumption: 42.3 },
                        { hour: '21:00', consumption: 38.1 },
                        { hour: '22:00', consumption: 32.5 },
                        { hour: '23:00', consumption: 25.8 }
                    ],
                    comparisons: {
                        appliances: [
                            { name: 'Air Conditioner', consumption: 45.2, percentage: 35 },
                            { name: 'Water Heater', consumption: 28.7, percentage: 22 },
                            { name: 'Refrigerator', consumption: 22.1, percentage: 17 },
                            { name: 'Lighting', consumption: 15.3, percentage: 12 },
                            { name: 'TV & Electronics', consumption: 12.8, percentage: 10 },
                            { name: 'Others', consumption: 5.9, percentage: 4 }
                        ],
                        seasonal: [
                            { season: 'Winter', consumption: 280, efficiency: 85 },
                            { season: 'Spring', consumption: 220, efficiency: 92 },
                            { season: 'Summer', consumption: 380, efficiency: 78 },
                            { season: 'Monsoon', consumption: 250, efficiency: 88 }
                        ]
                    },
                    efficiency: {
                        score: 78,
                        recommendations: [
                            'Consider upgrading to a 5-star rated AC to save 25% energy',
                            'Use LED bulbs to reduce lighting consumption by 60%',
                            'Set water heater temperature to 50°C for optimal efficiency',
                            'Use appliances during off-peak hours (11 PM - 6 AM)'
                        ]
                    }
                });
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            // Failed to fetch analytics data
            setIsLoading(false);
        }
    };

    // Chart configurations
    const monthlyTrendsData = {
        labels: analyticsData.trends.monthly.map(item => item.month),
        datasets: [
            {
                label: 'Actual Consumption (kWh)',
                data: analyticsData.trends.monthly.map(item => item.consumption),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 2,
                type: selectedView === 'consumption' ? 'bar' : 'line'
            },
            {
                label: 'Predicted Consumption (kWh)',
                data: analyticsData.trends.monthly.map(item => item.prediction),
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 2,
                borderDash: [5, 5],
                type: 'line'
            }
        ]
    };

    const peakHoursData = {
        labels: analyticsData.peakHours.map(item => item.hour),
        datasets: [
            {
                label: 'Hourly Consumption (kWh)',
                data: analyticsData.peakHours.map(item => item.consumption),
                backgroundColor: analyticsData.peakHours.map(item =>
                    item.consumption > 40 ? 'rgba(239, 68, 68, 0.8)' :
                        item.consumption > 25 ? 'rgba(245, 158, 11, 0.8)' :
                            'rgba(34, 197, 94, 0.8)'
                ),
                borderColor: analyticsData.peakHours.map(item =>
                    item.consumption > 40 ? 'rgb(239, 68, 68)' :
                        item.consumption > 25 ? 'rgb(245, 158, 11)' :
                            'rgb(34, 197, 94)'
                ),
                borderWidth: 1
            }
        ]
    };

    const applianceComparisonData = {
        labels: analyticsData.comparisons.appliances.map(item => item.name),
        datasets: [
            {
                data: analyticsData.comparisons.appliances.map(item => item.percentage),
                backgroundColor: [
                    '#EF4444',
                    '#F59E0B',
                    '#10B981',
                    '#3B82F6',
                    '#8B5CF6',
                    '#6B7280'
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
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: false
                }
            },
            y: {
                display: true,
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.label}: ${context.parsed}%`;
                    }
                }
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner size="large" text="Loading analytics..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Energy Analytics</h1>
                    <p className="text-gray-600 mt-1">Detailed insights into your energy consumption patterns</p>
                </div>

                <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                        <option value="3months">Last 3 Months</option>
                        <option value="6months">Last 6 Months</option>
                        <option value="1year">Last Year</option>
                        <option value="2years">Last 2 Years</option>
                    </select>

                    <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        <Download size={16} className="mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Avg Monthly Usage</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {(analyticsData.trends.monthly.reduce((sum, item) => sum + item.consumption, 0) / analyticsData.trends.monthly.length).toFixed(1)} kWh
                            </p>
                            <div className="flex items-center mt-2">
                                <TrendingUp size={16} className="text-green-500" />
                                <span className="text-sm text-green-600 ml-1">5.2% vs last period</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <BarChart3 size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Peak Hour Usage</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {Math.max(...analyticsData.peakHours.map(h => h.consumption)).toFixed(1)} kWh
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                at {analyticsData.peakHours.find(h => h.consumption === Math.max(...analyticsData.peakHours.map(h => h.consumption)))?.hour}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <Activity size={24} className="text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Efficiency Score</p>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.efficiency.score}%</p>
                            <div className="flex items-center mt-2">
                                <Target size={16} className="text-orange-500" />
                                <span className="text-sm text-orange-600 ml-1">Room for improvement</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Target size={24} className="text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Cost Savings</p>
                            <p className="text-2xl font-bold text-gray-900">₹2,450</p>
                            <p className="text-sm text-gray-500 mt-2">Potential monthly savings</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingDown size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Consumption Trends</h3>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setSelectedView('consumption')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${selectedView === 'consumption'
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Bar
                            </button>
                            <button
                                onClick={() => setSelectedView('line')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${selectedView === 'line'
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Line
                            </button>
                        </div>
                    </div>

                    <div className="h-80">
                        {selectedView === 'consumption' ? (
                            <Bar data={monthlyTrendsData} options={chartOptions} />
                        ) : (
                            <Line data={monthlyTrendsData} options={chartOptions} />
                        )}
                    </div>
                </div>

                {/* Peak Hours */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Hourly Usage Pattern</h3>
                        <Clock size={20} className="text-gray-400" />
                    </div>

                    <div className="h-80">
                        <Bar data={peakHoursData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Appliance Breakdown and Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Appliance Consumption */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Appliance Breakdown</h3>
                        <Zap size={20} className="text-gray-400" />
                    </div>

                    <div className="h-80">
                        <Doughnut data={applianceComparisonData} options={doughnutOptions} />
                    </div>
                </div>

                {/* Efficiency Recommendations */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Efficiency Recommendations</h3>
                        <Target size={20} className="text-gray-400" />
                    </div>

                    <div className="space-y-4">
                        {analyticsData.efficiency.recommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-medium text-primary-600">{index + 1}</span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{recommendation}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <Target size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                                Implementing these recommendations could save up to ₹2,450/month
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seasonal Comparison */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Seasonal Analysis</h3>
                    <Calendar size={20} className="text-gray-400" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {analyticsData.comparisons.seasonal.map((season, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">{season.season}</h4>
                                <div className={`w-3 h-3 rounded-full ${season.efficiency >= 90 ? 'bg-green-500' :
                                        season.efficiency >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}></div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Consumption:</span>
                                    <span className="font-medium">{season.consumption} kWh</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Efficiency:</span>
                                    <span className="font-medium">{season.efficiency}%</span>
                                </div>
                            </div>

                            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${season.efficiency >= 90 ? 'bg-green-500' :
                                            season.efficiency >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${season.efficiency}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Analytics;