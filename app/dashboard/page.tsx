"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, XCircle, CheckCircle, TrendingUp, ImageIcon } from "lucide-react"
import { useAppContext } from "@/app/context/AppContext"
import { sleep } from "@/lib/utils"

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
}

interface DefiHolding {
  token_value_usd: number
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
  const { walletAddress, setWalletAddress } = useAppContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nftHoldings, setNftHoldings] = useState<NftHolding[]>([])
  const [erc20Holdings, setErc20Holdings] = useState<Erc20Holding[]>([])
  const [defiHoldings, setDefiHoldings] = useState<DefiHolding[]>([])
  const [walletScore, setWalletScore] = useState<WalletScore | null>(null)

  const [selectedNft, setSelectedNft] = useState<NftHolding | null>(null)
  const [nftMetadata, setNftMetadata] = useState<NftMetadata | null>(null)
  const [loadingNftMetadata, setLoadingNftMetadata] = useState(false)
  const [nftMetadataError, setNftMetadataError] = useState<string | null>(null)

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        setLoading(true)
        setError(null)
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          console.log("Wallet connected:", accounts[0])
        } else {
          setError("No accounts found. Please ensure MetaMask has accounts.")
          console.error("MetaMask: No accounts found.")
        }
      } catch (err: any) {
        console.error("Error connecting to MetaMask:", err)
        setError(`Failed to connect wallet: ${err.message || "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    } else {
      setError("MetaMask is not installed. Please install it to connect your wallet.")
      console.error("MetaMask: Not installed.")
    }
  }

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
      setLoading(true)
      setError(null)
      try {
        const [nftHoldingsData, erc20HoldingsData, defiHoldingsData, scoreData] = await Promise.all([
          fetchApiData("/wallet/balance/nft", address),
          fetchApiData("/wallet/balance/token", address),
          fetchApiData("/token/balance", address),
          fetchApiData("/wallet/score", address),
        ])

        setNftHoldings(nftHoldingsData || [])
        console.log("Fetched NFT Holdings:", nftHoldingsData)

        setErc20Holdings(erc20HoldingsData || [])
        console.log("Fetched ERC20 Holdings:", erc20HoldingsData)

        setDefiHoldings(defiHoldingsData || [])
        console.log("Fetched DeFi Holdings (Token Balance):", defiHoldingsData)

        setWalletScore(scoreData?.[0] || null)
        console.log("Fetched Wallet Score:", scoreData?.[0])
      } catch (err: any) {
        console.error("Error fetching wallet data:", err)
        setError(`Failed to load data: ${err.message || "Unknown error"}`)
      } finally {
        setLoading(false)
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
        walletAddress || "0xDummyAddress", // walletAddress is not strictly required for /nft/metadata
        {
          contract_address: contractAddress,
          token_id: tokenId,
          blockchain: "ethereum",
        },
      )
      setNftMetadata(data?.[0] || null)
      console.log("Fetched NFT Metadata:", data?.[0])
    } catch (err: any) {
      console.error("Error fetching NFT metadata:", err)
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

  const totalAssetsValue = defiHoldings.reduce((sum, item: any) => sum + (item.token_value_usd || 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Wallet Connection Section */}
      {!walletAddress ? (
        <Card className="bg-card border-border shadow-md p-6 text-center">
          <CardTitle className="text-xl font-bold text-foreground mb-4">Connect Your Wallet</CardTitle>
          <p className="text-muted-foreground mb-6">
            Please connect your Ethereum wallet to view your NFT and Web3 analytics.
          </p>
          <Button onClick={connectWallet} disabled={loading} size="lg">
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wallet className="mr-2 h-5 w-5" />}
            {loading ? "Connecting..." : "Connect Wallet"}
          </Button>
          {error && (
            <p className="text-red-500 mt-4 text-sm flex items-center justify-center">
              <XCircle className="w-4 h-4 mr-2" /> {error}
            </p>
          )}
        </Card>
      ) : (
        <>
          <div className="text-muted-foreground text-sm mb-4">
            Connected Wallet: <span className="text-primary font-mono">{walletAddress}</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading wallet data...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-red-500 mt-4 text-center flex items-center justify-center">
              <XCircle className="w-5 h-5 mr-2" /> {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-4 bg-card border-border shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-foreground tracking-wider">NFT HOLDINGS</CardTitle>
                </CardHeader>
                <CardContent>
                  {nftHoldings.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {nftHoldings.map((nft) => (
                        <div
                          key={`${nft.contract_address}-${nft.token_id}`}
                          className="flex items-center gap-3 p-2 bg-secondary rounded hover:bg-accent transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedNft(nft)
                            fetchNftMetadata(nft.contract_address, nft.token_id)
                          }}
                        >
                          {nft.image_url ? (
                            <img
                              src={nft.image_url || "/placeholder.svg"}
                              alt={nft.collection_name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-foreground font-mono">{nft.collection_name}</div>
                            <div className="text-xs text-muted-foreground">ID: {nft.token_id}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No NFTs found in this wallet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-4 bg-card border-border shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-foreground tracking-wider">ERC20 HOLDINGS</CardTitle>
                </CardHeader>
                <CardContent>
                  {erc20Holdings.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {erc20Holdings.map((token, index) => (
                        <div
                          key={index}
                          className="text-xs border-l-2 border-primary pl-3 hover:bg-secondary p-2 rounded transition-colors"
                        >
                          <div className="text-muted-foreground font-mono">{token.token_symbol}</div>
                          <div className="text-foreground">
                            {token.quantity.toFixed(4)}{" "}
                            <span className="text-primary font-mono">{token.token_name}</span>
                            {token.usd_value && <span> (~${token.usd_value.toFixed(2)})</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No ERC20 tokens found in this wallet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-4 bg-card border-border shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-foreground tracking-wider">WALLET SCORE</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  {walletScore ? (
                    <>
                      <div className="relative w-32 h-32 mb-4">
                        <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-pulse"></div>
                        <div className="absolute inset-2 border border-primary/10 rounded-full"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-primary">
                          {walletScore.wallet_score ? walletScore.wallet_score.toFixed(0) : "N/A"}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1 w-full font-mono">
                        <div className="flex justify-between">
                          <span>Classification:</span>
                          <span className="text-foreground">{walletScore.classification || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Anomalous Pattern:</span>
                          <span className="text-foreground">{walletScore.anomalous_pattern_score.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Interaction:</span>
                          <span className="text-foreground">{walletScore.risk_interaction_score.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">Wallet score not available.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}