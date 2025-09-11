import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-pattern"></div>
      </div>
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover the Power of 
            <span className="highlight"> Jupyter Notebooks</span>
          </h1>
          <p className="hero-description">
            From data science to education, from research to prototyping - 
            explore the endless possibilities of interactive computing
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">10M+</span>
              <span className="stat-label">Notebooks on GitHub</span>
            </div>
            <div className="stat">
              <span className="stat-number">100+</span>
              <span className="stat-label">Programming Languages</span>
            </div>
            <div className="stat">
              <span className="stat-number">500K+</span>
              <span className="stat-label">Daily Active Users</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="notebook-preview">
            <div className="notebook-header">
              <div className="notebook-controls">
                <span className="control red"></span>
                <span className="control yellow"></span>
                <span className="control green"></span>
              </div>
              <span className="notebook-title">my_analysis.ipynb</span>
            </div>
            <div className="notebook-content">
              <div className="cell markdown">
                <span className="cell-label"># Data Analysis</span>
              </div>
              <div className="cell code">
                <span className="cell-label">import pandas as pd</span>
              </div>
              <div className="cell output">
                <div className="chart-placeholder"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
