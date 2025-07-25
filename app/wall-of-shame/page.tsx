"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { XCircle } from "lucide-react"
import { sleep } from "@/lib/utils"

interface WashTradedCollection {
  collection_name: string
  contract_address: string
  washtrade_volume_usd: number
  washtrade_assets: number
  washtrade_percentage: number
}

interface WashTradedNft {
  collection_name: string
  token_id: string
  image_url?: string
  washtrade_volume_usd: number
  washtrade_transactions: number
  contract_address: string
}

const formatCurrency = (value: number) => {
  if (!value) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function WallOfShamePage() {
  const [collections, setCollections] = useState<WashTradedCollection[]>([])
  const [nfts, setNfts] = useState<WashTradedNft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApiData = useCallback(async (endpoint: string, params?: any) => {
    const maxRetries = 3
    let attempt = 0
    while (attempt < maxRetries) {
      try {
        const res = await fetch("/api/bitscrunch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, params }),
        })
        if (res.status === 429) {
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`Rate limit hit for ${endpoint}. Retrying in ${delay}ms...`)
          await sleep(delay)
          attempt++
          continue
        }
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || `API Error: ${res.statusText}`)
        }
        const data = await res.json()
        return data.data
      } catch (error) {
        attempt++
        if (attempt >= maxRetries) throw error
      }
    }
  }, [])

  useEffect(() => {
    const fetchWashTradeData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [collectionsData, nftsData] = await Promise.all([
          fetchApiData("/nft/collection/washtrade", {
            sort_by: "washtrade_volume_usd",
            sort_order: "desc",
            limit: 10,
          }),
          fetchApiData("/nft/washtrade", {
            sort_by: "washtrade_volume_usd",
            sort_order: "desc",
            limit: 10,
          }),
        ])

        setCollections(collectionsData || [])
        setNfts(nftsData || [])
      } catch (err: any) {
        setError(`Failed to load wash trading data: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchWashTradeData()
  }, [fetchApiData])

  const renderSkeletons = (count: number) => (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">NFT WALL OF SHAME</h1>
          <p className="text-sm text-neutral-400">Highlighting collections and tokens with high wash trading activity</p>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Top Wash-Traded Collections</h2>
            {renderSkeletons(5)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Top Wash-Traded NFTs</h2>
            {renderSkeletons(5)}
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-500 mt-4 text-center flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <XCircle className="w-5 h-5 mr-2" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Collections Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Top Wash-Traded Collections</h2>
            {collections.length > 0 ? (
              collections.map((collection, index) => (
                <Card
                  key={collection.contract_address}
                  className="bg-neutral-900 border-neutral-800 hover:border-red-500/50 transition-colors"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="text-2xl font-bold text-neutral-600">#{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{collection.collection_name}</p>
                      <p className="text-xs text-neutral-500 font-mono truncate">{collection.contract_address}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-red-400 font-mono">
                        {formatCurrency(collection.washtrade_volume_usd)}
                      </p>
                      <p className="text-xs text-neutral-400">{collection.washtrade_assets} assets</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-neutral-500">No wash-traded collections found.</p>
            )}
          </div>

          {/* NFTs Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Top Wash-Traded NFTs</h2>
            {nfts.length > 0 ? (
              nfts.map((nft, index) => (
                <Card
                  key={`${nft.contract_address}-${nft.token_id}`}
                  className="bg-neutral-900 border-neutral-800 hover:border-red-500/50 transition-colors"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <img
                      src={nft.image_url || "/placeholder.svg"}
                      alt={`${nft.collection_name} #${nft.token_id}`}
                      className="w-12 h-12 rounded-md object-cover border border-neutral-700 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{nft.collection_name}</p>
                      <p className="text-xs text-neutral-400 font-mono">Token ID: {nft.token_id}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-red-400 font-mono">
                        {formatCurrency(nft.washtrade_volume_usd)}
                      </p>
                      <p className="text-xs text-neutral-400">{nft.washtrade_transactions} transactions</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-neutral-500">No wash-traded NFTs found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}