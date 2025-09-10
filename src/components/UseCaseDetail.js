import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import CodeExample from './CodeExample';
import './UseCaseDetail.css';

const UseCaseDetail = () => {
  const { id } = useParams();
  const { useCases } = useSelector((state) => state.jupyter);
  
  const useCase = useCases.find(uc => uc.id === parseInt(id));
  
  if (!useCase) {
    return (
      <div className="container">
        <div className="not-found">
          <h2>Use case not found</h2>
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const getCodeExample = (useCaseId) => {
    const examples = {
      1: `# Data Science & Analytics Example
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load and explore data
df = pd.read_csv('data.csv')
print(df.head())
print(df.describe())

# Create visualizations
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x='feature1', y='feature2', hue='category')
plt.title('Feature Relationship Analysis')
plt.show()`,
      
      2: `# Machine Learning Example
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# Prepare data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)
print(classification_report(y_test, predictions))`,
      
      3: `# Educational Example - Mathematical Concepts
import numpy as np
import matplotlib.pyplot as plt

# Demonstrate calculus concepts
x = np.linspace(-5, 5, 100)
y = x**2

# Plot function and its derivative
plt.figure(figsize=(12, 5))
plt.subplot(1, 2, 1)
plt.plot(x, y, label='f(x) = x²')
plt.title('Original Function')
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(x, 2*x, label="f'(x) = 2x", color='red')
plt.title('Derivative')
plt.legend()
plt.show()`,
      
      4: `# Research Example - Statistical Analysis
import scipy.stats as stats
import numpy as np

# Research hypothesis testing
group1 = np.random.normal(100, 15, 50)
group2 = np.random.normal(105, 15, 50)

# Perform t-test
t_stat, p_value = stats.ttest_ind(group1, group2)

print(f"T-statistic: {t_stat:.4f}")
print(f"P-value: {p_value:.4f}")
print(f"Significant difference: {p_value < 0.05}")`,
      
      5: `# Prototyping Example - API Testing
import requests
import json

# Test API endpoint
url = "https://api.example.com/data"
headers = {"Authorization": "Bearer your_token"}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    print(f"Success! Retrieved {len(data)} records")
    print(json.dumps(data[:2], indent=2))
else:
    print(f"Error: {response.status_code}")`,
      
      6: `# Data Visualization Example
import plotly.graph_objects as go
import plotly.express as px

# Interactive visualization
fig = go.Figure()

# Add traces
fig.add_trace(go.Scatter(
    x=[1, 2, 3, 4],
    y=[10, 11, 12, 13],
    mode='markers+lines',
    name='Dataset 1'
))

fig.update_layout(
    title='Interactive Data Visualization',
    xaxis_title='X Axis',
    yaxis_title='Y Axis'
)

fig.show()`
    };
    
    return examples[useCaseId] || '# Code example coming soon...';
  };

  return (
    <div className="use-case-detail">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{useCase.title}</span>
        </div>
        
        <div className="detail-header">
          <div className="detail-icon">{useCase.icon}</div>
          <div className="detail-info">
            <h1 className="detail-title">{useCase.title}</h1>
            <p className="detail-description">{useCase.description}</p>
          </div>
        </div>
        
        <div className="detail-content">
          <div className="detail-grid">
            <div className="examples-section">
              <h2>Common Applications</h2>
              <div className="examples-grid">
                {useCase.examples.map((example, index) => (
                  <div key={index} className="example-card">
                    <h3>{example}</h3>
                    <p>Learn how Jupyter notebooks excel in {example.toLowerCase()}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="tools-section">
              <h2>Essential Tools & Libraries</h2>
              <div className="tools-grid">
                {useCase.tools.map((tool, index) => (
                  <div key={index} className="tool-card">
                    <span className="tool-name">{tool}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="code-section">
            <h2>Example Code</h2>
            <p>Here's a typical example of how you might use Jupyter for {useCase.title.toLowerCase()}:</p>
            <CodeExample code={getCodeExample(useCase.id)} />
          </div>
          
          <div className="benefits-section">
            <h2>Why Use Jupyter for {useCase.title}?</h2>
            <div className="benefits-list">
              <div className="benefit">
                <span className="benefit-icon">⚡</span>
                <div className="benefit-content">
                  <h3>Interactive Development</h3>
                  <p>Execute code step by step and see immediate results</p>
                </div>
              </div>
              <div className="benefit">
                <span className="benefit-icon">📊</span>
                <div className="benefit-content">
                  <h3>Rich Output</h3>
                  <p>Display plots, tables, and interactive widgets inline</p>
                </div>
              </div>
              <div className="benefit">
                <span className="benefit-icon">📝</span>
                <div className="benefit-content">
                  <h3>Documentation</h3>
                  <p>Combine code with explanatory text and visualizations</p>
                </div>
              </div>
              <div className="benefit">
                <span className="benefit-icon">🔄</span>
                <div className="benefit-content">
                  <h3>Reproducible</h3>
                  <p>Share notebooks for transparent and repeatable workflows</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCaseDetail;
