import { useState } from 'react';

interface TextHighlightProps {
  text: string;
  color?: string;
  onClick?: () => void;
}

export function TextHighlight({ text, color = 'rgba(255, 255, 0, 0.4)', onClick }: TextHighlightProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="inline relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span 
        style={{ 
          backgroundColor: color,
          padding: '2px 0',
          borderRadius: '2px',
          boxShadow: isHovered ? '0 0 0 2px rgba(0, 0, 0, 0.1)' : 'none'
        }}
      >
        {text}
      </span>
    </div>
  );
}