# fin3Crunch AI - Intelligent Web3 Analytics Dashboard

**fin3Crunch AI** is a sophisticated, AI-powered analytics platform designed to provide deep insights into the Web3 ecosystem. It combines a sleek, tactical user interface with powerful backend services to deliver real-time data on NFT collections, tokens, and wallet activity. At its core is an intelligent AI agent that allows users to query complex blockchain data using natural language.

 <!-- Placeholder for a project screenshot or GIF -->

---

## ✨ Features

-   **🤖 AI-Powered Chat (`fin3Crunch AI`):** A conversational interface that leverages Google Gemini and BitsCrunch APIs to answer complex questions about the NFT market, specific tokens, collections, and wallet analytics.
-   **📊 Personalized Dashboard:** Users can connect their MetaMask wallet to get a personalized overview of their NFT and ERC20 token holdings, total asset value, and a detailed wallet risk score.
-   **📈 In-Depth NFT & Collection Reports:** Generate comprehensive on-demand reports for any NFT collection or individual token on the Ethereum blockchain, including market analytics, price estimates, rarity scores, and whale activity.
-   **🛡️ Wall of Shame:** A dedicated section that highlights NFT collections and specific tokens with the highest levels of wash trading activity, promoting transparency in the ecosystem.
-   **🎨 Dynamic & Responsive UI:** A modern, responsive interface built with shadcn/ui and Tailwind CSS, featuring smooth animations and a unique dynamic background that reacts to mouse movement.
-   **🔐 Secure Backend Proxy:** All external API calls are routed through a secure Next.js backend, ensuring that sensitive API keys are never exposed on the client-side.

---

## 🛠️ Tech Stack

This project is built with a modern, type-safe, and component-driven stack.

-   **Framework:** [Next.js 15](https://nextjs.org/) (with App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components:** [shadcn/ui](https://ui.shadcn.com/) built upon [Radix UI](https://www.radix-ui.com/) primitives.
-   **State Management:** React Context API (`AppContext.tsx`)
-   **AI Agent:** [Google Gemini](https://ai.google.dev/) with Function Calling via the [Vercel AI SDK](https://sdk.vercel.ai/).
-   **Web3 Data Provider:** [BitsCrunch API](https://bitscrunch.com/)
-   **Animations:** [Framer Motion](https://www.framer.com/motion/)
-   **Charts & Data Visualization:** [Recharts](https://recharts.org/)
-   **Icons:** [Lucide React](https://lucide.dev/)

---

## ⚙️ How It Works

The application's architecture is designed for security, performance, and intelligence. It separates the frontend presentation from the data fetching and AI logic.

1.  **Frontend (Next.js/React):** The user interacts with the client-side application. When a user connects their wallet or requests a report, the frontend sends a request to our internal Next.js API routes.

2.  **Backend Proxy (`/api/bitscrunch`):** This is the secure gateway for all Web3 data.
    -   The frontend **never** calls the BitsCrunch API directly.
    -   It sends a request to this proxy route with the desired endpoint and parameters.
    -   The server-side route securely attaches the `BITSCRUNCH_API_KEY` from environment variables and forwards the request to the BitsCrunch API.
    -   This prevents the API key from ever being exposed in the browser.

3.  **AI Chat Logic (`/api/chat`):** This is the brain of the application.
    -   When a user sends a message, the entire chat history is sent to this endpoint.
    -   The endpoint uses the **Google Gemini** model, which has been provided with a detailed system prompt and two powerful "tools" (functions) it can call: `getCollectionOverview` and `queryNFTData`.
    -   **Function Calling:** Gemini analyzes the user's prompt and decides which tool, if any, is needed to answer the question. It determines the necessary parameters (e.g., contract address, token ID).
    -   **Tool Execution:** The backend executes the function chosen by the AI. This function then calls our `/api/bitscrunch` proxy to fetch the required data.
    -   **Response Generation:** The data from the BitsCrunch API is returned to the Gemini model. The model then uses this data to formulate a final, human-readable answer, which is sent back to the user.

---

### Key BitsCrunch API Endpoints Used

The AI agent is empowered to use a wide range of BitsCrunch endpoints. Here are some of the key ones:

-   **Wallet Analytics:**
    -   `/wallet/balance/nft`: To fetch all NFT holdings for a connected wallet.
    -   `/wallet/balance/token`: To fetch all ERC20 token holdings.
    -   `/wallet/score`: To calculate a wallet's risk and activity score.
-   **NFT & Collection Data:**
    -   `/nft/metadata` & `/nft/collection/metadata`: For basic information and images.
    -   `/nft/collection/analytics`: For market data like volume, sales, and floor price.
    -   `/nft/collection/scores`: For metrics like market cap and average price.
    -   `/nft/collection/whales`: To identify large holders in a collection.
    -   `/nft/liquify/price_estimate`: For AI-powered price predictions for specific NFTs.
-   **Market Intelligence:**
    -   `/nft/market-insights/analytics`: For a high-level overview of the entire NFT market.
    -   `/nft/top_deals`: To find potentially undervalued NFTs.
-   **Security & Transparency:**
    -   `/nft/washtrade` & `/nft/collection/washtrade`: To power the "Wall of Shame" by identifying suspicious trading activity.

---

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18 or later)
-   `pnpm`, `npm`, or `yarn` package manager

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/fin3crunch-ai.git
cd fin3crunch-ai
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 3. Set Up Environment Variables

You need to create a `.env.local` file in the root of the project and add your API keys.

```
BITSCRUNCH_API_KEY="YOUR_BITSCRUNCH_API_KEY"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

-   **`BITSCRUNCH_API_KEY`**: Get your free API key from the [BitsCrunch Developer Portal](https://docs.bitscrunch.com/).
-   **`GEMINI_API_KEY`**: Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Run the Development Server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

---

## 💬 Sample Questions for fin3Crunch AI

Here are some examples of what you can ask the AI agent to see its capabilities:

#### General Market Questions
-   "What's the current NFT market sentiment?"
-   "Show me the market volume for the last 7 days."
-   "What are the top NFT deals right now?"

#### Wallet-Specific Questions (Requires connecting your wallet)
-   "What tokens do I hold?"
-   "Show me my NFTs."
-   "What is my wallet's risk score?"
-   "Analyze my wallet's holdings."

#### Collection Analysis (You may be prompted for a contract address)
-   "Give me a full report on the Pudgy Penguins collection."
-   "What is the floor price of Bored Ape Yacht Club?"
-   "Who are the biggest whales in the Azuki collection?"

#### Specific NFT Analysis
-   "Tell me everything about BAYC #8817."
-   "What's the estimated price for CryptoPunk #7523?"
-   "Is it a good time to buy MAYC #101?"