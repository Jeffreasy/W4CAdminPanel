'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { CldImage } from 'next-cloudinary'
import { toast } from 'react-hot-toast'

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  created_at: string
  product?: {
    name: string
    image: string
  }
}

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
  items?: OrderItem[]
}

export default function OrderDetails({ params }: { params: { id: string } }) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prevOrder, setPrevOrder] = useState<string | null>(null)
  const [nextOrder, setNextOrder] = useState<string | null>(null)
  
  // Fetch order details
  useEffect(() => {
    async function fetchOrderDetails() {
      try {
        setDataLoading(true)
        setError(null)
        
        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', params.id)
          .single()
        
        if (orderError) throw orderError
        
        // Fetch order items
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', params.id)
        
        if (itemsError) throw itemsError
        
        // Fetch product details for each item
        const itemsWithProducts = await Promise.all(
          itemsData.map(async (item) => {
            const { data: productData, error: productError } = await supabase
              .from('products')
              .select('name, image')
              .eq('id', item.product_id)
              .single()
            
            if (productError) {
              console.error('Error fetching product:', productError)
              return { ...item, product: { name: 'Unknown Product', image: '' } }
            }
            
            return { ...item, product: productData }
          })
        )
        
        // Fetch adjacent orders for navigation
        const { data: allOrders, error: allOrdersError } = await supabase
          .from('orders')
          .select('id, order_number')
          .order('created_at', { ascending: false })
        
        if (allOrdersError) throw allOrdersError
        
        if (allOrders && allOrders.length > 0) {
          const currentIndex = allOrders.findIndex(o => o.id === params.id);
          
          if (currentIndex > 0) {
            setPrevOrder(allOrders[currentIndex - 1].id);
          } else {
            setPrevOrder(null);
          }
          
          if (currentIndex < allOrders.length - 1) {
            setNextOrder(allOrders[currentIndex + 1].id);
          } else {
            setNextOrder(null);
          }
        }
        
        setOrder(orderData)
        setOrderItems(itemsWithProducts)
      } catch (err: any) {
        console.error('Error fetching order details:', err)
        setError(err.message || 'Failed to load order details')
        toast.error('Failed to load order details')
      } finally {
        setDataLoading(false)
      }
    }
    
    if (user && params.id) {
      fetchOrderDetails()
    }
  }, [user, params.id, supabase])
  
  async function updateOrderStatus(newStatus: string) {
    try {
      setIsSubmitting(true)
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', params.id)
      
      if (error) throw error
      
      // Update local state
      if (order) {
        setOrder({ ...order, status: newStatus, updated_at: new Date().toISOString() })
      }
      
      toast.success(`Order status updated to ${newStatus}`)
    } catch (err: any) {
      console.error('Error updating order status:', err)
      toast.error('Failed to update order status: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  async function resendOrderEmails() {
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/orders/send-emails-wfc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId: params.id,
          customer: {
            name: `${order?.customer_first_name} ${order?.customer_last_name}`,
            email: order?.customer_email,
            address: order?.customer_address,
            city: order?.customer_city,
            postalCode: order?.customer_postal_code,
            country: order?.customer_country
          }
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to send emails')
      }
      
      // Update order to mark emails as sent
      const { error } = await supabase
        .from('orders')
        .update({ emails_sent: true })
        .eq('id', params.id)
      
      if (error) throw error
      
      // Update local state
      if (order) {
        setOrder({ ...order, emails_sent: true })
      }
      
      toast.success('Confirmation emails sent successfully')
    } catch (err: any) {
      console.error('Error sending emails:', err)
      toast.error('Failed to send emails: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Calculate total items and total quantity
  const orderSummary = useMemo(() => {
    if (!orderItems.length) return { totalItems: 0, totalQuantity: 0 };
    
    const totalItems = orderItems.length;
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    
    return { totalItems, totalQuantity };
  }, [orderItems]);
  
  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-700 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-300 text-lg">
          {authLoading ? 'Checking authentication...' : 'Loading order details...'}
        </p>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }
  
  if (!order) {
    return (
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
            Order Not Found
          </h1>
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5 transform duration-200"
          >
            Back to Orders
          </button>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 animate-pulse">
          {error || 'Order not found or you do not have permission to view it.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
          Order #{order.order_number}
        </h1>
        <button
          onClick={() => router.push('/dashboard/orders')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5 transform duration-200"
        >
          Back to Orders
        </button>
      </div>
      
      {/* Order Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => prevOrder && router.push(`/dashboard/orders/${prevOrder}`)}
          disabled={!prevOrder}
          className={`px-3 py-2 rounded text-sm transition-colors ${
            prevOrder 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </span>
        </button>
        
        <span className="text-gray-400 text-xs sm:text-sm">
          {!dataLoading && order && (
            <>Order ID: <span className="text-gray-300 font-mono text-xs">{params.id}</span></>
          )}
        </span>
        
        <button
          onClick={() => nextOrder && router.push(`/dashboard/orders/${nextOrder}`)}
          disabled={!nextOrder}
          className={`px-3 py-2 rounded text-sm transition-colors ${
            nextOrder 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center">
            Next
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 animate-pulse">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 sm:p-6 rounded-xl shadow-lg md:col-span-2 border border-gray-700/50">
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
            Order Details
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-3 sm:gap-x-4 mb-6 sm:mb-8">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Date</p>
              <p className="font-medium text-sm sm:text-base">{format(new Date(order.created_at), 'MMMM dd, yyyy')}</p>
              <p className="text-xs text-gray-400">{format(new Date(order.created_at), 'HH:mm:ss')}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs ${
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
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Total Amount</p>
              <p className="text-lg sm:text-xl font-bold text-amber-500">€{Number(order.total_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Emails</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  order.emails_sent
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {order.emails_sent ? 'Sent' : 'Not Sent'}
                </span>
                {!order.emails_sent && (
                  <button
                    onClick={resendOrderEmails}
                    disabled={isSubmitting}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Now'}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 my-4 sm:my-6 pt-4 sm:pt-6">
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Order Items ({orderSummary.totalItems} items, {orderSummary.totalQuantity} total quantities)</h3>
            
            {orderItems.length === 0 ? (
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 text-center">
                <p className="text-gray-400">No items found for this order</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-700/50 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 relative bg-gray-900/50 rounded-lg overflow-hidden flex-shrink-0">
                      {item.product?.image ? (
                        <CldImage
                          src={item.product.image}
                          alt={item.product?.name || 'Product'}
                          fill
                          sizes="(max-width: 768px) 80px, 100px"
                          className="object-contain p-2"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow text-center sm:text-left">
                      <h4 className="font-medium text-sm sm:text-base line-clamp-2">{item.product?.name || 'Unknown Product'}</h4>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-4 mt-2">
                        <p className="text-xs sm:text-sm text-gray-400">Quantity: <span className="text-white font-medium">{item.quantity}</span></p>
                        <p className="text-xs sm:text-sm text-gray-400">Price: <span className="text-amber-500 font-medium">€{Number(item.price).toFixed(2)}</span></p>
                        <p className="text-xs sm:text-sm text-gray-400">Subtotal: <span className="text-amber-500 font-medium">€{(item.quantity * item.price).toFixed(2)}</span></p>
                      </div>
                    </div>
                    
                    {item.product_id && (
                      <button
                        onClick={() => router.push(`/dashboard/products/${item.product_id}`)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs transition-colors shadow-sm hover:shadow-md flex-shrink-0"
                      >
                        View Product
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-6 border-t border-gray-700 pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-3">
              <div className="w-full sm:w-auto order-2 sm:order-1">
                <button
                  onClick={() => router.push('/dashboard/orders')}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors shadow-md"
                >
                  Back to Orders
                </button>
              </div>
              <div className="w-full sm:w-auto order-1 sm:order-2">
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700/50">
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Customer Details
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Name</p>
                <p className="font-medium text-sm sm:text-base">{order.customer_first_name} {order.customer_last_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Email</p>
                <p className="font-medium text-sm sm:text-base break-all">{order.customer_email}</p>
              </div>
              <div className="border-t border-gray-700 pt-3 sm:pt-4">
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Shipping Address</p>
                <p className="font-medium text-sm sm:text-base">{order.customer_address}</p>
                <p className="text-sm">{order.customer_postal_code}, {order.customer_city}</p>
                <p className="text-sm">{order.customer_country}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700/50">
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Payment Information
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Status</p>
                <p className="font-medium">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.status === 'paid' || order.status === 'completed' || order.status === 'shipped'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : order.status === 'cancelled'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {order.status === 'paid' || order.status === 'completed' || order.status === 'shipped'
                      ? 'Payment Completed'
                      : order.status === 'cancelled'
                      ? 'Payment Cancelled'
                      : 'Payment Pending'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Total Amount</p>
                <p className="text-lg sm:text-xl font-bold text-amber-500">€{Number(order.total_amount).toFixed(2)}</p>
              </div>
              {order.payment_reference && (
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-1">Payment Reference</p>
                  <p className="font-mono text-xs sm:text-sm break-all bg-gray-900/50 p-2 rounded border border-gray-700">
                    {order.payment_reference}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 