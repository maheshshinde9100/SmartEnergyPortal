import { createContext, useContext, useReducer, useEffect } from 'react';
import { applianceAPI } from '../services/api';
import toast from 'react-hot-toast';

const ApplianceContext = createContext();

const initialState = {
  appliances: [],
  userAppliances: [],
  isLoading: false,
  error: null
};

const applianceReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_APPLIANCES':
      return { 
        ...state, 
        appliances: action.payload,
        isLoading: false,
        error: null 
      };
    
    case 'SET_USER_APPLIANCES':
      return { 
        ...state, 
        userAppliances: action.payload,
        isLoading: false,
        error: null 
      };
    
    case 'ADD_APPLIANCE':
      return {
        ...state,
        appliances: [...state.appliances, action.payload],
        userAppliances: [...state.userAppliances, action.payload]
      };
    
    case 'UPDATE_APPLIANCE':
      return {
        ...state,
        appliances: state.appliances.map(app => 
          app._id === action.payload._id ? action.payload : app
        ),
        userAppliances: state.userAppliances.map(app => 
          app._id === action.payload._id ? action.payload : app
        )
      };
    
    case 'DELETE_APPLIANCE':
      return {
        ...state,
        appliances: state.appliances.filter(app => app._id !== action.payload),
        userAppliances: state.userAppliances.filter(app => app._id !== action.payload)
      };
    
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload,
        isLoading: false 
      };
    
    default:
      return state;
  }
};

export const ApplianceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(applianceReducer, initialState);

  // Fetch appliances
  const fetchAppliances = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await applianceAPI.getAll();
      
      if (response.success) {
        dispatch({ type: 'SET_APPLIANCES', payload: response.data });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch appliances';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
    }
  };

  // Add custom appliance
  const addAppliance = async (applianceData) => {
    try {
      const response = await applianceAPI.create(applianceData);
      
      if (response.success) {
        dispatch({ type: 'ADD_APPLIANCE', payload: response.data });
        toast.success('Appliance added successfully!');
        return { success: true, data: response.data };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add appliance';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Update appliance
  const updateAppliance = async (id, applianceData) => {
    try {
      const response = await applianceAPI.update(id, applianceData);
      
      if (response.success) {
        dispatch({ type: 'UPDATE_APPLIANCE', payload: response.data });
        toast.success('Appliance updated successfully!');
        return { success: true, data: response.data };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update appliance';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Delete appliance
  const deleteAppliance = async (id) => {
    try {
      const response = await applianceAPI.delete(id);
      
      if (response.success) {
        dispatch({ type: 'DELETE_APPLIANCE', payload: id });
        toast.success('Appliance deleted successfully!');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete appliance';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Get appliances by category
  const getAppliancesByCategory = (category) => {
    return state.appliances.filter(appliance => appliance.category === category);
  };

  // Calculate total consumption for appliances
  const calculateConsumption = (applianceUsage) => {
    return applianceUsage.reduce((total, usage) => {
      const appliance = state.appliances.find(app => app._id === usage.applianceId);
      if (appliance) {
        const wattage = usage.customWattage || appliance.defaultWattage;
        const dailyConsumption = (wattage * usage.dailyHours) / 1000; // kWh
        const monthlyConsumption = dailyConsumption * 30;
        return total + (monthlyConsumption * usage.quantity);
      }
      return total;
    }, 0);
  };

  // Initialize appliances on mount
  useEffect(() => {
    fetchAppliances();
  }, []);

  const value = {
    ...state,
    fetchAppliances,
    addAppliance,
    updateAppliance,
    deleteAppliance,
    getAppliancesByCategory,
    calculateConsumption
  };

  return (
    <ApplianceContext.Provider value={value}>
      {children}
    </ApplianceContext.Provider>
  );
};

export const useAppliances = () => {
  const context = useContext(ApplianceContext);
  if (!context) {
    throw new Error('useAppliances must be used within an ApplianceProvider');
  }
  return context;
};