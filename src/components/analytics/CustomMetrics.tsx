'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import gsap from 'gsap'

interface Order {
  id: string
  order_number: string
  customer_first_name: string
  customer_last_name: string
  total_amount: number
  created_at: string
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  is_active: boolean
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  product_name: string
}

export function CustomMetrics() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  
  // Refs voor GSAP animaties
  const metricsRef = useRef<HTMLDivElement>(null)
  const chartsRef = useRef<HTMLDivElement>(null)
  const productsChartRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        
        // Bepaal datum bereik op basis van geselecteerde periode
        const endDate = new Date()
        let startDate = new Date()
        
        if (timePeriod === '7d') {
          startDate.setDate(endDate.getDate() - 7)
        } else if (timePeriod === '30d') {
          startDate.setDate(endDate.getDate() - 30)
        } else if (timePeriod === '90d') {
          startDate.setDate(endDate.getDate() - 90)
        } else {
          // Voor 'all', begin een jaar terug
          startDate.setFullYear(endDate.getFullYear() - 1)
        }
        
        // Fetch orders binnen datum bereik
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          
        if (ordersError) throw ordersError
        
        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          
        if (productsError) throw productsError
        
        // Fetch order items
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*, products!inner(name)')
          .in('order_id', ordersData.map(order => order.id))
          
        if (itemsError) throw itemsError
        
        // Formatteer order items
        const formattedItems = itemsData.map(item => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          product_name: item.products.name
        }))
        
        setOrders(ordersData || [])
        setProducts(productsData || [])
        setOrderItems(formattedItems || [])
        
      } catch (err: any) {
        console.error('Error fetching analytics data:', err)
        setError(err.message || 'Failed to load analytics data')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [supabase, timePeriod])
  
  // GSAP animaties
  useEffect(() => {
    if (!isLoading && metricsRef.current) {
      // Header animatie
      gsap.fromTo(
        '.metrics-header',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      )
      
      // Metrics kaarten animatie
      gsap.fromTo(
        '.metric-card',
        { opacity: 0, y: 30, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          duration: 0.6, 
          stagger: 0.1,
          ease: 'back.out(1.5)'
        }
      )
      
      // Animatie voor grafieken
      gsap.fromTo(
        chartsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.4, ease: 'power2.out' }
      )
      
      gsap.fromTo(
        productsChartRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.6, ease: 'power2.out' }
      )
      
      // Animeer metrieken tellers
      const statValueElements = document.querySelectorAll('.metric-value');
      statValueElements.forEach(element => {
        const finalValue = parseFloat(element.textContent?.replace(/[^0-9.-]+/g, '') || '0');
        const prefix = element.textContent?.includes('€') ? '€' : 
                        element.textContent?.includes('%') ? '' : '';
        const suffix = element.textContent?.includes('%') ? '%' : '';
        
        gsap.fromTo(
          element, 
          { textContent: '0' },
          {
            duration: 1.5,
            delay: 0.3,
            textContent: finalValue,
            snap: { textContent: 1 },
            onUpdate: function() {
              if (this.targets()[0]) {
                let value = parseFloat(this.targets()[0].textContent || '0');
                if (prefix === '€') {
                  this.targets()[0].textContent = `${prefix}${value.toFixed(2)}`;
                } else if (suffix === '%') {
                  this.targets()[0].textContent = `${value.toFixed(1)}${suffix}`;
                } else {
                  this.targets()[0].textContent = `${Math.round(value)}`;
                }
              }
            }
          }
        );
      });
    }
  }, [isLoading]);
  
  // Bereken business metrics
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  // Bereken bestverkopende producten
  const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {}
  
  orderItems.forEach(item => {
    if (!productSales[item.product_id]) {
      productSales[item.product_id] = {
        name: item.product_name,
        quantity: 0,
        revenue: 0
      }
    }
    
    productSales[item.product_id].quantity += item.quantity
    productSales[item.product_id].revenue += item.quantity * item.price
  })
  
  const bestSellingProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    
  // Bereken conversiepercentage (dummy waarde, zou vanaf analytics API moeten komen)
  const conversionRate = totalOrders > 10 ? (totalOrders / 250) * 100 : 4.5 // Dummy waarde

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12">
        <div className="w-12 h-12 sm:w-16 sm:h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-3 sm:mb-4"></div>
        <p className="text-sm sm:text-base text-white">Loading metrics...</p>
      </div>
    )
  }

  return (
    <div ref={metricsRef} className="space-y-4 sm:space-y-6">
      <div className="metrics-header flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <h2 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
          Business Insights <span className="text-xs sm:text-sm font-normal text-gray-400">({timePeriod === 'all' ? 'All Time' : `Last ${timePeriod}`})</span>
        </h2>
        <div className="bg-gray-800/80 p-1 rounded-md flex shadow-lg self-start overflow-x-auto">
          <button
            onClick={() => setTimePeriod('7d')}
            className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              timePeriod === '7d' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimePeriod('30d')}
            className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              timePeriod === '30d' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimePeriod('90d')}
            className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              timePeriod === '90d' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            90 Days
          </button>
          <button
            onClick={() => setTimePeriod('all')}
            className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              timePeriod === 'all' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-3 sm:p-4 rounded-lg text-red-400 animate-pulse text-sm sm:text-base">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="metric-card bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-bold text-gray-300">Total Orders</h3>
            <span className="p-1 sm:p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </span>
          </div>
          <p className="metric-value text-xl sm:text-3xl font-bold mb-1 sm:mb-2">{totalOrders}</p>
          <div className="flex items-center text-gray-400 text-xs sm:text-sm">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            <span>Period total</span>
          </div>
        </div>
        
        <div className="metric-card bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-bold text-gray-300">Revenue</h3>
            <span className="p-1 sm:p-2 bg-green-500/10 text-green-400 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="metric-value text-xl sm:text-3xl font-bold mb-1 sm:mb-2">€{totalRevenue.toFixed(2)}</p>
          <div className="flex items-center text-gray-400 text-xs sm:text-sm">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span>Period revenue</span>
          </div>
        </div>
        
        <div className="metric-card bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-bold text-gray-300">Avg. Order</h3>
            <span className="p-1 sm:p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <p className="metric-value text-xl sm:text-3xl font-bold mb-1 sm:mb-2">€{averageOrderValue.toFixed(2)}</p>
          <div className="flex items-center text-gray-400 text-xs sm:text-sm">
            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
            <span>Average per order</span>
          </div>
        </div>
        
        <div className="metric-card bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-bold text-gray-300">Conversion</h3>
            <span className="p-1 sm:p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </span>
          </div>
          <p className="metric-value text-xl sm:text-3xl font-bold mb-1 sm:mb-2">{conversionRate.toFixed(1)}%</p>
          <div className="flex items-center text-gray-400 text-xs sm:text-sm">
            <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            <span>Of total visitors</span>
          </div>
        </div>
      </div>
      
      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-6 rounded-xl shadow-lg border border-gray-700/50">
          <h3 className="text-base sm:text-lg font-bold text-gray-300 mb-2 sm:mb-4">Revenue Over Time</h3>
          <div className="bg-gray-800/30 rounded-lg p-2 sm:p-4 min-h-[180px] sm:min-h-[250px]">
            {orders.length > 0 ? (
              <div className="relative h-[180px] sm:h-[250px] w-full">
                {/* Revenue chart met balken */}
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-[150px] sm:h-[200px]">
                  {/* Groepeer orders per dag en bereken dagelijkse omzet */}
                  {(() => {
                    // Groepeer orders per dag
                    const revenueByDay = orders.reduce((acc, order) => {
                      const date = new Date(order.created_at).toISOString().split('T')[0];
                      if (!acc[date]) {
                        acc[date] = 0;
                      }
                      acc[date] += Number(order.total_amount);
                      return acc;
                    }, {} as Record<string, number>);
                    
                    // Sorteer op datum en neem de laatste dagen (minder op mobiel)
                    const sortedDays = Object.keys(revenueByDay)
                      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                      .slice(-window.innerWidth < 640 ? 7 : 10);
                    
                    // Vind de hoogste dagelijkse omzet voor het schalen van de grafiek
                    const maxRevenue = Math.max(...sortedDays.map(day => revenueByDay[day]));
                    
                    return sortedDays.map((day, index) => {
                      const revenue = revenueByDay[day];
                      const height = Math.max((revenue / maxRevenue) * (window.innerWidth < 640 ? 130 : 180), 8); // minimale hoogte van 8px op mobiel
                      
                      return (
                        <div key={day} className="flex flex-col items-center group" style={{ flex: '1 0 auto' }}>
                          <div className="relative">
                            <div 
                              className="w-4 sm:w-6 md:w-10 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md mx-0.5 sm:mx-1 shadow-lg group-hover:from-blue-500 group-hover:to-blue-300 transition-all duration-300"
                              style={{ height: `${height}px` }}
                            ></div>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                              <div className="bg-gray-800 text-white text-[10px] sm:text-xs py-1 px-1.5 sm:px-2 rounded shadow whitespace-nowrap">
                                €{revenue.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="text-[9px] sm:text-xs text-gray-400 mt-1 sm:mt-2 transform -rotate-45 origin-top-left h-6 sm:h-8 truncate max-w-[30px] sm:max-w-none">
                            {new Date(day).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Y-as labels */}
                <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-[9px] sm:text-xs text-gray-500">
                  <div>€{(() => {
                    const maxRevenue = Math.max(...Object.values(orders.reduce((acc, order) => {
                      const date = new Date(order.created_at).toISOString().split('T')[0];
                      if (!acc[date]) {
                        acc[date] = 0;
                      }
                      acc[date] += Number(order.total_amount);
                      return acc;
                    }, {} as Record<string, number>)));
                    return maxRevenue.toFixed(0);
                  })()}</div>
                  <div>€0</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] sm:h-[250px]">
                <div className="text-center">
                  <svg className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <p className="text-xs sm:text-sm text-gray-400">No revenue data available for this period.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-6 rounded-xl shadow-lg border border-gray-700/50">
          <h3 className="text-base sm:text-lg font-bold text-gray-300 mb-2 sm:mb-4">Orders By Status</h3>
          <div className="bg-gray-800/30 rounded-lg p-2 sm:p-4 min-h-[180px] sm:min-h-[250px]">
            {orders.length > 0 ? (
              <div className="h-[180px] sm:h-[250px] flex flex-col justify-center">
                {/* Doughnut chart voor order status */}
                <div className="relative flex justify-center">
                  {(() => {
                    // Maak dummy statussen aangezien we geen status hebben in het huidige model
                    // Dit kan aangepast worden als er echte statusgegevens beschikbaar zijn
                    const ordersByStatus = {
                      'Completed': Math.round(orders.length * 0.6),
                      'Processing': Math.round(orders.length * 0.2),
                      'Pending': Math.round(orders.length * 0.15),
                      'Cancelled': orders.length - Math.round(orders.length * 0.6) - Math.round(orders.length * 0.2) - Math.round(orders.length * 0.15)
                    };
                    
                    const statusColors = {
                      'Completed': 'bg-green-500',
                      'Processing': 'bg-blue-500',
                      'Pending': 'bg-amber-500',
                      'Cancelled': 'bg-red-500'
                    };
                    
                    const total = orders.length;
                    let currentAngle = 0;
                    
                    return (
                      <div className="relative w-32 h-32 sm:w-48 sm:h-48">
                        {/* Render doughnut segments */}
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#374151" strokeWidth="15" />
                          
                          {Object.entries(ordersByStatus).map(([status, count], index) => {
                            const percentage = (count / total) * 100;
                            const angle = (percentage / 100) * 360;
                            
                            // Calculate start and end angles
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            currentAngle = endAngle;
                            
                            // Convert angles to radians
                            const startRad = (startAngle - 90) * Math.PI / 180;
                            const endRad = (endAngle - 90) * Math.PI / 180;
                            
                            // Calculate arc path
                            const x1 = 50 + 40 * Math.cos(startRad);
                            const y1 = 50 + 40 * Math.sin(startRad);
                            const x2 = 50 + 40 * Math.cos(endRad);
                            const y2 = 50 + 40 * Math.sin(endRad);
                            
                            // Determine large-arc-flag
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            // Create SVG arc path
                            const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                            
                            // Get color based on status
                            const colorClass = statusColors[status as keyof typeof statusColors];
                            const fillColor = colorClass.replace('bg-', '');
                            const fillHex = fillColor === 'green-500' ? '#10B981' :
                                          fillColor === 'blue-500' ? '#3B82F6' :
                                          fillColor === 'amber-500' ? '#F59E0B' :
                                          fillColor === 'red-500' ? '#EF4444' : '#111827';
                            
                            return (
                              <path 
                                key={status} 
                                d={pathData} 
                                fill={fillHex}
                                className="hover:opacity-90 cursor-pointer"
                              />
                            );
                          })}
                          
                          {/* Inner circle for doughnut effect */}
                          <circle cx="50" cy="50" r="25" fill="#1F2937" />
                        </svg>
                        
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <div className="text-sm sm:text-xl font-bold text-white">{total}</div>
                          <div className="text-[9px] sm:text-xs text-gray-400">Orders</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Legend */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-6">
                  <div className="flex items-center">
                    <span className="w-2 sm:w-3 h-2 sm:h-3 bg-green-500 rounded-full mr-1 sm:mr-2"></span>
                    <span className="text-xs sm:text-sm text-gray-300 truncate">Completed ({Math.round(orders.length * 0.6)})</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 sm:w-3 h-2 sm:h-3 bg-blue-500 rounded-full mr-1 sm:mr-2"></span>
                    <span className="text-xs sm:text-sm text-gray-300 truncate">Processing ({Math.round(orders.length * 0.2)})</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 sm:w-3 h-2 sm:h-3 bg-amber-500 rounded-full mr-1 sm:mr-2"></span>
                    <span className="text-xs sm:text-sm text-gray-300 truncate">Pending ({Math.round(orders.length * 0.15)})</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 sm:w-3 h-2 sm:h-3 bg-red-500 rounded-full mr-1 sm:mr-2"></span>
                    <span className="text-xs sm:text-sm text-gray-300 truncate">Cancelled ({orders.length - Math.round(orders.length * 0.6) - Math.round(orders.length * 0.2) - Math.round(orders.length * 0.15)})</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] sm:h-[250px]">
                <div className="text-center">
                  <svg className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <p className="text-xs sm:text-sm text-gray-400">No order data available for this period.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div ref={productsChartRef} className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-6 rounded-xl shadow-lg border border-gray-700/50">
        <h3 className="text-base sm:text-lg font-bold text-gray-300 mb-2 sm:mb-4">Best Selling Products</h3>
        {bestSellingProducts.length === 0 ? (
          <div className="bg-gray-800/30 rounded-lg p-4 sm:p-8 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-xs sm:text-sm text-gray-400">No product sales data available for the selected period.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[280px] sm:min-w-full px-3 sm:px-0">
              <table className="w-full border-separate border-spacing-y-1 sm:border-spacing-y-2">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 sm:pb-3 text-gray-400 font-medium text-xs sm:text-sm">Product</th>
                    <th className="pb-2 sm:pb-3 text-gray-400 font-medium text-right text-xs sm:text-sm">Quantity</th>
                    <th className="pb-2 sm:pb-3 text-gray-400 font-medium text-right text-xs sm:text-sm">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellingProducts.map((product, index) => (
                    <tr key={index}>
                      <td className="py-2 sm:py-3 px-1 sm:px-2 bg-gray-800/30 first:rounded-l-lg">
                        <div className="font-medium text-xs sm:text-sm flex items-center">
                          <span className={`inline-block w-2 h-2 mr-1.5 sm:mr-2 rounded-full ${
                            index === 0 ? 'bg-green-500' :
                            index === 1 ? 'bg-blue-500' :
                            index === 2 ? 'bg-amber-500' :
                            'bg-gray-500'
                          }`}></span>
                          <span className="truncate max-w-[100px] sm:max-w-none">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-1 sm:px-2 bg-gray-800/30 text-right">
                        <div className="font-medium text-xs sm:text-sm">{product.quantity}</div>
                      </td>
                      <td className="py-2 sm:py-3 px-1 sm:px-2 bg-gray-800/30 text-right last:rounded-r-lg">
                        <div className="font-medium text-xs sm:text-sm">€{product.revenue.toFixed(2)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Scroll indicator voor mobiel */}
            <div className="mt-3 pb-2 flex justify-center sm:hidden">
              <div className="w-16 h-1 bg-gray-700 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/50 animate-pulse rounded-full"></div>
              </div>
              <span className="sr-only">Scroll horizontally to see more</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 