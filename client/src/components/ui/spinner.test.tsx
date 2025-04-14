/**
 * Tests for Spinner Component
 * 
 * These tests ensure that our spinner component
 * correctly renders with different sizes and options.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('should render with default size', () => {
    // Arrange & Act
    render(<Spinner />);
    
    // Assert
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-5 w-5'); // Default size
  });
  
  it('should render with small size', () => {
    // Arrange & Act
    render(<Spinner size="sm" />);
    
    // Assert
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-4 w-4');
  });
  
  it('should render with large size', () => {
    // Arrange & Act
    render(<Spinner size="lg" />);
    
    // Assert
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-6 w-6');
  });
  
  it('should render with custom className', () => {
    // Arrange & Act
    render(<Spinner className="text-red-500" />);
    
    // Assert
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('text-red-500');
  });
  
  it('should have visually-hidden text for screen readers', () => {
    // Arrange & Act
    render(<Spinner />);
    
    // Assert
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toHaveClass('sr-only');
  });
  
  it('should render with custom label for screen readers', () => {
    // Arrange & Act
    render(<Spinner label="Processing your request" />);
    
    // Assert
    expect(screen.getByText('Processing your request')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
  
  it('should be centered when center prop is true', () => {
    // Arrange & Act
    render(<Spinner center />);
    
    // Assert
    // The spinner should be wrapped in a centered container
    const container = screen.getByRole('status').parentElement;
    expect(container).toHaveClass('flex items-center justify-center');
  });
  
  it('should not be centered when center prop is false', () => {
    // Arrange & Act
    render(<Spinner center={false} />);
    
    // Assert
    // The spinner should not be wrapped in a centered container
    const spinner = screen.getByRole('status');
    expect(spinner.parentElement).not.toHaveClass('flex items-center justify-center');
  });
  
  it('should render with provided data-testid', () => {
    // Arrange & Act
    render(<Spinner data-testid="custom-spinner" />);
    
    // Assert
    expect(screen.getByTestId('custom-spinner')).toBeInTheDocument();
  });
  
  it('should handle optional props correctly', () => {
    // Arrange & Act
    const { rerender } = render(<Spinner />);
    
    // Assert default behavior
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-primary');
    
    // Re-render with different props
    rerender(<Spinner variant="secondary" />);
    
    // Assert new props applied
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-secondary');
  });
});