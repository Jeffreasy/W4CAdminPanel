import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { PostgrestError } from '@supabase/supabase-js'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

// Caching mechanism to avoid unnecessary requests
const cache: Record<string, { data: any; timestamp: number }> = {}
const CACHE_EXPIRY = 60000 // 1 minute in milliseconds

/**
 * Filter opties voor Supabase queries
 */
interface FilterOption {
  column: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'is' | 'in'
  value: any
}

/**
 * Order opties voor Supabase queries
 */
interface OrderOption {
  column: string
  ascending?: boolean
}

/**
 * Opties voor pagination
 */
interface PaginationOption {
  page: number
  pageSize: number
}

/**
 * Hook configuratie opties
 */
interface UseDataFetchingOptions<T> {
  /** Select specifieke kolommen (default: '*') */
  select?: string
  
  /** Filters voor de query */
  filters?: FilterOption[]
  
  /** Sortering voor de resultaten */
  order?: OrderOption[]
  
  /** Paginatie opties */
  pagination?: PaginationOption
  
  /** Automatisch data ophalen bij mount (default: true) */
  fetchOnMount?: boolean
  
  /** Cache gebruiken (default: true) */
  useCache?: boolean
  
  /** Data transformatie functie */
  transform?: (data: any[]) => T[]
  
  /** Callback bij succesvol ophalen */
  onSuccess?: (data: T[]) => void
  
  /** Callback bij fout */
  onError?: (error: Error) => void

  /** Relaties die moeten worden meegeladen */
  relations?: string[]
  
  /** Dependencies voor het opnieuw uitvoeren van de fetch */
  dependencies?: any[]
}

/**
 * Custom hook voor het fetchen van data van Supabase met error handling, loading states, en caching
 * 
 * @param tableName Naam van de Supabase tabel
 * @param options Configuratie opties voor de hook
 * @returns Object met data, loading state, error, en functies voor refetchen en CRUD operaties
 */
export function useDataFetching<T>(
  tableName: string, 
  options: UseDataFetchingOptions<T> = {}
) {
  // Opties met defaults
  const {
    select = '*',
    filters = [],
    order = [],
    pagination,
    fetchOnMount = true,
    useCache = true,
    transform = (data: any[]) => data as unknown as T[],
    onSuccess,
    onError,
    relations = [],
    dependencies = []
  } = options
  
  // State
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  
  // Gebruik de Supabase client
  const supabase = createClientComponentClient()
  
  /**
   * Bouwt een query op met filters, sortering en paginatie
   */
  const buildQuery = useCallback(() => {
    // Zorg dat tableName een string is (geen object)
    if (typeof tableName !== 'string') {
      throw new Error(`Invalid table name: ${JSON.stringify(tableName)}`)
    }
    
    let selectString = select
    if (relations && relations.length > 0) {
      selectString += ', ' + relations.join(', ')
    }
    
    let query = supabase
      .from(tableName)
      .select(selectString, { count: 'exact' })
    
    // Filters toepassen
    filters.forEach(filter => {
      query = applyFilter(query, filter)
    })
    
    // Sortering toepassen
    order.forEach(orderOption => {
      query = query.order(orderOption.column, { ascending: orderOption.ascending ?? true })
    })
    
    // Paginatie toepassen indien aanwezig
    if (pagination) {
      const { page, pageSize } = pagination
      const start = (page - 1) * pageSize
      const end = start + pageSize - 1
      query = query.range(start, end)
    }
    
    return query
  }, [tableName, select, filters, order, pagination, relations, supabase])
  
  /**
   * Helper functie om filters toe te passen op een Supabase query
   */
  const applyFilter = (
    query: PostgrestFilterBuilder<any, any, any>,
    filter: FilterOption
  ) => {
    const { column, operator, value } = filter
    
    switch (operator) {
      case 'eq':
        return query.eq(column, value)
      case 'neq':
        return query.neq(column, value)
      case 'gt':
        return query.gt(column, value)
      case 'lt':
        return query.lt(column, value)
      case 'gte':
        return query.gte(column, value)
      case 'lte':
        return query.lte(column, value)
      case 'like':
        return query.like(column, `%${value}%`)
      case 'ilike':
        return query.ilike(column, `%${value}%`)
      case 'is':
        return query.is(column, value)
      case 'in':
        return query.in(column, value)
      default:
        return query
    }
  }
  
  /**
   * Genereert een cache key op basis van query parameters
   */
  const getCacheKey = useCallback(() => {
    return `${tableName}:${select}:${JSON.stringify(filters)}:${JSON.stringify(order)}:${JSON.stringify(pagination)}:${JSON.stringify(relations)}`
  }, [tableName, select, filters, order, pagination, relations])
  
  /**
   * Data ophalen van Supabase
   */
  const fetchData = useCallback(async (skipCache = false) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Controleer of tableName een string is
      if (typeof tableName !== 'string') {
        throw new Error(`Invalid table name: ${JSON.stringify(tableName)}`)
      }
      
      const cacheKey = getCacheKey()
      
      // Check cache first if enabled
      if (useCache && !skipCache) {
        const cachedData = cache[cacheKey]
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
          setData(cachedData.data)
          onSuccess?.(cachedData.data)
          setIsLoading(false)
          return cachedData.data
        }
      }
      
      // Build and execute query
      const query = buildQuery()
      const { data: fetchedData, error: fetchError, count } = await query
      
      if (fetchError) {
        throw new Error(fetchError.message)
      }
      
      // Transform data if needed
      const transformedData = transform(fetchedData || [])
      
      // Update state
      setData(transformedData)
      if (count !== null) {
        setTotalCount(count)
      }
      
      // Update cache
      if (useCache) {
        cache[cacheKey] = {
          data: transformedData,
          timestamp: Date.now()
        }
      }
      
      // Call success callback
      onSuccess?.(transformedData)
      
      return transformedData
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Onbekende fout bij het ophalen van data')
      setError(error)
      onError?.(error)
      console.error('Error fetching data:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [
    tableName,
    buildQuery,
    getCacheKey,
    onError,
    onSuccess,
    transform,
    useCache
  ])
  
  /**
   * Item toevoegen aan de tabel
   */
  const createItem = useCallback(async (item: Partial<T>) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data: newItem, error: createError } = await supabase
        .from(tableName)
        .insert(item)
        .select()
      
      if (createError) {
        throw new Error(createError.message)
      }
      
      // Update local state
      if (newItem && newItem.length > 0) {
        const transformedNewItem = transform([newItem[0]])[0]
        setData(prevData => [...prevData, transformedNewItem])
        return transformedNewItem
      }
      
      // Invalidate cache
      const cacheKey = getCacheKey()
      delete cache[cacheKey]
      
      // Refetch to ensure data is up to date
      await fetchData(true)
      
      return null
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fout bij het aanmaken van het item')
      setError(error)
      onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [tableName, fetchData, getCacheKey, onError, transform, supabase])
  
  /**
   * Item updaten in de tabel
   */
  const updateItem = useCallback(async (id: string | number, updates: Partial<T>) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data: updatedItem, error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
      
      if (updateError) {
        throw new Error(updateError.message)
      }
      
      // Update local state
      if (updatedItem && updatedItem.length > 0) {
        const transformedUpdatedItem = transform([updatedItem[0]])[0]
        setData(prevData => 
          prevData.map(item => 
            (item as any).id === id ? transformedUpdatedItem : item
          )
        )
        return transformedUpdatedItem
      }
      
      // Invalidate cache
      const cacheKey = getCacheKey()
      delete cache[cacheKey]
      
      // Refetch to ensure data is up to date
      await fetchData(true)
      
      return null
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fout bij het updaten van het item')
      setError(error)
      onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [tableName, fetchData, getCacheKey, onError, transform, supabase])
  
  /**
   * Item verwijderen uit de tabel
   */
  const deleteItem = useCallback(async (id: string | number) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        throw new Error(deleteError.message)
      }
      
      // Update local state
      setData(prevData => prevData.filter(item => (item as any).id !== id))
      
      // Invalidate cache
      const cacheKey = getCacheKey()
      delete cache[cacheKey]
      
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fout bij het verwijderen van het item')
      setError(error)
      onError?.(error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [tableName, getCacheKey, onError, supabase])
  
  // Initial data fetch
  useEffect(() => {
    if (fetchOnMount) {
      fetchData()
    }
  }, [fetchOnMount, fetchData, ...dependencies])
  
  return {
    data,
    isLoading,
    error,
    totalCount,
    refetch: () => fetchData(true),
    createItem,
    updateItem,
    deleteItem
  }
}

// Remove default export to avoid duplicate exports 