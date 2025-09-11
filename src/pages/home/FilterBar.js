import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setFilter, clearFilters } from '../../redux/slices/jupyterSlice';
import './FilterBar.css';

const FilterBar = () => {
  const { filters } = useSelector((state) => state.jupyter);
  const dispatch = useDispatch();

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'data', label: 'Data Science' },
    { value: 'machine', label: 'Machine Learning' },
    { value: 'education', label: 'Education' },
    { value: 'research', label: 'Research' },
    { value: 'development', label: 'Development' },
    { value: 'visualization', label: 'Visualization' }
  ];

  const handleFilterChange = (filterType, value) => {
    dispatch(setFilter({ filterType, value }));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label">Category:</label>
        <select 
          className="filter-select"
          value={filters.category} 
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          {categories.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
      
      <button 
        className="clear-filters-btn"
        onClick={handleClearFilters}
        disabled={filters.category === 'all' && filters.difficulty === 'all'}
      >
        Clear Filters
      </button>
    </div>
  );
};

export default FilterBar;
