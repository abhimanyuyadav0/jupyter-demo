import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedUseCase } from '../../redux/slices/jupyterSlice';
import UseCaseCard from './UseCaseCard';
import Hero from './Hero';
import FilterBar from './FilterBar';
import './Home.css';

const HomePage = () => {
  const { useCases, filters } = useSelector((state) => state.jupyter);
  const dispatch = useDispatch();

  const filteredUseCases = useCases.filter(useCase => {
    if (filters.category === 'all') return true;
    return useCase.title.toLowerCase().includes(filters.category.toLowerCase());
  });

  const handleUseCaseSelect = (useCase) => {
    dispatch(setSelectedUseCase(useCase));
  };

  return (
    <div className="home">
      <Hero />
      <div className="container">
        <section className="use-cases-section">
          <h2 className="section-title">Explore Jupyter Use Cases</h2>
          <p className="section-subtitle">
            Discover the versatility of Jupyter notebooks across different domains
          </p>
          
          <FilterBar />
          
          <div className="use-cases-grid">
            {filteredUseCases.map((useCase) => (
              <UseCaseCard 
                key={useCase.id} 
                useCase={useCase}
                onSelect={handleUseCaseSelect}
              />
            ))}
          </div>
        </section>

        <section className="features-section">
          <h2 className="section-title">Why Jupyter?</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">🚀</div>
              <h3>Interactive Computing</h3>
              <p>Execute code cells individually and see results immediately</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📝</div>
              <h3>Rich Documentation</h3>
              <p>Combine code, markdown, and visualizations in one document</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔄</div>
              <h3>Reproducible Research</h3>
              <p>Share notebooks for transparent and reproducible workflows</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🌐</div>
              <h3>Web-Based</h3>
              <p>Access from anywhere with just a web browser</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
