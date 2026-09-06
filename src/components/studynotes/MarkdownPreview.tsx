import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Check,
  Info,
  Lightbulb,
  AlertTriangle,
  Flame,
  Star,
  Clock,
  FileText,
} from "lucide-react";

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = (className ?? "").replace("language-", "").replace("hljs", "").trim() || "text";
  const text = String(Array.isArray(children) ? children.join("") : children ?? "");
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

const CALLOUTS = {
  NOTE: { label: "Catatan", icon: Info, cls: "callout-note" },
  TIP: { label: "Tips", icon: Lightbulb, cls: "callout-tip" },
  IMPORTANT: { label: "Penting", icon: Star, cls: "callout-important" },
  WARNING: { label: "Hati-hati", icon: AlertTriangle, cls: "callout-warning" },
  CAUTION: { label: "Awas", icon: Flame, cls: "callout-caution" },
} as const;

type CalloutKey = keyof typeof CALLOUTS;

function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  const el = node as { props?: { children?: React.ReactNode } };
  return el.props ? nodeText(el.props.children) : "";
}

function Blockquote({ children }: { children?: React.ReactNode }) {
  const text = nodeText(children).trim();
  const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
  if (!match) return <blockquote>{children}</blockquote>;
  const key = match[1]!.toUpperCase() as CalloutKey;
  const meta = CALLOUTS[key];
  const Icon = meta.icon;
  const body = text.replace(match[0], "");
  return (
    <div className={`callout ${meta.cls}`}>
      <div className="callout-title">
        <Icon className="w-4 h-4" />
        {meta.label}
      </div>
      <div className="callout-body">
        {body.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown> : children}
      </div>
    </div>
  );
}

export function MarkdownPreview({ source }: { source: string }) {
  const stats = useMemo(() => {
    const words = source.trim() ? source.trim().split(/\s+/).length : 0;
    return { words, minutes: Math.max(1, Math.round(words / 200)) };
  }, [source]);

  return (
    <div className="prose-note">
      {stats.words > 120 && (
        <div className="note-meta">
          <span>
            <FileText className="w-3.5 h-3.5" /> {stats.words.toLocaleString("id-ID")} kata
          </span>
          <span>
            <Clock className="w-3.5 h-3.5" /> ±{stats.minutes} menit baca
          </span>
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
          pre: ({ children }) => <>{children}</>,
          code: ({
            className,
            children,
            ...props
          }: {
            className?: string;
            children?: React.ReactNode;
            node?: unknown;
            inline?: boolean;
          }) => {
            const isBlock = className?.includes("language-");
            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
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
