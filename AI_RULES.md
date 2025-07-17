# AI Development Rules

This document outlines the technical stack and coding conventions for this project. Following these rules ensures consistency, maintainability, and leverages the existing setup effectively.

## Tech Stack

The application is built with a modern, type-safe, and component-driven stack:

-   **Framework**: **Next.js 15** with the App Router.
-   **Language**: **TypeScript**.
-   **Styling**: **Tailwind CSS** for all utility-based styling.
-   **UI Components**: **shadcn/ui** is used for the component library. These are not traditional library components but rather code that you can edit, located in `src/components/ui`. They are built upon **Radix UI** primitives.
-   **Icons**: **Lucide React** is the exclusive icon library.
-   **Charts & Data Visualization**: **Recharts** is used for creating charts, integrated via the custom `Chart` components in `src/components/ui/chart.tsx`.
-   **Forms**: **React Hook Form** for form state management, paired with **Zod** for schema validation.
-   **AI Integration**: **Google Gemini** is used for generative text and function calling, accessed through the `/api/gemini/route.ts` endpoint via the Vercel AI SDK.
-   **Notifications**: **Sonner** is used for toast notifications.
-   **External Data**: The app proxies requests to the **BitsCrunch API** via the `/api/bitscrunch/route.ts` endpoint for all Web3 data.

## Library Usage and Conventions

### 1. Component Development

-   **Primary Source**: Always use components from **shadcn/ui** (`@/components/ui`) as the base for your UI.
-   **Customization**: Do **not** modify the base shadcn/ui components directly. If you need a customized version, create a new component that wraps the existing shadcn/ui component and applies the necessary modifications.
-   **File Structure**: Place all new reusable components inside the `src/components` directory. Page-specific components can reside within their respective page directories in `src/app`.

### 2. Styling

-   **Utility-First**: Use **Tailwind CSS** classes for all styling. Avoid writing custom CSS files.
-   **Class Merging**: Always use the `cn` utility function from `@/lib/utils` when combining conditional or dynamic classes.

### 3. Icons

-   Use icons exclusively from the `lucide-react` library. Do not introduce any other icon sets.

### 4. Charts and Data Visualization

-   For all charts (line, bar, etc.), use the **Recharts** library. Utilize the pre-configured `ChartContainer`, `ChartTooltip`, and `ChartLegend` components from `src/components/ui/chart.tsx` to maintain a consistent style.

### 5. Forms

-   All forms must be implemented using **React Hook Form**.
-   All form validation must be handled by creating a **Zod** schema.

### 6. Notifications

-   For any user feedback like success messages, errors, or warnings, use the **Sonner** library to display toast notifications.

### 7. API and Data Fetching

-   **Frontend**: The frontend should **never** call external APIs directly.
-   **Backend**: All external API calls (e.g., to BitsCrunch, Gemini) must be proxied through API Routes in the `src/app/api/` directory. This is critical for security and to avoid exposing API keys on the client side.

### 8. AI Functionality

-   For tasks requiring generative AI (like summarization or recommendations), use the existing `/api/gemini/route.ts` endpoint. This route is set up to use function calling with the BitsCrunch API, providing the AI with the tools it needs to answer data-related questions.