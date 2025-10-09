import mongoose from 'mongoose';

const consumptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  appliances: [{
    applianceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appliance',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    dailyHours: {
      type: Number,
      required: true,
      min: 0,
      max: 24
    },
    customWattage: {
      type: Number,
      min: 0
    }
  }],
  totalUnits: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedBill: {
    type: Number,
    required: true,
    min: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one record per user per month/year
consumptionSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

// Index for efficient querying
consumptionSchema.index({ userId: 1, submittedAt: -1 });

// Virtual for formatted date
consumptionSchema.virtual('formattedDate').get(function() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[this.month - 1]} ${this.year}`;
});

// Method to calculate total consumption
consumptionSchema.methods.calculateTotalConsumption = function() {
  return this.appliances.reduce((total, appliance) => {
    const wattage = appliance.customWattage || appliance.applianceId.defaultWattage;
    const dailyConsumption = (wattage * appliance.dailyHours) / 1000; // Convert to kWh
    const monthlyConsumption = dailyConsumption * 30; // Assume 30 days
    return total + (monthlyConsumption * appliance.quantity);
  }, 0);
};

// Static method to get consumption history for a user
consumptionSchema.statics.getHistory = function(userId, limit = 12) {
  return this.find({ userId })
    .populate('appliances.applianceId', 'name category defaultWattage')
    .sort({ year: -1, month: -1 })
    .limit(limit);
};

// Static method to get consumption trends
consumptionSchema.statics.getTrends = function(userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.find({
    userId,
    $or: [
      { year: { $gt: startDate.getFullYear() } },
      { 
        year: startDate.getFullYear(),
        month: { $gte: startDate.getMonth() + 1 }
      }
    ]
  }).sort({ year: 1, month: 1 });
};

const Consumption = mongoose.model('Consumption', consumptionSchema);

export default Consumption;