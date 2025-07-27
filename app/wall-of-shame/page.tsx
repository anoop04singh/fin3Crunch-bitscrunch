"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { XCircle, Loader2, BarChart4, X } from "lucide-react"
import { sleep, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedSection } from "@/components/animated-section"

// Interfaces
interface WashTradedCollection {
  collection_name: string
  contract_address: string
  washtrade_volume: number
  washtrade_assets: number
  washtrade_percentage: number
}

interface WashTradedNft {
  collection_name: string
  token_id: string
  image_url?: string
  washtrade_volume: number
  washtrade_transactions: number
  contract_address: string
}

interface DetailedWashTradeData {
  trends?: { date: string; [key: string]: any }[]
  metrics?: any
  metadata?: any
}

// Helper Functions
const formatCurrency = (value: number) => {
  if (!value) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const getRankClass = (index: number) => {
  switch (index) {
    case 0:
      return "border-yellow-400/50 hover:border-yellow-400"
    case 1:
      return "border-gray-400/50 hover:border-gray-400"
    case 2:
      return "border-orange-400/50 hover:border-orange-400"
    default:
      return "border-neutral-800 hover:border-red-500/50"
  }
}

const parseTrendData = (data: any): { date: string; [key: string]: any }[] => {
  try {
    const parse = (str: string | null | undefined) => {
      if (!str || typeof str !== "string" || str.length <= 2) return []
      return str
        .slice(1, -1)
        .split(",")
        .map((s) => s.replace(/"/g, "").trim())
    }
    const dates = parse(data.block_dates)
    if (dates.length === 0) return []

    const trends: { [key: string]: number[] } = {
      volume: parse(data.washtrade_volume_trend).map(Number),
      assets: parse(data.washtrade_assets_trend).map(Number),
      sales: parse(data.washtrade_suspect_sales_trend).map(Number),
      wallets: parse(data.washtrade_wallets_trend).map(Number),
    }

    return dates.map((date, i) => ({
      date: new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      volume: trends.volume[i] || 0,
      assets: trends.assets[i] || 0,
      sales: trends.sales[i] || 0,
      wallets: trends.wallets[i] || 0,
    }))
  } catch (e) {
    console.error("Error parsing trend data:", e)
    return []
  }
}

export default function WallOfShamePage() {
  const [collections, setCollections] = useState<WashTradedCollection[]>([])
  const [nfts, setNfts] = useState<WashTradedNft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedItem, setSelectedItem] = useState<WashTradedCollection | WashTradedNft | null>(null)
  const [detailedData, setDetailedData] = useState<DetailedWashTradeData | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

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
          await sleep(delay)
          attempt++
          continue
        }
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || `API Error: ${res.statusText}`)
        }
        return (await res.json()).data
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
          fetchApiData("/nft/collection/washtrade", { sort_by: "washtrade_volume", sort_order: "desc", limit: 10 }),
          fetchApiData("/nft/washtrade", { sort_by: "washtrade_volume", sort_order: "desc", limit: 10 }),
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

  const handleItemClick = async (item: WashTradedCollection | WashTradedNft) => {
    setSelectedItem(item)
    setLoadingDetails(true)
    setDetailedData(null)
    try {
      let washTradeData
      let metadata
      if ("washtrade_assets" in item) {
        // It's a collection
        ;[washTradeData, metadata] = await Promise.all([
          fetchApiData("/nft/collection/washtrade", {
            contract_address: item.contract_address,
            time_range: "24h",
            sort_by: "washtrade_volume",
          }),
          fetchApiData("/nft/collection/metadata", {
            contract_address: item.contract_address,
          }),
        ])
        const trends = washTradeData?.[0] ? parseTrendData(washTradeData[0]) : []
        setDetailedData({ trends, metrics: washTradeData?.[0], metadata: metadata?.[0] })
      } else {
        // It's an NFT
        ;[washTradeData, metadata] = await Promise.all([
          fetchApiData("/nft/washtrade", {
            contract_address: item.contract_address,
            token_id: item.token_id,
            sort_by: "washtrade_volume",
          }),
          fetchApiData("/nft/metadata", {
            contract_address: item.contract_address,
            token_id: item.token_id,
          }),
        ])
        setDetailedData({ metrics: washTradeData?.[0], metadata: metadata?.[0] })
      }
    } catch (err: any) {
      setError(`Failed to load details: ${err.message}`)
    } finally {
      setLoadingDetails(false)
    }
  }

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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  }

  return (
    <div className="p-6 space-y-6">
      <AnimatedSection>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">NFT WALL OF SHAME</h1>
            <p className="text-sm text-neutral-400">Highlighting collections and tokens with high wash trading activity</p>
          </div>
        </div>
      </AnimatedSection>

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

      {error && !loading && (
        <div className="text-red-500 mt-4 text-center flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <XCircle className="w-5 h-5 mr-2" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedSection delay={0.1} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Top Wash-Traded Collections</h2>
            {collections.length > 0 ? (
              collections.map((collection, index) => (
                <motion.div key={collection.contract_address} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={cardVariants}>
                  <Card
                    className={cn(
                      "bg-neutral-900 border-2 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]",
                      getRankClass(index),
                    )}
                    onClick={() => handleItemClick(collection)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="text-2xl font-bold text-neutral-600">#{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{collection.collection_name}</p>
                        <p className="text-xs text-neutral-500 font-mono truncate">{collection.contract_address}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-red-400 font-mono">
                          {formatCurrency(collection.washtrade_volume)}
                        </p>
                        <p className="text-xs text-neutral-400">{collection.washtrade_assets} assets</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <p className="text-neutral-500">No wash-traded collections found.</p>
            )}
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Top Wash-Traded NFTs</h2>
            {nfts.length > 0 ? (
              nfts.map((nft, index) => (
                <motion.div key={`${nft.contract_address}-${nft.token_id}`} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={cardVariants}>
                  <Card
                    className={cn(
                      "bg-neutral-900 border-2 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]",
                      getRankClass(index),
                    )}
                    onClick={() => handleItemClick(nft)}
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
                          {formatCurrency(nft.washtrade_volume)}
                        </p>
                        <p className="text-xs text-neutral-400">{nft.washtrade_transactions} transactions</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <p className="text-neutral-500">No wash-traded NFTs found.</p>
            )}
          </AnimatedSection>
        </div>
      )}

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-4xl"
            >
              <Card className="bg-neutral-900 border-neutral-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-neutral-900 z-10 p-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-white tracking-wider">
                      Wash Trade Details: {selectedItem.collection_name}
                      {"token_id" in selectedItem && ` #${selectedItem.token_id}`}
                    </CardTitle>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedItem(null)} className="text-neutral-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {detailedData?.metadata && (
                        <AnimatedSection delay={0.1}>
                          <Card className="bg-neutral-800/50 border-neutral-700">
                            <CardContent className="p-4 flex flex-col md:flex-row items-start gap-4">
                              <img
                                src={
                                  detailedData.metadata.image_url ||
                                  ("image_url" in selectedItem && selectedItem.image_url) ||
                                  "/placeholder.svg"
                                }
                                alt={detailedData.metadata.collection_name || selectedItem.collection_name}
                                className="w-full md:w-32 h-auto md:h-32 rounded-lg object-cover border border-neutral-700"
                              />
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white">
                                  {detailedData.metadata.collection_name || selectedItem.collection_name}
                                </h3>
                                <p className="text-sm text-neutral-400 leading-relaxed mt-2">
                                  {detailedData.metadata.description || "No description available."}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </AnimatedSection>
                      )}

                      <AnimatedSection delay={0.2}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-xs text-neutral-400">Wash Trade Volume</p>
                            <p className="text-xl font-bold text-red-400 font-mono">
                              {formatCurrency(detailedData?.metrics?.washtrade_volume ?? 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-400">Wash Traded Assets</p>
                            <p className="text-xl font-bold text-white font-mono">
                              {detailedData?.metrics?.washtrade_assets ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-400">Suspect Sales</p>
                            <p className="text-xl font-bold text-white font-mono">
                              {detailedData?.metrics?.washtrade_suspect_sales ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-400">Involved Wallets</p>
                            <p className="text-xl font-bold text-white font-mono">
                              {detailedData?.metrics?.washtrade_wallets ?? "N/A"}
                            </p>
                          </div>
                        </div>
                      </AnimatedSection>

                      {detailedData?.trends && detailedData.trends.length > 0 && (
                        <AnimatedSection delay={0.3}>
                          <Card className="bg-neutral-800/50 border-neutral-700">
                            <CardHeader>
                              <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
                                <BarChart4 className="w-4 h-4" /> 24-Hour Wash Trade Trends
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                              {["volume", "assets", "sales", "wallets"].map((key) => (
                                <div key={key}>
                                  <h3 className="text-sm font-medium text-white mb-2 capitalize">{key} Trend</h3>
                                  <ChartContainer config={{}} className="h-[150px] w-full">
                                    <ResponsiveContainer>
                                      <LineChart data={detailedData.trends} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Line type="monotone" dataKey={key} stroke="hsl(var(--chart-4))" dot={false} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </ChartContainer>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </AnimatedSection>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}