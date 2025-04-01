'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface Order {
  id: string
  order_number: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  customer_address: string
  customer_city: string
  customer_postal_code: string
  customer_country: string
  total_amount: number
  status: string
  payment_reference: string | null
  created_at: string
  updated_at: string
  emails_sent: boolean
}

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<string>('desc')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Order | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  
  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      try {
        setDataLoading(true)
        setError(null)
        
        let query = supabase
          .from('orders')
          .select('*')
        
        // Apply status filter
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }
        
        // Apply sorting
        query = query.order(sortField, { ascending: sortDirection === 'asc' })
        
        const { data, error: fetchError } = await query
        
        if (fetchError) throw fetchError
        setOrders(data || [])
      } catch (err: any) {
        console.error('Error fetching orders:', err)
        setError(err.message || 'Failed to load orders')
        toast.error('Failed to load orders')
      } finally {
        setDataLoading(false)
      }
    }
    
    if (user) {
      fetchOrders()
    }
  }, [user, supabase, statusFilter, sortField, sortDirection])
  
  const handleSort = (field: string) => {
    if (field === sortField) {
      // Toggle sort direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Default to descending for new sort field
      setSortField(field)
      setSortDirection('desc')
    }
  }
  
  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      setIsUpdating(orderId)
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
      
      if (error) throw error
      
      // Update local state to reflect the change
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus, updated_at: new Date().toISOString() } : order
      ))
      
      toast.success(`Order status updated to ${newStatus}`)
    } catch (err: any) {
      console.error('Error updating order status:', err)
      toast.error('Failed to update order status: ' + err.message)
    } finally {
      setIsUpdating(null)
    }
  }
  
  const showCustomerDetails = (order: Order) => {
    setSelectedCustomer(order)
    setShowCustomerModal(true)
  }
  
  const closeCustomerModal = () => {
    setShowCustomerModal(false)
    setTimeout(() => setSelectedCustomer(null), 300) // Clear data after animation completes
  }
  
  // Filtered orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    
    const searchLower = searchTerm.toLowerCase();
    return orders.filter(order => 
      order.order_number.toLowerCase().includes(searchLower) || 
      `${order.customer_first_name} ${order.customer_last_name}`.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower)
    );
  }, [orders, searchTerm]);
  
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-700 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-300 text-lg">Checking authentication...</p>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
          Orders Management
        </h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5 transform duration-200"
        >
          Back to Dashboard
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 animate-pulse">
          {error}
        </div>
      )}
      
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 shadow-md">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order #, customer name or email..."
            className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      
      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-700 rounded-full animate-spin mb-4"></div>
          <p className="ml-3 text-xl text-gray-300">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-gray-800/80 p-8 rounded-xl shadow-lg text-center border border-gray-700/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h3 className="text-xl font-medium text-gray-300 mb-2">No orders found</h3>
          <p className="text-gray-400">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'New orders will appear here.'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[768px] px-4 sm:px-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-gray-700/50">
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-700/80 transition-colors text-xs sm:text-sm" onClick={() => handleSort('order_number')}>
                      <div className="flex items-center">
                        Order Number
                        {sortField === 'order_number' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-700/80 transition-colors text-xs sm:text-sm" onClick={() => handleSort('customer_last_name')}>
                      <div className="flex items-center">
                        Customer
                        {sortField === 'customer_last_name' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-700/80 transition-colors text-xs sm:text-sm" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center">
                        Date
                        {sortField === 'created_at' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-700/80 transition-colors text-xs sm:text-sm" onClick={() => handleSort('total_amount')}>
                      <div className="flex items-center">
                        Amount
                        {sortField === 'total_amount' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-xs sm:text-sm">Status</th>
                    <th className="px-4 py-3 text-xs sm:text-sm">Email</th>
                    <th className="px-4 py-3 text-right text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-white text-xs sm:text-sm">#{order.order_number}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm">
                        <div 
                          className="font-medium cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1"
                          onClick={() => showCustomerDetails(order)}
                        >
                          {order.customer_first_name} {order.customer_last_name}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate max-w-[150px] sm:max-w-none">
                          {order.customer_email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs sm:text-sm whitespace-nowrap">
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                        <div className="text-[10px] text-gray-500 sm:hidden">
                          {format(new Date(order.created_at), 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-amber-500 text-xs sm:text-sm whitespace-nowrap">€{Number(order.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm">
                        <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                          order.status === 'paid' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : order.status === 'shipped'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : order.status === 'completed'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : order.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm">
                        <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                          order.emails_sent
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {order.emails_sent ? 'Sent' : 'Not Sent'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex flex-col sm:flex-row justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-[10px] sm:text-xs transition-colors shadow-sm hover:shadow-md"
                          >
                            View
                          </button>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            disabled={isUpdating === order.id}
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-[10px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="shipped">Shipped</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      
      {/* Customer Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeCustomerModal}>
          <div 
            className={`bg-gray-800 rounded-xl max-w-md w-full shadow-2xl border border-gray-700 transform transition-all duration-300 ${showCustomerModal ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-xl font-medium text-white">Customer Details</h3>
              <button onClick={closeCustomerModal} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Name</p>
                <p className="font-medium">{selectedCustomer.customer_first_name} {selectedCustomer.customer_last_name}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm mb-1">Email</p>
                <p className="font-medium break-all">{selectedCustomer.customer_email}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm mb-1">Address</p>
                <p className="font-medium">{selectedCustomer.customer_address}</p>
                <p>{selectedCustomer.customer_postal_code}, {selectedCustomer.customer_city}</p>
                <p>{selectedCustomer.customer_country}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm mb-1">Order Number</p>
                <p className="font-medium">#{selectedCustomer.order_number}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm mb-1">Order Date</p>
                <p className="font-medium">{format(new Date(selectedCustomer.created_at), 'MMMM dd, yyyy HH:mm')}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm mb-1">Order Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
                  selectedCustomer.status === 'paid' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : selectedCustomer.status === 'shipped'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : selectedCustomer.status === 'completed'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : selectedCustomer.status === 'cancelled'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}>
                  {selectedCustomer.status.charAt(0).toUpperCase() + selectedCustomer.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="border-t border-gray-700 p-4 flex justify-end space-x-3">
              <button 
                onClick={closeCustomerModal}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  closeCustomerModal();
                  router.push(`/dashboard/orders/${selectedCustomer.id}`);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
              >
                View Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 