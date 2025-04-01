import React, { useEffect, useRef } from 'react';
import { animate } from '../../utils/animations';

interface MetricProps {
  title: string;
  value: number;
  previousValue?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  increase?: boolean;
  icon?: React.ReactNode;
  iconBgClass?: string;
  description?: string;
}

export default function CustomMetrics({ 
  title, 
  value, 
  previousValue,
  valuePrefix = '', 
  valueSuffix = '',
  increase = true,
  icon,
  iconBgClass = 'bg-blue-500/10',
  description
}: MetricProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  
  // Bereken percentage verandering
  const percentageChange = previousValue 
    ? Math.round(((value - previousValue) / previousValue) * 100) 
    : 0;
  
  // Animeer het getal bij laden
  useEffect(() => {
    if (valueRef.current) {
      animate(valueRef.current, 'fadeIn', { duration: 0.3 });
      
      // Tel op van 0 naar waarde
      const startValue = 0;
      const endValue = value;
      const duration = 1500;
      const frameDuration = 1000 / 60;
      const totalFrames = Math.round(duration / frameDuration);
      let frame = 0;
      
      // Function to format the value with thousand separators
      const formatNumber = (num: number) => {
        return num.toLocaleString('nl-NL');
      };
      
      const counter = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const currentValue = Math.round(startValue + (endValue - startValue) * progress);
        
        if (valueRef.current) {
          valueRef.current.textContent = `${valuePrefix}${formatNumber(currentValue)}${valueSuffix}`;
        }
        
        if (frame === totalFrames) {
          clearInterval(counter);
          if (valueRef.current) {
            valueRef.current.textContent = `${valuePrefix}${formatNumber(endValue)}${valueSuffix}`;
          }
        }
      }, frameDuration);
      
      return () => clearInterval(counter);
    }
  }, [value, valuePrefix, valueSuffix]);
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors shadow-md">
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`${iconBgClass} p-2 rounded-lg`}>
            {icon}
          </div>
        )}
        
        <div className="flex-grow">
          <h3 className="text-sm text-gray-400 mb-1">{title}</h3>
          <div className="flex items-baseline">
            <span 
              ref={valueRef} 
              className="text-xl font-bold text-white"
            >
              {valuePrefix}{value.toLocaleString('nl-NL')}{valueSuffix}
            </span>
            
            {previousValue !== undefined && percentageChange !== 0 && (
              <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${
                increase === (percentageChange > 0)
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {percentageChange > 0 ? '+' : ''}{percentageChange}%
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
} 