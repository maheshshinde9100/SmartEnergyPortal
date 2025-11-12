import mongoose from 'mongoose';

const applianceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Appliance name is required'],
    trim: true,
    maxlength: [100, 'Appliance name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Lighting',
      'Cooling',
      'Heating',
      'Kitchen',
      'Entertainment',
      'Laundry',
      'Office',
      'Industrial',
      'Other'
    ]
  },
  defaultWattage: {
    type: Number,
    required: [true, 'Default wattage is required'],
    min: [1, 'Wattage must be at least 1 watt'],
    max: [50000, 'Wattage cannot exceed 50,000 watts']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.isCustom;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageHints: {
    minHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24
    },
    maxHours: {
      type: Number,
      default: 24,
      min: 0,
      max: 24
    },
    peakUsageTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'all-day', ''],
      default: ''
    },
    typicalUsage: {
      type: String,
      trim: true
    },
    estimatedDailyHours: {
      type: Number,
      min: 0,
      max: 24,
      default: function() {
        // Auto-calculate if not provided
        if (this.minHours !== undefined && this.maxHours !== undefined) {
          return (this.minHours + this.maxHours) / 2;
        }
        return 4; // Default 4 hours
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for power consumption category
applianceSchema.virtual('powerCategory').get(function() {
  if (this.defaultWattage < 100) return 'Low Power';
  if (this.defaultWattage < 1000) return 'Medium Power';
  if (this.defaultWattage < 5000) return 'High Power';
  return 'Industrial Power';
});

// Index for better query performance
applianceSchema.index({ category: 1 });
applianceSchema.index({ isCustom: 1 });
applianceSchema.index({ createdBy: 1 });
applianceSchema.index({ name: 'text', description: 'text' });

// Validation: maxHours should be greater than minHours
applianceSchema.pre('save', function(next) {
  if (this.usageHints.maxHours < this.usageHints.minHours) {
    next(new Error('Maximum usage hours must be greater than minimum usage hours'));
  }
  next();
});

// Static method to get default appliances
applianceSchema.statics.getDefaultAppliances = function() {
  return [
    { name: 'LED Bulb (9W)', category: 'Lighting', defaultWattage: 9 },
    { name: 'CFL Bulb (15W)', category: 'Lighting', defaultWattage: 15 },
    { name: 'Incandescent Bulb (60W)', category: 'Lighting', defaultWattage: 60 },
    { name: 'Tube Light (40W)', category: 'Lighting', defaultWattage: 40 },
    { name: 'Ceiling Fan', category: 'Cooling', defaultWattage: 75 },
    { name: 'Table Fan', category: 'Cooling', defaultWattage: 50 },
    { name: 'Air Conditioner (1.5 Ton)', category: 'Cooling', defaultWattage: 1500 },
    { name: 'Air Conditioner (1 Ton)', category: 'Cooling', defaultWattage: 1000 },
    { name: 'Air Cooler', category: 'Cooling', defaultWattage: 200 },
    { name: 'Refrigerator (Single Door)', category: 'Kitchen', defaultWattage: 150 },
    { name: 'Refrigerator (Double Door)', category: 'Kitchen', defaultWattage: 250 },
    { name: 'Microwave Oven', category: 'Kitchen', defaultWattage: 1000 },
    { name: 'Electric Kettle', category: 'Kitchen', defaultWattage: 1500 },
    { name: 'Mixer Grinder', category: 'Kitchen', defaultWattage: 500 },
    { name: 'Induction Cooktop', category: 'Kitchen', defaultWattage: 2000 },
    { name: 'Electric Iron', category: 'Laundry', defaultWattage: 1000 },
    { name: 'Washing Machine', category: 'Laundry', defaultWattage: 500 },
    { name: 'Television (LED 32")', category: 'Entertainment', defaultWattage: 60 },
    { name: 'Television (LED 55")', category: 'Entertainment', defaultWattage: 150 },
    { name: 'Desktop Computer', category: 'Office', defaultWattage: 300 },
    { name: 'Laptop', category: 'Office', defaultWattage: 65 },
    { name: 'Water Heater (Geyser)', category: 'Heating', defaultWattage: 2000 }
  ];
};

const Appliance = mongoose.model('Appliance', applianceSchema);

export default Appliance;