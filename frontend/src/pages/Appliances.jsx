import { useState, useEffect } from 'react';
import { Plus, Search, Zap, Edit, Trash2, X } from 'lucide-react';
import { useAppliances } from '../context/ApplianceContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const Appliances = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Lighting',
    defaultWattage: '',
    description: '',
    minHours: '',
    maxHours: '',
    peakUsageTime: ''
  });

  const {
    appliances,
    isLoading,
    fetchAppliances,
    addAppliance,
    updateAppliance,
    deleteAppliance
  } = useAppliances();

  const categories = ['all', 'Lighting', 'Cooling', 'Heating', 'Kitchen', 'Entertainment', 'Laundry', 'Office', 'Industrial', 'Other'];

  useEffect(() => {
    fetchAppliances();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.defaultWattage) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingAppliance) {
        await updateAppliance(editingAppliance._id, formData);
      } else {
        await addAppliance(formData);
      }

      setShowAddModal(false);
      setEditingAppliance(null);
      setFormData({ name: '', category: 'Lighting', defaultWattage: '', description: '', minHours: '', maxHours: '', peakUsageTime: '' });
    } catch (error) {
      console.error('Error saving appliance:', error);
    }
  };

  const handleEdit = (appliance) => {
    setEditingAppliance(appliance);
    setFormData({
      name: appliance.name,
      category: appliance.category,
      defaultWattage: appliance.defaultWattage.toString(),
      description: appliance.description || '',
      minHours: appliance.usageHints?.minHours?.toString() || '',
      maxHours: appliance.usageHints?.maxHours?.toString() || '',
      peakUsageTime: appliance.usageHints?.peakUsageTime || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (applianceId) => {
    if (window.confirm('Are you sure you want to delete this appliance?')) {
      await deleteAppliance(applianceId);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingAppliance(null);
    setFormData({ name: '', category: 'Lighting', defaultWattage: '', description: '', minHours: '', maxHours: '', peakUsageTime: '' });
  };

  const filteredAppliances = appliances.filter(appliance => {
    const matchesSearch = appliance.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || appliance.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" text="Loading appliances..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appliances</h1>
          <p className="text-gray-600 mt-1">Manage your household appliances and track their consumption</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 sm:mt-0 btn-primary flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Add Custom Appliance
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search appliances..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="sm:w-48">
            <select
              className="form-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Appliances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAppliances.map((appliance) => (
          <div key={appliance._id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Zap size={24} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{appliance.name}</h3>
                  <p className="text-sm text-gray-500">{appliance.category}</p>
                </div>
              </div>

              {appliance.isCustom && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(appliance)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit Appliance"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(appliance._id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Appliance"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Power Rating</span>
                <span className="font-medium text-gray-900">{appliance.defaultWattage}W</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Type</span>
                <span className={`text-xs px-2 py-1 rounded-full ${appliance.isCustom
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-green-100 text-green-800'
                  }`}>
                  {appliance.isCustom ? 'Custom' : 'Standard'}
                </span>
              </div>

              {appliance.usageHints && (appliance.usageHints.minHours > 0 || appliance.usageHints.maxHours < 24) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Typical Usage</span>
                  <span className="text-sm font-medium text-gray-900">
                    {appliance.usageHints.minHours}-{appliance.usageHints.maxHours}h/day
                  </span>
                </div>
              )}

              {appliance.usageHints?.peakUsageTime && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Peak Time</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full capitalize">
                    {appliance.usageHints.peakUsageTime.replace('-', ' ')}
                  </span>
                </div>
              )}

              {appliance.description && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500">{appliance.description}</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Daily Consumption (avg)</span>
                  <span className="font-medium text-primary-600">
                    {appliance.usageHints?.minHours && appliance.usageHints?.maxHours
                      ? `${((appliance.defaultWattage * appliance.usageHints.minHours) / 1000).toFixed(2)}-${((appliance.defaultWattage * appliance.usageHints.maxHours) / 1000).toFixed(2)} kWh`
                      : `${((appliance.defaultWattage * 8) / 1000).toFixed(2)} kWh (8h)`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAppliances.length === 0 && (
        <div className="text-center py-12">
          <Zap size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appliances found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Start by adding your first appliance'
            }
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus size={20} className="mr-2" />
            Add Appliance
          </button>
        </div>
      )}

      {/* Add/Edit Appliance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingAppliance ? 'Edit Appliance' : 'Add Custom Appliance'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appliance Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="e.g., Custom Water Pump"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    {categories.filter(cat => cat !== 'all').map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Power Rating (Watts) *
                  </label>
                  <input
                    type="number"
                    name="defaultWattage"
                    value={formData.defaultWattage}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="e.g., 1200"
                    min="1"
                    max="50000"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Typical Min Usage (hours/day)
                    </label>
                    <input
                      type="number"
                      name="minHours"
                      value={formData.minHours}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., 2"
                      min="0"
                      max="24"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Typical Max Usage (hours/day)
                    </label>
                    <input
                      type="number"
                      name="maxHours"
                      value={formData.maxHours}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., 8"
                      min="0"
                      max="24"
                      step="0.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peak Usage Time (Optional)
                  </label>
                  <select
                    name="peakUsageTime"
                    value={formData.peakUsageTime}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="">Select peak usage time</option>
                    <option value="morning">Morning (6 AM - 12 PM)</option>
                    <option value="afternoon">Afternoon (12 PM - 6 PM)</option>
                    <option value="evening">Evening (6 PM - 10 PM)</option>
                    <option value="night">Night (10 PM - 6 AM)</option>
                    <option value="all-day">All Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Brief description of the appliance..."
                    rows="3"
                    maxLength="500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingAppliance ? 'Update' : 'Add'} Appliance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appliances;