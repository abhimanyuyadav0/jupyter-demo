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
    }
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
  setAnalyticsData 
} = jupyterSlice.actions;
export default jupyterSlice.reducer;
