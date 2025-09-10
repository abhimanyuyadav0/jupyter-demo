import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedUseCase: null,
  useCases: [
    {
      id: 1,
      title: "Data Science & Analytics",
      description: "Explore, analyze, and visualize data with powerful libraries like pandas, matplotlib, and seaborn",
      icon: "📊",
      examples: [
        "Exploratory Data Analysis (EDA)",
        "Statistical Analysis",
        "Data Visualization",
        "Machine Learning Preprocessing"
      ],
      tools: ["pandas", "numpy", "matplotlib", "seaborn", "plotly"]
    },
    {
      id: 2,
      title: "Machine Learning",
      description: "Build, train, and evaluate machine learning models with scikit-learn, TensorFlow, and PyTorch",
      icon: "🤖",
      examples: [
        "Model Training & Evaluation",
        "Feature Engineering",
        "Hyperparameter Tuning",
        "Model Deployment Prototyping"
      ],
      tools: ["scikit-learn", "tensorflow", "pytorch", "keras", "xgboost"]
    },
    {
      id: 3,
      title: "Education & Learning",
      description: "Interactive tutorials, courses, and educational content with executable code examples",
      icon: "🎓",
      examples: [
        "Programming Tutorials",
        "Mathematical Concepts",
        "Scientific Computing",
        "Interactive Textbooks"
      ],
      tools: ["matplotlib", "sympy", "numpy", "widgets", "nbgrader"]
    },
    {
      id: 4,
      title: "Research & Academia",
      description: "Reproducible research, academic papers, and scientific computing workflows",
      icon: "🔬",
      examples: [
        "Research Documentation",
        "Reproducible Experiments",
        "Data Analysis for Papers",
        "Collaborative Research"
      ],
      tools: ["scipy", "numpy", "matplotlib", "latex", "nbconvert"]
    },
    {
      id: 5,
      title: "Prototyping & Development",
      description: "Rapid prototyping, API testing, and development workflow experimentation",
      icon: "⚡",
      examples: [
        "API Testing",
        "Algorithm Development",
        "Code Experimentation",
        "Quick Prototypes"
      ],
      tools: ["requests", "json", "datetime", "os", "sys"]
    },
    {
      id: 6,
      title: "Data Visualization",
      description: "Create stunning charts, graphs, and interactive visualizations",
      icon: "📈",
      examples: [
        "Interactive Dashboards",
        "Statistical Plots",
        "Geographic Visualizations",
        "Real-time Data Plots"
      ],
      tools: ["plotly", "bokeh", "altair", "folium", "matplotlib"]
    }
  ],
  filters: {
    category: 'all',
    difficulty: 'all'
  },
  liveDemo: {
    // Multiple database connections
    connections: [], // Array of saved connections
    activeConnectionId: null, // Currently selected connection ID
    currentConnection: null, // Current active connection object
    
    // Legacy single connection support
    isConnected: false,
    connectionType: 'postgresql',
    connectionStatus: 'disconnected',
    currentQuery: '',
    queryResults: [],
    isLoading: false,
    error: null,
    analyticsData: {
      totalRecords: 0,
      chartData: [],
      insights: []
    },
    connectionConfig: {
      host: 'localhost',
      port: '5432',
      database: 'jupyter_db',
      username: 'postgres',
      password: ''
    },
    realTimeData: [],
    queryHistory: []
  }
};

const jupyterSlice = createSlice({
  name: 'jupyter',
  initialState,
  reducers: {
    setSelectedUseCase: (state, action) => {
      state.selectedUseCase = action.payload;
    },
    setFilter: (state, action) => {
      const { filterType, value } = action.payload;
      state.filters[filterType] = value;
    },
    clearFilters: (state) => {
      state.filters = {
        category: 'all',
        difficulty: 'all'
      };
    },
    setConnectionStatus: (state, action) => {
      state.liveDemo.connectionStatus = action.payload;
      state.liveDemo.isConnected = action.payload === 'connected';
    },
    setConnectionType: (state, action) => {
      state.liveDemo.connectionType = action.payload;
    },
    setCurrentQuery: (state, action) => {
      state.liveDemo.currentQuery = action.payload;
    },
    setQueryResults: (state, action) => {
      state.liveDemo.queryResults = action.payload;
    },
    setLoading: (state, action) => {
      state.liveDemo.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.liveDemo.error = action.payload;
    },
    setAnalyticsData: (state, action) => {
      state.liveDemo.analyticsData = action.payload;
    },
    setConnectionConfig: (state, action) => {
      state.liveDemo.connectionConfig = action.payload;
    },
    setRealTimeData: (state, action) => {
      state.liveDemo.realTimeData = action.payload;
    },
    
    // Multi-database connection actions
    addConnection: (state, action) => {
      const connection = {
        id: action.payload.id || Date.now().toString(),
        name: action.payload.name,
        config: action.payload.config,
        type: action.payload.type,
        status: action.payload.status || 'disconnected',
        lastConnected: action.payload.lastConnected || null,
        createdAt: action.payload.createdAt || new Date().toISOString()
      };
      
      // Remove existing connection with same ID if exists
      state.liveDemo.connections = state.liveDemo.connections.filter(conn => conn.id !== connection.id);
      state.liveDemo.connections.push(connection);
    },
    
    removeConnection: (state, action) => {
      const connectionId = action.payload;
      state.liveDemo.connections = state.liveDemo.connections.filter(conn => conn.id !== connectionId);
      
      // If removing active connection, clear it
      if (state.liveDemo.activeConnectionId === connectionId) {
        state.liveDemo.activeConnectionId = null;
        state.liveDemo.currentConnection = null;
        state.liveDemo.isConnected = false;
        state.liveDemo.connectionStatus = 'disconnected';
      }
    },
    
    setActiveConnection: (state, action) => {
      const connectionId = action.payload;
      const connection = state.liveDemo.connections.find(conn => conn.id === connectionId);
      
      if (connection) {
        state.liveDemo.activeConnectionId = connectionId;
        state.liveDemo.currentConnection = connection;
        state.liveDemo.connectionType = connection.type;
        state.liveDemo.connectionConfig = connection.config;
        state.liveDemo.isConnected = connection.status === 'connected';
        state.liveDemo.connectionStatus = connection.status;
      }
    },
    
    updateConnectionStatus: (state, action) => {
      const { connectionId, status, lastConnected } = action.payload;
      const connection = state.liveDemo.connections.find(conn => conn.id === connectionId);
      
      if (connection) {
        connection.status = status;
        if (lastConnected) {
          connection.lastConnected = lastConnected;
        }
        
        // Update current connection status if it's the active one
        if (state.liveDemo.activeConnectionId === connectionId) {
          state.liveDemo.isConnected = status === 'connected';
          state.liveDemo.connectionStatus = status;
        }
      }
    },
    
    loadSavedConnections: (state, action) => {
      state.liveDemo.connections = action.payload || [];
    },
    
    updateConnectionName: (state, action) => {
      const { connectionId, name } = action.payload;
      const connection = state.liveDemo.connections.find(conn => conn.id === connectionId);
      
      if (connection) {
        connection.name = name;
      }
    }
  }
});

export const { 
  setSelectedUseCase, 
  setFilter, 
  clearFilters, 
  setConnectionStatus, 
  setConnectionType, 
  setCurrentQuery, 
  setQueryResults, 
  setLoading, 
  setError, 
  setAnalyticsData,
  setConnectionConfig,
  setRealTimeData,
  // Multi-database actions
  addConnection,
  removeConnection,
  setActiveConnection,
  updateConnectionStatus,
  loadSavedConnections,
  updateConnectionName
} = jupyterSlice.actions;
export default jupyterSlice.reducer;
