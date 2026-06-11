import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = (className ?? "").replace("language-", "").replace("hljs", "").trim() || "text";
  const text = String(
    Array.isArray(children) ? children.join("") : children ?? ""
  );
  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{lang}</span>
        <button className="copy-btn" onClick={onCopy} type="button">
          {copied ? <Check className="inline w-3 h-3 mr-1" /> : <Copy className="inline w-3 h-3 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="prose-note">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode; node?: unknown; inline?: boolean }) => {
            const isBlock = className?.includes("language-");
            if (!isBlock) {
              return <code className={className} {...props}>{children}</code>;
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
        }}
      >
        {source || "*Start writing to see the preview...*"}
      </ReactMarkdown>
    </div>
  );
}
