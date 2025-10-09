import mongoose from 'mongoose';

const tariffRateSchema = new mongoose.Schema({
  slabs: [{
    minUnits: {
      type: Number,
      required: true,
      min: 0
    },
    maxUnits: {
      type: Number,
      required: true,
      min: 0
    },
    ratePerUnit: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  effectiveFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for efficient querying
tariffRateSchema.index({ isActive: 1, effectiveFrom: -1 });
tariffRateSchema.index({ createdBy: 1 });

// Method to calculate bill for given units
tariffRateSchema.methods.calculateBill = function(units) {
  let totalBill = 0;
  let remainingUnits = units;

  for (const slab of this.slabs) {
    if (remainingUnits <= 0) break;

    const slabUnits = Math.min(remainingUnits, slab.maxUnits - slab.minUnits + 1);
    totalBill += slabUnits * slab.ratePerUnit;
    remainingUnits -= slabUnits;
  }

  return totalBill;
};

// Static method to get current active tariff
tariffRateSchema.statics.getCurrentTariff = function() {
  return this.findOne({ 
    isActive: true,
    effectiveFrom: { $lte: new Date() }
  }).sort({ effectiveFrom: -1 });
};

// Static method to get tariff history
tariffRateSchema.statics.getTariffHistory = function(limit = 10) {
  return this.find()
    .populate('createdBy', 'profile.firstName profile.lastName email')
    .sort({ effectiveFrom: -1 })
    .limit(limit);
};

// Pre-save middleware to deactivate other tariffs when a new one is activated
tariffRateSchema.pre('save', async function(next) {
  if (this.isActive && this.isNew) {
    // Deactivate all other active tariffs
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { isActive: false }
    );
  }
  next();
});

const TariffRate = mongoose.model('TariffRate', tariffRateSchema);

export default TariffRate;