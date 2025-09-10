import React from 'react';
import { Link } from 'react-router-dom';
import './UseCaseCard.css';

const UseCaseCard = ({ useCase, onSelect }) => {
  const handleClick = () => {
    onSelect(useCase);
  };

  return (
    <div className="use-case-card" onClick={handleClick}>
      <Link to={`/usecase/${useCase.id}`} className="card-link">
        <div className="card-header">
          <span className="card-icon">{useCase.icon}</span>
          <h3 className="card-title">{useCase.title}</h3>
        </div>
        
        <p className="card-description">{useCase.description}</p>
        
        <div className="card-examples">
          <h4 className="examples-title">Common Uses:</h4>
          <ul className="examples-list">
            {useCase.examples.slice(0, 3).map((example, index) => (
              <li key={index} className="example-item">{example}</li>
            ))}
          </ul>
        </div>
        
        <div className="card-tools">
          <span className="tools-label">Popular Tools:</span>
          <div className="tools-list">
            {useCase.tools.slice(0, 3).map((tool, index) => (
              <span key={index} className="tool-tag">{tool}</span>
            ))}
            {useCase.tools.length > 3 && (
              <span className="tool-tag more">+{useCase.tools.length - 3}</span>
            )}
          </div>
        </div>
        
        <div className="card-footer">
          <span className="learn-more">Learn More →</span>
        </div>
      </Link>
    </div>
  );
};

export default UseCaseCard;
