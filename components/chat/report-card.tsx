"use client"

import { Fish, Gem, DollarSign, TrendingUp, Info } from "lucide-react"

// Interfaces for the report data structure
interface NftMetadata {
  collection_name: string
  description: string
  image_url: string
  token_id: string
  contract_address: string
  attributes?: Array<{ trait_type: string; value: string }>
}

interface CollectionMetadata {
  collection_name: string
  description: string
  image_url: string
  contract_address: string
}

interface CollectionAnalytics {
  floor_price_usd?: number
  volume?: number
}

interface NftPriceEstimate {
  price_estimate?: number
}

interface NftScores {
  rarity_score?: number
}

interface CollectionScores {
  marketcap?: number
}

interface CollectionWhales {
  unique_wallets?: string
  whale_holders?: string
  buy_whales?: string
  sell_whales?: string
}

interface DetailedReportData {
  isSpecificNft: boolean
  nftMetadata?: NftMetadata
  collectionMetadata?: CollectionMetadata
  collectionAnalytics?: CollectionAnalytics
  nftPriceEstimate?: NftPriceEstimate
  nftScores?: NftScores
  collectionScores?: CollectionScores
  collectionWhales?: CollectionWhales
}

interface ReportCardProps {
  reportData: DetailedReportData
}

const Metric = ({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: React.ReactNode }) => (
  <div className="bg-neutral-800/50 p-3 rounded-lg text-center">
    <div className="flex items-center justify-center text-neutral-400 text-xs mb-1">
      <Icon className="w-3 h-3 mr-1.5" />
      <span>{title}</span>
    </div>
    <p className="text-base font-bold text-white font-mono">{value}</p>
  </div>
)

export function ReportCard({ reportData }: ReportCardProps) {
  const {
    isSpecificNft,
    nftMetadata,
    collectionMetadata,
    collectionAnalytics,
    nftPriceEstimate,
    nftScores,
    collectionScores,
    collectionWhales,
  } = reportData

  const metadata = isSpecificNft ? nftMetadata : collectionMetadata

  return (
    <div className="mt-2 space-y-4">
      <div className="flex items-center gap-4">
        <img
          src={metadata?.image_url || "/placeholder.svg"}
          alt={metadata?.collection_name || "NFT Image"}
          className="w-16 h-16 rounded-lg border border-neutral-700"
        />
        <div>
          <h3 className="font-bold text-white">
            {metadata?.collection_name}
            {isSpecificNft && ` #${metadata?.token_id}`}
          </h3>
          <p className="text-xs text-neutral-400 font-mono truncate max-w-xs">{metadata?.contract_address}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric
          icon={DollarSign}
          title="Floor Price"
          value={
            typeof collectionAnalytics?.floor_price_usd === "number"
              ? `$${collectionAnalytics.floor_price_usd.toFixed(2)}`
              : "N/A"
          }
        />
        {isSpecificNft && (
          <Metric
            icon={DollarSign}
            title="Est. Price"
            value={
              typeof nftPriceEstimate?.price_estimate === "number"
                ? `$${nftPriceEstimate.price_estimate.toFixed(2)}`
                : "N/A"
            }
          />
        )}
        <Metric icon={TrendingUp} title="30d Volume" value={`$${(collectionAnalytics?.volume ?? 0).toLocaleString()}`} />
        <Metric
          icon={Gem}
          title={isSpecificNft ? "Rarity Score" : "Market Cap"}
          value={
            isSpecificNft
              ? typeof nftScores?.rarity_score === "number"
                ? nftScores.rarity_score.toFixed(2)
                : "N/A"
              : `$${(collectionScores?.marketcap ?? 0).toLocaleString()}`
          }
        />
      </div>

      {collectionWhales && (
        <div>
          <h4 className="text-sm font-medium text-teal-200 mb-2 flex items-center gap-2">
            <Fish className="w-4 h-4" /> Whale Watch
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-neutral-800/50 rounded">
              <span>Unique Wallets:</span>
              <span className="font-mono text-white">{collectionWhales.unique_wallets ?? "N/A"}</span>
            </div>
            <div className="flex justify-between p-2 bg-neutral-800/50 rounded">
              <span>Whale Holders:</span>
              <span className="font-mono text-white">{collectionWhales.whale_holders ?? "N/A"}</span>
            </div>
            <div className="flex justify-between p-2 bg-neutral-800/50 rounded">
              <span>Buy Whales:</span>
              <span className="font-mono text-white">{collectionWhales.buy_whales ?? "N/A"}</span>
            </div>
            <div className="flex justify-between p-2 bg-neutral-800/50 rounded">
              <span>Sell Whales:</span>
              <span className="font-mono text-white">{collectionWhales.sell_whales ?? "N/A"}</span>
            </div>
          </div>
        </div>
      )}

      {isSpecificNft && nftMetadata?.attributes && nftMetadata.attributes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-teal-200 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" /> Attributes
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs max-h-32 overflow-y-auto custom-scrollbar pr-1">
            {nftMetadata.attributes.map((attr, i) => (
              <div key={i} className="bg-neutral-800/50 p-2 rounded text-center">
                <p className="text-neutral-400 uppercase truncate">{attr.trait_type}</p>
                <p className="font-semibold text-white mt-0.5 truncate">{attr.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}