'use client'

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { barChartSetting, pieChartSetting, lineChartSetting } from '../../../components/ChartsSettings';
import CustomMetrics from '../../../components/dashboard/CustomMetrics';
import SelectDateRange from '../../../components/dashboard/SelectDateRange';
import { Doughnut, Pie, Bar, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import { animate } from '../../../utils/animations';

Chart.register(...registerables);

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Analytics() {
  // References for animations
  const pageRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [orderData, setOrderData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });

  // State for analytics data
  const [analyticsData, setAnalyticsData] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    ordersByStatus: {} as Record<string, number>,
    ordersByDate: {} as Record<string, number>,
    ordersByProduct: {} as Record<string, number>,
    revenueByProduct: {} as Record<string, number>,
  });

  // Function to fetch orders data from Supabase
  async function fetchOrders() {
    setLoading(true);
    setError(null);

    try {
      // Get the date range in ISO format
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      // Fetch orders from Supabase within the date range
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product: products (*)
          )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to fetch orders. Please try again later.');
        return;
      }

      if (data) {
        setOrderData(data);
        processAnalyticsData(data);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  // Process the data for analytics
  function processAnalyticsData(orders: any[]) {
    // Initialize analytics counters
    let totalOrders = orders.length;
    let totalRevenue = 0;
    let ordersByStatus: Record<string, number> = {};
    let ordersByDate: Record<string, number> = {};
    let ordersByProduct: Record<string, number> = {};
    let revenueByProduct: Record<string, number> = {};

    // Process each order
    orders.forEach((order) => {
      // Count by status
      const status = order.status || 'unknown';
      ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;

      // Count by date (group by day)
      const date = format(new Date(order.created_at), 'yyyy-MM-dd');
      ordersByDate[date] = (ordersByDate[date] || 0) + 1;

      // Process order items
      let orderTotal = 0;
      order.order_items?.forEach((item: any) => {
        // Skip if product information is not available
        if (!item.product) return;

        const productName = item.product.name || 'Unknown Product';
        const quantity = item.quantity || 0;
        const price = item.price || 0;
        const itemTotal = quantity * price;
        
        // Sum for this product
        ordersByProduct[productName] = (ordersByProduct[productName] || 0) + quantity;
        revenueByProduct[productName] = (revenueByProduct[productName] || 0) + itemTotal;
        
        // Add to order total
        orderTotal += itemTotal;
      });

      // Add to total revenue
      totalRevenue += orderTotal;
    });

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Update state with processed data
    setAnalyticsData({
      totalOrders,
      totalRevenue,
      averageOrderValue,
      ordersByStatus,
      ordersByDate,
      ordersByProduct,
      revenueByProduct,
    });
  }

  useEffect(() => {
    fetchOrders();
  }, [dateRange]);

  useEffect(() => {
    // Animate component entrance when loaded
    if (!loading && pageRef.current) {
      animate(pageRef.current, 'fadeInUp', {
        duration: 0.5,
        delay: 0.1
      });
      
      // Animate charts
      if (chartsRef.current) {
        animate(chartsRef.current, 'fadeIn', {
          duration: 0.8,
          delay: 0.3
        });
      }
      
      // Animate metrics
      if (metricsRef.current) {
        animate(metricsRef.current, 'fadeInUp', {
          duration: 0.7,
          delay: 0.2
        });
      }
    }
  }, [loading]);

  // Prepare chart data
  const orderStatusData = {
    labels: Object.keys(analyticsData.ordersByStatus),
    datasets: [
      {
        data: Object.values(analyticsData.ordersByStatus),
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Sort dates and prepare order trend data
  const sortedDates = Object.keys(analyticsData.ordersByDate).sort();
  const orderTrendData = {
    labels: sortedDates.map(date => 
      format(new Date(date), 'd MMM', { locale: nl })
    ),
    datasets: [
      {
        label: 'Orders',
        data: sortedDates.map(date => analyticsData.ordersByDate[date]),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Get top 5 products by revenue
  const topProductsByRevenue = Object.entries(analyticsData.revenueByProduct)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topProductsData = {
    labels: topProductsByRevenue.map(([product]) => product),
    datasets: [
      {
        label: 'Revenue (€)',
        data: topProductsByRevenue.map(([, revenue]) => revenue),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Handle date range change
  const handleDateRangeChange = (startDate: Date, endDate: Date, label: string) => {
    setDateRange({
      start: startDate,
      end: endDate
    });
  };

  if (loading) {
    return <LoadingSpinner message="Analytics data laden..." size="large" centered />;
  }

  if (error) {
    return <ErrorMessage message={error} variant="error" />;
  }

  return (
    <div ref={pageRef} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <SelectDateRange 
          onRangeChange={handleDateRangeChange} 
          initialRange="30days"
        />
      </div>

      {/* Key metrics */}
      <div ref={metricsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <CustomMetrics 
          title="Totaal Bestellingen" 
          value={analyticsData.totalOrders} 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          iconBgClass="bg-blue-500/10"
          previousValue={analyticsData.totalOrders - 5}
          increase={true}
        />
        <CustomMetrics 
          title="Totale Omzet" 
          value={analyticsData.totalRevenue} 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBgClass="bg-green-500/10"
          previousValue={analyticsData.totalRevenue - 150}
          increase={true}
          valuePrefix="€"
        />
        <CustomMetrics 
          title="Gem. Bestelwaarde" 
          value={analyticsData.averageOrderValue} 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
          iconBgClass="bg-amber-500/10"
          previousValue={analyticsData.averageOrderValue + 5}
          increase={false}
          valuePrefix="€"
        />
      </div>

      {/* Charts */}
      <div ref={chartsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-standard p-4">
          <h2 className="text-xl font-semibold mb-4">Bestellingen per Dag</h2>
          <div className="h-64 md:h-72">
            <Line data={orderTrendData} options={lineChartSetting} />
          </div>
        </div>
        
        <div className="card-standard p-4">
          <h2 className="text-xl font-semibold mb-4">Status Bestellingen</h2>
          <div className="h-64 md:h-72 flex items-center justify-center">
            <Doughnut 
              data={orderStatusData} 
              options={{
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
              }} 
            />
          </div>
        </div>
        
        <div className="card-standard p-4 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Top 5 Producten (Omzet)</h2>
          <div className="h-64 md:h-96">
            <Bar data={topProductsData} options={barChartSetting} />
          </div>
        </div>
      </div>
    </div>
  );
} 