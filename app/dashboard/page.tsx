"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, XCircle, ImageIcon } from "lucide-react"
import { useAppContext } from "@/app/context/AppContext"
import { sleep } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedSection } from "@/components/animated-section"

interface NftHolding {
  blockchain: string
  chain_id: string
  contract_address: string
  collection_name: string
  nft_contract_type: string
  token_id: string
  quantity: number
  image_url?: string
}

interface Erc20Holding {
  token_name: string
  token_symbol: string
  token_decimal: number
  quantity: number
  blockchain_name: string
  chain_id: string
  usd_value?: number
  token_address?: string
}

interface WalletScore {
  wallet_address: string
  anomalous_pattern_score: number
  associated_token_score: number
  risk_interaction_score: number
  wallet_age_score: number
  wallet_score: number
  classification: string
  centralized_interaction_score?: number
  chain_id?: number
  classification_type?: string
  frequency_score?: number
  illicit?: string
  smart_contract_interaction_score?: number
  staking_governance_interaction_score?: number
  volume_score?: number
}

interface NftMetadata {
  collection_name: string
  description: string
  image_url: string
  token_id: string
  contract_address: string
  blockchain: string
  rarity_score?: number
  price_estimate_usd?: number
  attributes?: Array<{ trait_type: string; value: string }>
}

export default function CommandCenterPage() {
  const { walletAddress } = useAppContext()
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [nftHoldings, setNftHoldings] = useState<NftHolding[]>([])
  const [erc20Holdings, setErc20Holdings] = useState<Erc20Holding[]>([])
  const [walletScore, setWalletScore] = useState<WalletScore | null>(null)
  const [totalAssetsValue, setTotalAssetsValue] = useState<number>(0)

  const [selectedNft, setSelectedNft] = useState<NftHolding | null>(null)
  const [nftMetadata, setNftMetadata] = useState<NftMetadata | null>(null)
  const [loadingNftMetadata, setLoadingNftMetadata] = useState(false)
  const [nftMetadataError, setNftMetadataError] = useState<string | null>(null)

  const fetchApiData = useCallback(async (endpoint: string, walletAddress: string, params?: any) => {
    const maxRetries = 5
    let currentRetry = 0
    let delay = 1000 // Initial delay of 1 second

    while (currentRetry < maxRetries) {
      try {
        const res = await fetch("/api/bitscrunch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, walletAddress, params }),
        })
        const data = await res.json()

        if (res.status === 429) {
          console.warn(
            `Rate limit hit for ${endpoint}. Retrying in ${delay}ms... (Attempt ${currentRetry + 1}/${maxRetries})`,
          )
          await sleep(delay)
          delay *= 2 // Exponential backoff
          currentRetry++
          continue // Try again
        }

        if (!res.ok) {
          console.error(`Failed to fetch ${endpoint}:`, data.error)
          throw new Error(data.error || `Failed to fetch ${endpoint}`)
        }
        return data.data
      } catch (error) {
        if (currentRetry < maxRetries - 1) {
          console.warn(
            `Error fetching ${endpoint}: ${error}. Retrying in ${delay}ms... (Attempt ${
              currentRetry + 1
            }/${maxRetries})`,
          )
          await sleep(delay)
          delay *= 2
          currentRetry++
        } else {
          throw error // Re-throw if max retries reached
        }
      }
    }
    throw new Error(`Failed to fetch ${endpoint} after ${maxRetries} retries.`)
  }, [])

  const fetchWalletData = useCallback(
    async (address: string) => {
      setIsFetchingData(true)
      setFetchError(null)
      try {
        const [nftHoldingsData, erc20HoldingsData, scoreData] = await Promise.all([
          fetchApiData("/wallet/balance/nft", address),
          fetchApiData("/wallet/balance/token", address),
          fetchApiData("/wallet/score", address),
        ])

        setNftHoldings(Array.isArray(nftHoldingsData) ? nftHoldingsData : [])
        setWalletScore(Array.isArray(scoreData) && scoreData.length > 0 ? scoreData[0] : null)

        const tokens: Erc20Holding[] = Array.isArray(erc20HoldingsData) ? erc20HoldingsData : []
        if (tokens.length > 0) {
          const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
          const tokenAddresses = tokens.map((token) => {
            if (!token.token_address || token.token_address.startsWith("0x0000000000000000000000000000000000000000")) {
              return WETH_ADDRESS
            }
            return token.token_address
          })

          const priceData = await fetchApiData("/token/dex_price", address, {
            token_address: tokenAddresses.join(","),
            blockchain: "ethereum",
          })

          const priceMap = new Map<string, number>()
          if (priceData && Array.isArray(priceData)) {
            priceData.forEach((priceInfo: any) => {
              priceMap.set(priceInfo.token_address.toLowerCase(), priceInfo.usd_value)
            })
          }

          let calculatedTotalValue = 0
          const updatedErc20Holdings = tokens.map((token) => {
            const addressToLookup = (
              !token.token_address || token.token_address.startsWith("0x0000000000000000000000000000000000000000")
                ? WETH_ADDRESS
                : token.token_address
            ).toLowerCase()

            const price = priceMap.get(addressToLookup)
            const usdValue = price ? token.quantity * price : 0
            calculatedTotalValue += usdValue
            return { ...token, usd_value: usdValue }
          })

          setErc20Holdings(updatedErc20Holdings)
          setTotalAssetsValue(calculatedTotalValue)
        } else {
          setErc20Holdings([])
          setTotalAssetsValue(0)
        }
      } catch (err: any) {
        setFetchError(`Failed to load data: ${err.message || "Unknown error"}`)
      } finally {
        setIsFetchingData(false)
      }
    },
    [fetchApiData],
  )

  const fetchNftMetadata = async (contractAddress: string, tokenId: string) => {
    setLoadingNftMetadata(true)
    setNftMetadataError(null)
    setNftMetadata(null)
    try {
      const data = await fetchApiData(
        "/nft/metadata",
        walletAddress || "0xDummyAddress",
        { contract_address: contractAddress, token_id: tokenId, blockchain: "ethereum" },
      )
      setNftMetadata(data?.[0] || null)
    } catch (err: any) {
      setNftMetadataError(`Failed to load NFT details: ${err.message || "Unknown error"}`)
    } finally {
      setLoadingNftMetadata(false)
    }
  }

  useEffect(() => {
    if (walletAddress) {
      fetchWalletData(walletAddress)
    }
  }, [walletAddress, fetchWalletData])

  return (
    <div className="p-6 space-y-12">
      {!walletAddress ? (
        <AnimatedSection>
          <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
            <Wallet className="w-16 h-16 text-neutral-700 mb-4" />
            <h2 className="text-2xl font-bold text-white">Dashboard Locked</h2>
            <p className="text-neutral-400 mt-2 max-w-sm">
              Please connect your wallet using the button in the top bar to view your personalized dashboard and
              holdings.
            </p>
          </div>
        </AnimatedSection>
      ) : (
        <>
          {isFetchingData && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-teal-200" />
              <span className="ml-3 text-neutral-400">Loading wallet data...</span>
            </div>
          )}

          {fetchError && !isFetchingData && (
            <div className="text-red-500 mt-4 text-center flex items-center justify-center">
              <XCircle className="w-5 h-5 mr-2" /> {fetchError}
            </div>
          )}

          {!isFetchingData && !fetchError && (
            <div className="space-y-16">
              <AnimatedSection delay={0.1}>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-300 tracking-wider">TOTAL ASSET VALUE</p>
                  <div className="text-6xl font-bold text-white font-mono mt-2">${totalAssetsValue.toFixed(2)}</div>
                  <p className="text-neutral-500 text-sm mt-2">Aggregated value across token holdings</p>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.2}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center max-w-4xl mx-auto">
                  <div className="lg:col-span-1 flex flex-col items-center">
                    <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-4">WALLET SCORE</h3>
                    {walletScore ? (
                      <div className="relative w-40 h-40">
                        <div className="absolute inset-0 border-2 border-white rounded-full opacity-60 animate-pulse"></div>
                        <div className="absolute inset-2 border border-white rounded-full opacity-40"></div>
                        <div className="absolute inset-4 border border-white rounded-full opacity-20"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-teal-200">
                          {walletScore.wallet_score ? walletScore.wallet_score.toFixed(0) : "N/A"}
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-sm">Score not available.</p>
                    )}
                  </div>
                  <div className="lg:col-span-2 text-xs text-neutral-500 space-y-2 font-mono">
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span>Classification:</span>
                      <span className="text-white">{walletScore?.classification || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span>Anomalous Pattern:</span>
                      <span className="text-white">{walletScore?.anomalous_pattern_score.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span>Associated Token:</span>
                      <span className="text-white">{walletScore?.associated_token_score.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span>Risk Interaction:</span>
                      <span className="text-white">{walletScore?.risk_interaction_score.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wallet Age Score:</span>
                      <span className="text-white">{walletScore?.wallet_age_score.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.3}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">NFT Holdings ({nftHoldings.length})</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {nftHoldings.length > 0 ? (
                        nftHoldings.map((nft) => (
                          <div
                            key={`${nft.contract_address}-${nft.token_id}`}
                            className="flex items-center gap-3 p-2 bg-neutral-900/50 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedNft(nft)
                              fetchNftMetadata(nft.contract_address, nft.token_id)
                            }}
                          >
                            {nft.image_url ? (
                              <img
                                src={nft.image_url}
                                alt={nft.collection_name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-neutral-800 rounded flex items-center justify-center text-neutral-500">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm text-white font-mono truncate">{nft.collection_name}</div>
                              <div className="text-xs text-neutral-500">ID: {nft.token_id}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-neutral-500 text-sm">No NFTs found in this wallet.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      ERC20 Holdings ({erc20Holdings.length})
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {erc20Holdings.length > 0 ? (
                        erc20Holdings.map((token, index) => (
                          <div
                            key={index}
                            className="text-sm border-l-2 border-teal-500 pl-4 py-1"
                          >
                            <div className="text-neutral-400 font-mono">{token.token_symbol}</div>
                            <div className="text-white">
                              {token.quantity.toFixed(4)}{" "}
                              <span className="text-teal-300 font-mono">{token.token_name}</span>
                              {token.usd_value != null && <span> (~${token.usd_value.toFixed(2)})</span>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-neutral-500 text-sm">No ERC20 tokens found in this wallet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          )}

          <AnimatePresence>
            {selectedNft && (
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
                  className="w-full max-w-2xl"
                >
                  <Card className="bg-neutral-900 border-neutral-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-neutral-900 z-10 p-4">
                      <div>
                        <CardTitle className="text-xl font-bold text-white tracking-wider">
                          {nftMetadata?.collection_name || selectedNft.collection_name}
                        </CardTitle>
                        <p className="text-sm text-neutral-400 font-mono">Token ID: {selectedNft.token_id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSelectedNft(null)
                          setNftMetadata(null)
                          setNftMetadataError(null)
                        }}
                        className="text-neutral-400 hover:text-white"
                      >
                        ✕
                      </Button>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {loadingNftMetadata ? (
                        <div className="flex flex-col items-center justify-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin text-teal-200" />
                          <span className="ml-3 text-neutral-400 mt-2">Loading NFT details...</span>
                        </div>
                      ) : nftMetadataError ? (
                        <div className="text-red-500 text-center flex items-center justify-center py-10">
                          <XCircle className="w-5 h-5 mr-2" /> {nftMetadataError}
                        </div>
                      ) : nftMetadata ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col items-center">
                            {nftMetadata.image_url ? (
                              <img
                                src={nftMetadata.image_url}
                                alt={nftMetadata.collection_name}
                                className="w-full max-w-xs rounded object-cover border border-neutral-700"
                              />
                            ) : (
                              <div className="w-full max-w-xs h-48 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 text-sm border border-neutral-700">
                                No Image Available
                              </div>
                            )}
                            {nftMetadata.price_estimate_usd && (
                              <div className="mt-4 text-2xl font-bold text-white">
                                Est. Price: ${nftMetadata.price_estimate_usd.toFixed(2)}
                              </div>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">DESCRIPTION</h3>
                              <p className="text-sm text-neutral-300 leading-relaxed">
                                {nftMetadata.description || "No description available."}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">ATTRIBUTES</h3>
                              {Array.isArray(nftMetadata.attributes) && nftMetadata.attributes.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {nftMetadata.attributes.map((attr, idx) => (
                                    <div key={idx} className="bg-neutral-800 p-2 rounded">
                                      <span className="text-neutral-400">{attr.trait_type}:</span>{" "}
                                      <span className="text-white">{attr.value}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-neutral-500 text-xs">No attributes found.</p>
                              )}
                            </div>
                            {nftMetadata.rarity_score && (
                              <div>
                                <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">
                                  RARITY SCORE
                                </h3>
                                <p className="text-white font-mono text-lg">{nftMetadata.rarity_score.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-neutral-500 text-center py-10">No NFT metadata available.</p>
                      )}

                      <div className="flex gap-2 pt-4 border-t border-neutral-700">
                        {nftMetadata?.price_estimate_usd ? (
                          <Button className="bg-teal-200 hover:bg-teal-100 text-zinc-900">
                            View on Marketplace
                          </Button>
                        ) : (
                          <Button className="bg-red-500/20 text-red-500 cursor-not-allowed" disabled>
                            Not available on marketplace
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent"
                        >
                          Share NFT
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}