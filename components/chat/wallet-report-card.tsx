"use client"

import { Wallet, BarChart4, ImageIcon, TrendingUp, TrendingDown, ShieldCheck, Activity, Calendar } from "lucide-react"

// Interfaces matching the data structure
interface NftHolding {
  collection_name: string
  token_id: string
  image_url?: string
}

interface Erc20Holding {
  token_name: string
  token_symbol: string
  quantity: number
  usd_value?: number
}

interface WalletScore {
  wallet_score: number
  classification: string
}

interface WalletMetrics {
  balance_usd: number
  total_txn: number
  wallet_age: number
  inflow_amount_usd: number
  outflow_amount_usd: number
}

interface WalletReportData {
  walletAddress: string
  nftHoldings: NftHolding[]
  tokenHoldings: Erc20Holding[]
  walletScore: WalletScore | null
  walletMetrics: WalletMetrics | null
}

interface WalletReportCardProps {
  reportData: WalletReportData
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "N/A"
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

const MetricCard = ({ title, value, icon: Icon }: { title: string; value: React.ReactNode; icon: React.ElementType }) => (
  <div className="bg-neutral-800/50 p-3 rounded-lg text-center">
    <div className="flex items-center justify-center text-neutral-400 text-xs mb-1">
      <Icon className="w-3 h-3 mr-1.5" />
      <span>{title}</span>
    </div>
    <p className="text-lg font-bold text-white font-mono">{value}</p>
  </div>
)

export function WalletReportCard({ reportData }: WalletReportCardProps) {
  const { walletAddress, nftHoldings, tokenHoldings, walletScore, walletMetrics } = reportData

  return (
    <div className="mt-2 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-white">Wallet Analysis</h3>
          <p className="text-xs text-neutral-400 font-mono truncate max-w-xs">{walletAddress}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard title="Wallet Score" value={walletScore?.wallet_score?.toFixed(0) ?? "N/A"} icon={ShieldCheck} />
        <MetricCard title="Classification" value={walletScore?.classification ?? "N/A"} icon={BarChart4} />
        <MetricCard title="Balance (USD)" value={formatCurrency(walletMetrics?.balance_usd)} icon={Wallet} />
        <MetricCard title="Wallet Age" value={`${walletMetrics?.wallet_age ?? 'N/A'} days`} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-teal-200 mb-2">NFT Holdings ({nftHoldings.length})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {nftHoldings.length > 0 ? (
              nftHoldings.map((nft, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-neutral-800/50 rounded-md text-xs">
                  {nft.image_url ? (
                    <img src={nft.image_url} alt={nft.collection_name} className="w-6 h-6 rounded-sm object-cover" />
                  ) : (
                    <div className="w-6 h-6 bg-neutral-700 rounded-sm flex items-center justify-center text-neutral-500">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                  <span className="text-white truncate">{nft.collection_name} #{nft.token_id}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500">No NFT holdings found.</p>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-teal-200 mb-2">Token Holdings ({tokenHoldings.length})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {tokenHoldings.length > 0 ? (
              tokenHoldings.map((token, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-neutral-800/50 rounded-md text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-white">{token.token_symbol}</span>
                    <span className="text-neutral-400 truncate">{token.token_name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-mono">{token.quantity.toFixed(4)}</p>
                    <p className="text-neutral-500 font-mono">{formatCurrency(token.usd_value)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500">No token holdings found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}