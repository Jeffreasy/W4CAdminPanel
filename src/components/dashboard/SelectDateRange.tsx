import React, { useState } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';

// Voorgedefinieerde datumbereiken
type DateRangeOption = 'today' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'custom';

interface SelectDateRangeProps {
  onRangeChange: (startDate: Date, endDate: Date, label: string) => void;
  initialRange?: DateRangeOption;
}

export default function SelectDateRange({ 
  onRangeChange,
  initialRange = '30days'
}: SelectDateRangeProps) {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>(initialRange);
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  
  // Geeft label, start en eind datum terug voor een bepaald bereik
  const getDateRange = (range: DateRangeOption): { label: string; startDate: Date; endDate: Date } => {
    const today = new Date();
    
    switch (range) {
      case 'today':
        return {
          label: 'Vandaag',
          startDate: today,
          endDate: today
        };
      case '7days':
        return {
          label: 'Afgelopen 7 dagen',
          startDate: subDays(today, 6),
          endDate: today
        };
      case '30days':
        return {
          label: 'Afgelopen 30 dagen',
          startDate: subDays(today, 29),
          endDate: today
        };
      case 'thisMonth':
        return {
          label: 'Deze maand',
          startDate: startOfMonth(today),
          endDate: today
        };
      case 'lastMonth': {
        const lastMonth = subMonths(today, 1);
        return {
          label: 'Vorige maand',
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth)
        };
      }
      case 'custom':
        return {
          label: 'Aangepast',
          startDate: new Date(customStart),
          endDate: new Date(customEnd)
        };
      default:
        return {
          label: 'Afgelopen 30 dagen',
          startDate: subDays(today, 29),
          endDate: today
        };
    }
  };
  
  // Handle range selection
  const handleRangeChange = (range: DateRangeOption) => {
    setSelectedRange(range);
    
    if (range === 'custom') {
      setIsCustomExpanded(true);
      // We trigger the callback only when the custom dates are actually selected
      return;
    }
    
    setIsCustomExpanded(false);
    const { label, startDate, endDate } = getDateRange(range);
    onRangeChange(startDate, endDate, label);
  };
  
  // Handle custom date changes
  const handleCustomDateChange = () => {
    try {
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      
      if (startDate > endDate) {
        alert('Startdatum moet voor einddatum liggen');
        return;
      }
      
      const label = `${format(startDate, 'd MMM', { locale: nl })} - ${format(endDate, 'd MMM yyyy', { locale: nl })}`;
      onRangeChange(startDate, endDate, label);
    } catch (error) {
      alert('Ongeldige datum');
    }
  };
  
  // Convenience buttons for common ranges in custom view
  const setQuickCustomRange = (type: string) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;
    
    switch (type) {
      case 'thisWeek':
        start = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
        end = endOfWeek(today, { weekStartsOn: 1 }); // End on Sunday
        break;
      case 'lastWeek':
        const lastWeek = subDays(today, 7);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default:
        start = subDays(today, 29);
    }
    
    setCustomStart(format(start, 'yyyy-MM-dd'));
    setCustomEnd(format(end, 'yyyy-MM-dd'));
  };
  
  // Get the currently selected date range
  const { label } = getDateRange(selectedRange);
  const displayLabel = selectedRange === 'custom' 
    ? `${format(new Date(customStart), 'd MMM', { locale: nl })} - ${format(new Date(customEnd), 'd MMM yyyy', { locale: nl })}` 
    : label;
  
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleRangeChange('today')}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            selectedRange === 'today' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Vandaag
        </button>
        
        <button
          onClick={() => handleRangeChange('7days')}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            selectedRange === '7days' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          7 dagen
        </button>
        
        <button
          onClick={() => handleRangeChange('30days')}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            selectedRange === '30days' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          30 dagen
        </button>
        
        <button
          onClick={() => handleRangeChange('thisMonth')}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            selectedRange === 'thisMonth' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Deze maand
        </button>
        
        <button
          onClick={() => handleRangeChange('lastMonth')}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            selectedRange === 'lastMonth' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Vorige maand
        </button>
        
        <button
          onClick={() => handleRangeChange('custom')}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            selectedRange === 'custom' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Aangepast
        </button>
      </div>
      
      {isCustomExpanded && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Startdatum</p>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Einddatum</p>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCustomDateChange}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Toepassen
              </button>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-400 mb-1">Snelle selectie</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuickCustomRange('thisWeek')}
                className="px-2 py-1 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-xs transition-colors"
              >
                Deze week
              </button>
              <button
                onClick={() => setQuickCustomRange('lastWeek')}
                className="px-2 py-1 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-xs transition-colors"
              >
                Vorige week
              </button>
              <button
                onClick={() => setQuickCustomRange('thisMonth')}
                className="px-2 py-1 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-xs transition-colors"
              >
                Deze maand
              </button>
              <button
                onClick={() => setQuickCustomRange('lastMonth')}
                className="px-2 py-1 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-xs transition-colors"
              >
                Vorige maand
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="inline-flex items-center bg-gray-800/50 px-3 py-1 rounded-md text-sm">
        <span className="text-gray-400 mr-2">Geselecteerd:</span>
        <span className="font-medium">{displayLabel}</span>
      </div>
    </div>
  );
} 