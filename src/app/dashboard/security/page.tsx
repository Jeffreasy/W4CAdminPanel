'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import ErrorMessage from '../../../components/ui/ErrorMessage'
import { format, parseISO } from 'date-fns' // Import parseISO
import { nl } from 'date-fns/locale'

interface LoginAttempt {
  id: string
  attempted_at: string
  email_attempted: string
  is_successful: boolean
  ip_address: string | null
  user_agent: string | null
  failure_reason: string | null
  user_id: string | null
}

export default function SecurityLogsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const supabase = createClientComponentClient()
  const [logs, setLogs] = useState<LoginAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const itemsPerPage = 20

  async function fetchLogs(currentPage: number) {
    setLoading(true)
    setError(null)
    try {
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error: fetchError, count } = await supabase
        .from('login_attempts')
        .select('*', { count: 'exact' }) // Vraag het totaal aantal op
        .order('attempted_at', { ascending: false }) // Nieuwste eerst
        .range(from, to)

      if (fetchError) {
         // Controleer specifiek op RLS/policy fout
        if (fetchError.code === '42501') {
          throw new Error('Access Denied. You might not have permission to view these logs. Please contact support.')
        }
        throw fetchError
      }

      if (currentPage === 1) {
        setLogs(data || [])
      } else {
        setLogs(prevLogs => [...prevLogs, ...(data || [])])
      }

      // Bepaal of er meer logs zijn
      setHasMore((count ?? 0) > currentPage * itemsPerPage)

    } catch (err: any) {
      console.error('Error fetching login attempts:', err)
      setError(err.message || 'Failed to load login attempts')
      setLogs([]) // Leegmaken bij fout
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchLogs(page)
    }
  }, [user, page]) // Haal opnieuw op als pagina verandert

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prevPage => prevPage + 1)
    }
  }

  // Functie om tijd te formatteren (vereenvoudigd)
  const formatLogTimestamp = (timestamp: string): string => {
    try {
      // Gebruik parseISO omdat de timestamp uit Supabase een ISO string is
      return format(parseISO(timestamp), 'd MMM yyyy, HH:mm:ss', { locale: nl })
    } catch (e) {
      return 'Invalid Date'
    }
  }

  if (authLoading) {
    return <LoadingSpinner message="Authenticating..." centered />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security - Login Attempts</h1>

      {error && <ErrorMessage message={error} variant="warning" />}

      <div className="bg-gray-800/80 rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-700/50">
              <tr className="text-left text-xs sm:text-sm">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Success</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Reason/User ID</th>
                {/* <th className="px-4 py-3">User Agent</th> */}
              </tr>
            </thead>
            <tbody>
              {!loading && logs.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No login attempts found.
                  </td>
                </tr>
              )}
              {logs.map(log => (
                <tr key={log.id} className="border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-3 text-xs sm:text-sm whitespace-nowrap text-gray-300">
                    {formatLogTimestamp(log.attempted_at)}
                  </td>
                  <td className="px-4 py-3 text-xs sm:text-sm text-white">{log.email_attempted}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-3 h-3 rounded-full ${log.is_successful ? 'bg-green-500' : 'bg-red-500'}`}
                          title={log.is_successful ? 'Successful' : 'Failed'}>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs sm:text-sm text-gray-400 font-mono">{log.ip_address || 'N/A'}</td>
                  <td className="px-4 py-3 text-xs sm:text-sm text-gray-400">
                    {log.is_successful
                      ? <span title={log.user_id || 'N/A'} className="text-green-400 truncate">Success (User ID: {log.user_id?.substring(0, 8)}...)</span>
                      : <span className="text-red-400 truncate" title={log.failure_reason || ''}>{log.failure_reason || 'Unknown Reason'}</span>
                    }
                  </td>
                   {/* <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[150px]" title={log.user_agent || ''}>{log.user_agent}</td> */}
                </tr>
              ))}
              {loading && page > 1 && (
                 <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-400">
                    <LoadingSpinner message="Loading more logs..." size="small" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
         {hasMore && !loading && (
          <div className="p-4 text-center border-t border-gray-700/30">
            <button onClick={loadMore} className="btn-secondary">
              Load More
            </button>
          </div>
        )}
         {!hasMore && logs.length > 0 && (
           <div className="p-4 text-center text-gray-500 text-sm border-t border-gray-700/30">
             End of logs.
           </div>
         )}
      </div>
    </div>
  )
} 