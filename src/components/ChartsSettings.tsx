import { ChartOptions } from 'chart.js';

/**
 * Standaard instellingen voor staafdiagrammen.
 */
export const barChartSetting: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        font: {
          family: 'Inter',
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(53, 71, 125, 0.8)',
      padding: 12,
      titleColor: 'rgba(255, 255, 255, 0.95)',
      bodyColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      displayColors: true,
      boxPadding: 4,
      bodyFont: {
        family: 'Inter',
      },
      titleFont: {
        family: 'Inter',
        weight: 'bold'
      },
      callbacks: {
        label: function(context) {
          if (context.dataset.label?.includes('Revenue')) {
            return `€${context.raw}`;
          }
          return context.raw as string;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
        callback: function(value) {
          return value;
        }
      }
    }
  }
};

/**
 * Aangepaste Y-as instellingen met €-symbool callback
 */
export const revenueYAxisSetting = {
  grid: {
    color: 'rgba(255, 255, 255, 0.05)',
  },
  ticks: {
    color: 'rgba(255, 255, 255, 0.6)',
    callback: function(value: number) {
      return '€' + value;
    }
  }
};

/**
 * Standaard instellingen voor cirkeldiagrammen.
 */
export const pieChartSetting: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        font: {
          family: 'Inter',
        },
        padding: 15
      }
    },
    tooltip: {
      backgroundColor: 'rgba(53, 71, 125, 0.8)',
      padding: 12,
      titleColor: 'rgba(255, 255, 255, 0.95)',
      bodyColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      displayColors: true,
      boxPadding: 4,
      bodyFont: {
        family: 'Inter',
      },
      titleFont: {
        family: 'Inter',
        weight: 'bold'
      }
    }
  }
};

/**
 * Standaard instellingen voor lijndiagrammen.
 */
export const lineChartSetting: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        font: {
          family: 'Inter',
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(53, 71, 125, 0.8)',
      padding: 12,
      titleColor: 'rgba(255, 255, 255, 0.95)',
      bodyColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      displayColors: true,
      boxPadding: 4,
      bodyFont: {
        family: 'Inter',
      },
      titleFont: {
        family: 'Inter',
        weight: 'bold'
      },
      callbacks: {
        label: function(context) {
          if (context.dataset.label?.includes('Revenue')) {
            return `€${context.raw}`;
          }
          return context.raw as string;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
      }
    }
  },
  elements: {
    line: {
      tension: 0.3,
    },
    point: {
      radius: 3,
      hoverRadius: 5,
    }
  }
};

// Kleuren voor diagrammen
export const chartColors = {
  primary: 'rgba(59, 130, 246, 0.8)',
  primaryLight: 'rgba(59, 130, 246, 0.3)',
  primaryBorder: 'rgba(59, 130, 246, 1)',
  secondary: 'rgba(245, 158, 11, 0.8)',
  secondaryLight: 'rgba(245, 158, 11, 0.3)',
  secondaryBorder: 'rgba(245, 158, 11, 1)',
  success: 'rgba(16, 185, 129, 0.8)',
  successLight: 'rgba(16, 185, 129, 0.3)',
  successBorder: 'rgba(16, 185, 129, 1)',
  danger: 'rgba(239, 68, 68, 0.8)',
  dangerLight: 'rgba(239, 68, 68, 0.3)',
  dangerBorder: 'rgba(239, 68, 68, 1)',
  purple: 'rgba(139, 92, 246, 0.8)',
  purpleLight: 'rgba(139, 92, 246, 0.3)',
  purpleBorder: 'rgba(139, 92, 246, 1)',
  cyan: 'rgba(6, 182, 212, 0.8)',
  cyanLight: 'rgba(6, 182, 212, 0.3)',
  cyanBorder: 'rgba(6, 182, 212, 1)',
}; 