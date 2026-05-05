import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Zap, Plus, Trash2, Save, History } from 'lucide-react';
import { useAppliances } from '../context/ApplianceContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { consumptionAPI } from '../services/api';
import toast from 'react-hot-toast';

const Consumption = () => {
  const navigate = useNavigate();
  const { appliances, isLoading: appliancesLoading } = useAppliances();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consumptionHistory, setConsumptionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentTariff, setCurrentTariff] = useState(null);

  const currentDate = new Date();
  const [formData, setFormData] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    appliances: []
  });

  useEffect(() => {
    fetchConsumptionHistory();
    fetchCurrentTariff();
  }, []);

  const fetchCurrentTariff = async () => {
    try {
      const response = await consumptionAPI.getTariff();
      if (response.success) {
        setCurrentTariff(response.data);
      }
    } catch (error) {
      setCurrentTariff(null);
    }
  };

  const fetchConsumptionHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await consumptionAPI.getHistory({ limit: 6 });
      if (response.success) {
        setConsumptionHistory(response.data.records || []);
      }
    } catch (error) {
      console.error('Failed to fetch consumption history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const addAppliance = () => {
    setFormData({
      ...formData,
      appliances: [
        ...formData.appliances,
        { applianceId: '', quantity: 1, dailyHours: 1, usageSlots: [], customTimeRange: { start: '', end: '' } }
      ]
    });
  };

  const removeAppliance = (index) => {
    setFormData({
      ...formData,
      appliances: formData.appliances.filter((_, i) => i !== index)
    });
  };

  const updateAppliance = (index, field, value) => {
    const updated = [...formData.appliances];
    updated[index][field] = value;
    setFormData({ ...formData, appliances: updated });
  };

  const toggleHourlySlot = (index, hour) => {
    const updated = [...formData.appliances];
    const existingSlots = updated[index].usageSlots || [];
    const hasSlot = existingSlots.includes(hour);
    const nextSlots = hasSlot
      ? existingSlots.filter((slot) => slot !== hour)
      : [...existingSlots, hour];
    const sortedSlots = nextSlots.sort((a, b) => a - b);

    updated[index].usageSlots = sortedSlots;
    updated[index].dailyHours = sortedSlots.length || updated[index].dailyHours;
    setFormData({ ...formData, appliances: updated });
  };

  const updateCustomTime = (index, field, value) => {
    const updated = [...formData.appliances];
    updated[index].customTimeRange = {
      ...updated[index].customTimeRange,
      [field]: value
    };
    setFormData({ ...formData, appliances: updated });
  };

  const calculateEstimate = () => {
    let totalUnits = 0;
    formData.appliances.forEach(appUsage => {
      const appliance = appliances.find(a => a._id === appUsage.applianceId);
      if (appliance) {
        const selectedSlotHours = appUsage.usageSlots?.length || 0;
        const effectiveDailyHours = selectedSlotHours > 0 ? selectedSlotHours : appUsage.dailyHours;
        const dailyConsumption = (appliance.defaultWattage * effectiveDailyHours) / 1000;
        const monthlyConsumption = dailyConsumption * 30 * appUsage.quantity;
        totalUnits += monthlyConsumption;
      }
    });

    // Calculate bill using MSEB tariff
    let bill = 0;
    const slabs = currentTariff?.slabs || [
      { minUnits: 0, maxUnits: 100, ratePerUnit: 3.5 },
      { minUnits: 101, maxUnits: 300, ratePerUnit: 4.5 },
      { minUnits: 301, maxUnits: 500, ratePerUnit: 6.0 },
      { minUnits: 501, maxUnits: 999999, ratePerUnit: 7.5 }
    ];

    let remainingUnits = totalUnits;
    for (const slab of slabs) {
      if (remainingUnits <= 0) break;
      const slabUnits = Math.min(remainingUnits, slab.maxUnits - slab.minUnits + 1);
      bill += slabUnits * slab.ratePerUnit;
      remainingUnits -= slabUnits;
    }

    return { totalUnits: totalUnits.toFixed(2), estimatedBill: bill.toFixed(2) };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.appliances.length === 0) {
      toast.error('Please add at least one appliance');
      return;
    }

    // Validate all appliances have required fields
    const invalid = formData.appliances.some(
      app => !app.applianceId || app.quantity < 1 || app.dailyHours < 0 || app.dailyHours > 24
    );

    if (invalid) {
      toast.error('Please fill all appliance details correctly');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await consumptionAPI.submit(formData);
      
      if (response.success) {
        toast.success('Consumption data submitted successfully!');
        setFormData({
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          appliances: []
        });
        fetchConsumptionHistory();
        // Refresh dashboard data
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit consumption data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimate = formData.appliances.length > 0 ? calculateEstimate() : null;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (appliancesLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Submit Consumption Data</h1>
            <p className="text-green-100 mt-1">
              Track your monthly electricity usage
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Zap size={32} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* No Appliances Warning */}
      {appliances.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Zap size={20} className="text-orange-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-orange-900 mb-1">
                No Appliances Found
              </h4>
              <p className="text-sm text-orange-800">
                You need to add appliances before submitting consumption data.{' '}
                <button
                  onClick={() => navigate('/appliances')}
                  className="font-medium underline hover:text-orange-900"
                >
                  Add appliances now
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submission Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">New Consumption Entry</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Month and Year Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-2" />
                Month
              </label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {Array.from({ length: 7 }, (_, idx) => currentDate.getFullYear() - 5 + idx).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Appliances List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Appliances Usage
              </label>
              <button
                type="button"
                onClick={addAppliance}
                disabled={appliances.length === 0}
                className="flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} className="mr-1" />
                Add Appliance
              </button>
            </div>

            {formData.appliances.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Zap size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No appliances added yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Appliance" to start</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.appliances.map((appUsage, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={appUsage.applianceId}
                        onChange={(e) => updateAppliance(index, 'applianceId', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Appliance</option>
                        {appliances.map(appliance => (
                          <option key={appliance._id} value={appliance._id}>
                            {appliance.name} ({appliance.defaultWattage}W)
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={appUsage.quantity}
                        onChange={(e) => updateAppliance(index, 'quantity', parseInt(e.target.value))}
                        placeholder="Quantity"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />

                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={appUsage.dailyHours}
                        onChange={(e) => updateAppliance(index, 'dailyHours', parseFloat(e.target.value))}
                        placeholder="Hours/day"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                      </div>

                      <button
                      type="button"
                      onClick={() => removeAppliance(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                      >
                      <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">1-Hour Slots (multiple choice)</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {Array.from({ length: 24 }, (_, hour) => {
                          const startHour = hour % 12 === 0 ? 12 : hour % 12;
                          const endHourRaw = (hour + 1) % 24;
                          const endHour = endHourRaw % 12 === 0 ? 12 : endHourRaw % 12;
                          const startPeriod = hour < 12 ? 'AM' : 'PM';
                          const endPeriod = endHourRaw < 12 ? 'AM' : 'PM';
                          const label = `${startHour}${startPeriod} - ${endHour}${endPeriod}`;
                          const selected = appUsage.usageSlots?.includes(hour);

                          return (
                            <button
                              key={`${index}-${hour}`}
                              type="button"
                              onClick={() => toggleHourlySlot(index, hour)}
                              className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                                selected
                                  ? 'bg-primary-600 border-primary-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Selected slots: {appUsage.usageSlots?.length || 0} hour(s)
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Custom Start Time (optional)</label>
                        <input
                          type="time"
                          value={appUsage.customTimeRange?.start || ''}
                          onChange={(e) => updateCustomTime(index, 'start', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Custom End Time (optional)</label>
                        <input
                          type="time"
                          value={appUsage.customTimeRange?.end || ''}
                          onChange={(e) => updateCustomTime(index, 'end', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estimate */}
          {estimate && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Estimated Consumption</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Total Units</p>
                  <p className="text-2xl font-bold text-blue-900">{estimate.totalUnits} kWh</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Estimated Bill</p>
                  <p className="text-2xl font-bold text-blue-900">₹{estimate.estimatedBill}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.appliances.length === 0}
              className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} className="mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Consumption'}
            </button>
          </div>
        </form>
      </div>

      {/* Consumption History */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <History size={24} className="mr-2" />
            Consumption History
          </h2>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8">
            <LoadingSpinner />
          </div>
        ) : consumptionHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History size={48} className="mx-auto text-gray-400 mb-2" />
            <p>No consumption history yet</p>
            <p className="text-sm text-gray-400 mt-1">Submit your first entry above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumption</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appliances</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {consumptionHistory.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {months[record.month - 1]} {record.year}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {record.totalUnits.toFixed(2)} kWh
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ₹{record.estimatedBill.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {record.appliances.length} items
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Consumption;
