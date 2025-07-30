# fin3Crunch AI - Intelligent Web3 Analytics Dashboard

**fin3Crunch AI** is a sophisticated, AI-powered analytics platform designed to provide deep insights into the Web3 ecosystem. It combines a sleek, tactical user interface with powerful backend services to deliver real-time data on NFT collections, tokens, and wallet activity. At its core is an intelligent AI agent that allows users to query complex blockchain data using natural language.

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

## ⚙️ Core Components & Workflow

The application's architecture is designed for security, performance, and intelligence. It separates the frontend presentation from the data fetching and AI logic.

### 1. The `fin3Crunch AI` Agent (The Brains)

The heart of the application is the conversational AI agent, which understands user queries and fetches the precise data needed to answer them.

-   **Technology:** The agent is powered by **Google Gemini**, accessed via the Vercel AI SDK in the `/api/chat` route.

-   **Core Mechanism: Function Calling:** The AI's true power lies in its ability to use "tools" (functions). Instead of just generating text, Gemini can analyze a user's prompt and decide to call a specific function to get live data from the BitsCrunch API. This ensures answers are accurate and up-to-date.

-   **The Tools:** The AI has two primary tools at its disposal:
    1.  `queryNFTData`: Used for simple, direct questions about a single metric (e.g., "what's the floor price?", "get me the metadata"). It calls a single, specific BitsCrunch endpoint.
    2.  `getCollectionOverview`: This is the power tool, used for broad, complex requests (e.g., "give me a full analysis of a collection," "is this NFT a good buy?"). It makes multiple, parallel API calls to BitsCrunch to gather a complete picture (metadata, analytics, scores, whale data, price estimates) and then presents it in a structured `ReportCard` component.

-   **The Process:**
    1.  A user sends a message (e.g., "Tell me about BAYC #8817").
    2.  The query, along with chat history and a detailed system prompt, is sent to the `/api/chat` route.
    3.  Gemini analyzes the query and determines that the `getCollectionOverview` tool is needed with the appropriate `contract_address` and `token_id`.
    4.  The backend executes this function, which makes several calls to our secure `/api/bitscrunch` proxy.
    5.  The structured data from BitsCrunch is returned to the Gemini model.
    6.  Gemini uses this data to formulate a human-readable summary and selects the appropriate UI components (like `ReportCard`, `MetricsCard`, `LineChartCard`) to visually represent the information.

### 2. Detailed Reports Page

This page allows users to conduct their own deep-dive analysis without using the chat interface.

-   **User Input:** The user provides a collection's contract address and an optional token ID.
-   **Backend Process:** When the "Generate" button is clicked, the frontend triggers a series of parallel API calls to the `/api/bitscrunch` proxy. It fetches data from multiple endpoints, including `/nft/collection/metadata`, `/nft/collection/analytics`, `/nft/collection/scores`, and `/nft/collection/whales`.
-   **AI Enhancement:** After the data is fetched and displayed, the user can click **"Generate AI Summary"**. This sends all the collected report data to the `/api/gemini` route with a specific prompt, instructing the AI to act as a financial analyst and produce a concise, expert summary of the findings.

### 3. Wall of Shame

This feature is designed to bring transparency to the NFT market by highlighting suspicious activity.

-   **Purpose:** To identify and display collections and individual NFTs with high levels of wash trading.
-   **Mechanism:** On page load, this component fetches data directly from the BitsCrunch `/nft/collection/washtrade` and `/nft/washtrade` endpoints, sorted by the highest volume of suspicious activity.
-   **Interactivity:** Users can click on any listed item to open a detailed modal view, which shows specific wash trading metrics and 24-hour trend charts, providing deeper insight into the manipulation patterns.

### 4. The Secure API Gateway (`/api/bitscrunch`)

This is the single, secure gateway for all external Web3 data requests.

-   **Security First:** This architecture is a critical security feature. The frontend **never** calls the BitsCrunch API directly, and the `BITSCRUNCH_API_KEY` is never exposed in the browser.
-   **How it Works:**
    1.  The frontend (or the AI agent's tool-calling function) sends a request to our internal `/api/bitscrunch` route.
    2.  The server-side code in this route receives the request, securely attaches the `BITSCRUNCH_API_KEY` from the server's environment variables.
    3.  It then forwards the complete, authorized request to the actual BitsCrunch API.
    4.  The response from BitsCrunch is routed back through the proxy to the client.

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