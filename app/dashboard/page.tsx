"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, XCircle, CheckCircle, TrendingUp, ImageIcon } from "lucide-react"
import { useAppContext } from "@/app/context/AppContext"

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

  const fetchWalletData = async (address: string) => {
    setLoading(true)
    setError(null)
    try {
      const [nftRes, erc20Res, defiRes, scoreRes] = await Promise.all([
        fetch("/api/bitscrunch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: "/wallet/balance/nft", walletAddress: address }),
        }),
        fetch("/api/bitscrunch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: "/wallet/balance/token", walletAddress: address }),
        }),
        fetch("/api/bitscrunch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: "/token/balance", walletAddress: address }),
        }),
        fetch("/api/bitscrunch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: "/wallet/score", walletAddress: address }),
        }),
      ])

      const nftData = await nftRes.json()
      const erc20Data = await erc20Res.json()
      const defiData = await defiRes.json()
      const scoreData = await scoreRes.json()

      if (nftRes.ok) {
        setNftHoldings(nftData.data || [])
        console.log("Fetched NFT Holdings:", nftData.data)
      } else {
        console.error("Failed to fetch NFTs:", nftData.error)
        throw new Error(nftData.error || "Failed to fetch NFTs")
      }
      if (erc20Res.ok) {
        setErc20Holdings(erc20Data.data || [])
        console.log("Fetched ERC20 Holdings:", erc20Data.data)
      } else {
        console.error("Failed to fetch ERC20s:", erc20Data.error)
        throw new Error(erc20Data.error || "Failed to fetch ERC20s")
      }
      if (defiRes.ok) {
        setDefiHoldings(defiData.data || [])
        console.log("Fetched DeFi Holdings (Token Balance):", defiData.data)
      } else {
        console.error("Failed to fetch DeFi (Token Balance):", defiData.error)
        throw new Error(defiData.error || "Failed to fetch DeFi")
      }
      if (scoreRes.ok) {
        setWalletScore(scoreData.data?.[0] || null)
        console.log("Fetched Wallet Score:", scoreData.data?.[0])
      } else {
        console.error("Failed to fetch Wallet Score:", scoreData.error)
        throw new Error(scoreData.error || "Failed to fetch Wallet Score")
      }
    } catch (err: any) {
      console.error("Error fetching wallet data:", err)
      setError(`Failed to load data: ${err.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchNftMetadata = async (contractAddress: string, tokenId: string) => {
    setLoadingNftMetadata(true)
    setNftMetadataError(null)
    setNftMetadata(null)
    try {
      const res = await fetch("/api/bitscrunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/nft/metadata",
          walletAddress: walletAddress || "0xDummyAddress", // walletAddress is not strictly required for /nft/metadata
          params: {
            contract_address: contractAddress,
            token_id: tokenId,
            blockchain: "ethereum",
          },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setNftMetadata(data.data?.[0] || null)
        console.log("Fetched NFT Metadata:", data.data?.[0])
      } else {
        console.error("Failed to fetch NFT metadata:", data.error)
        throw new Error(data.error || "Failed to fetch NFT metadata")
      }
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
  }, [walletAddress])

  const totalAssetsValue = defiHoldings.reduce((sum, item: any) => sum + (item.token_value_usd || 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Wallet Connection Section */}
      {!walletAddress ? (
        <Card className="bg-neutral-900 border-neutral-700 p-6 text-center">
          <CardTitle className="text-xl font-bold text-white mb-4">Connect Your MetaMask Wallet</CardTitle>
          <p className="text-neutral-400 mb-6">
            Please connect your Ethereum wallet to view your NFT and Web3 analytics.
          </p>
          <Button
            onClick={connectWallet}
            disabled={loading}
            className="bg-teal-200 hover:bg-teal-700 text-zinc-900 px-8 py-3 text-lg"
          >
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
          <div className="text-neutral-400 text-sm mb-4">
            Connected Wallet: <span className="text-orange-500 font-mono">{walletAddress}</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <span className="ml-3 text-neutral-400">Loading wallet data...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-red-500 mt-4 text-center flex items-center justify-center">
              <XCircle className="w-5 h-5 mr-2" /> {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-4 bg-neutral-900 border-neutral-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">NFT HOLDINGS</CardTitle>
                </CardHeader>
                <CardContent>
                  {nftHoldings.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {nftHoldings.map((nft) => (
                        <div
                          key={`${nft.contract_address}-${nft.token_id}`}
                          className="flex items-center gap-3 p-2 bg-neutral-800 rounded hover:bg-neutral-700 transition-colors cursor-pointer"
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
                            <div className="w-8 h-8 bg-neutral-700 rounded flex items-center justify-center text-xs text-neutral-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-white font-mono">{nft.collection_name}</div>
                            <div className="text-xs text-neutral-500">ID: {nft.token_id}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-sm">No NFTs found in this wallet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-4 bg-neutral-900 border-neutral-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">ERC20 HOLDINGS</CardTitle>
                </CardHeader>
                <CardContent>
                  {erc20Holdings.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {erc20Holdings.map((token, index) => (
                        <div
                          key={index}
                          className="text-xs border-l-2 border-orange-500 pl-3 hover:bg-neutral-800 p-2 rounded transition-colors"
                        >
                          <div className="text-neutral-500 font-mono">{token.token_symbol}</div>
                          <div className="text-white">
                            {token.quantity.toFixed(4)}{" "}
                            <span className="text-orange-500 font-mono">{token.token_name}</span>
                            {token.usd_value && <span> (~${token.usd_value.toFixed(2)})</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-sm">No ERC20 tokens found in this wallet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-4 bg-neutral-900 border-neutral-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">WALLET SCORE</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  {walletScore ? (
                    <>
                      <div className="relative w-32 h-32 mb-4">
                        <div className="absolute inset-0 border-2 border-white rounded-full opacity-60 animate-pulse"></div>
                        <div className="absolute inset-2 border border-white rounded-full opacity-40"></div>
                        <div className="absolute inset-4 border border-white rounded-full opacity-20"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-px bg-white opacity-30"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-px h-full bg-white opacity-30"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-orange-500">
                          {walletScore.wallet_score ? walletScore.wallet_score.toFixed(0) : "N/A"}
                        </div>
                      </div>

                      <div className="text-xs text-neutral-500 space-y-1 w-full font-mono">
                        <div className="flex justify-between">
                          <span>Classification:</span>
                          <span className="text-white">{walletScore.classification || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Anomalous Pattern:</span>
                          <span className="text-white">{walletScore.anomalous_pattern_score.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Associated Token:</span>
                          <span className="text-white">{walletScore.associated_token_score.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Interaction:</span>
                          <span className="text-white">{walletScore.risk_interaction_score.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Wallet Age:</span>
                          <span className="text-white">{walletScore.wallet_age_score.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-neutral-500 text-sm">Wallet score not available.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-8 bg-neutral-900 border-neutral-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">
                    TOTAL ASSET VALUE
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-48">
                  <div className="text-6xl font-bold text-white font-mono">${totalAssetsValue.toFixed(2)}</div>
                  <p className="text-neutral-500 text-sm mt-2">Aggregated value across token holdings</p>
                </CardContent>
              </Card>

              <Card className="lg:col-span-4 bg-neutral-900 border-neutral-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">KEY METRICS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-white" />
                        <span className="text-xs text-white font-medium">Portfolio Overview</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">NFT Collections</span>
                          <span className="text-white font-bold font-mono">{nftHoldings.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">ERC20 Tokens</span>
                          <span className="text-white font-bold font-mono">{erc20Holdings.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">DeFi Positions</span>
                          <span className="text-white font-bold font-mono">{defiHoldings.length}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-orange-500 font-medium">Risk & Trends</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Overall Wallet Score</span>
                          <span className="text-white font-bold font-mono">
                            {walletScore?.wallet_score ? walletScore.wallet_score.toFixed(2) : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Anomalous Activity</span>
                          <span className="text-white font-bold font-mono">
                            {walletScore?.anomalous_pattern_score
                              ? walletScore.anomalous_pattern_score.toFixed(2)
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Risk Interactions</span>
                          <span className="text-white font-bold font-mono">
                            {walletScore?.risk_interaction_score
                              ? walletScore.risk_interaction_score.toFixed(2)
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* NFT Detail Modal and Overlay */}
          {selectedNft && (
            <>
              {/* Blurred Overlay */}
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" />

              {/* Modal */}
              <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in">
                <Card className="bg-neutral-900 border-neutral-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
                  <CardHeader className="flex flex-row items-center justify-between">
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
                  <CardContent className="space-y-6">
                    {loadingNftMetadata ? (
                      <div className="flex flex-col items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
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
                              src={nftMetadata.image_url || "/placeholder.svg"}
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
                              <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">RARITY SCORE</h3>
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
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white">View on Marketplace</Button>
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
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}