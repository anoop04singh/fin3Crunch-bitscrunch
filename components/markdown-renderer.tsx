"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ node, ...props }) => <p className="text-sm leading-relaxed" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-semibold text-teal-200" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc space-y-2 pl-5" {...props} />,
        li: ({ node, ...props }) => <li className="text-neutral-300" {...props} />,
        code: ({ node, ...props }) => (
          <code
            className="bg-neutral-900/50 text-teal-300 font-mono text-xs px-1.5 py-1 rounded"
            {...props}
          />
        ),
        a: ({ node, ...props }) => (
          <a className="text-teal-300 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}