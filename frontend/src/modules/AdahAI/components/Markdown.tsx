/**
 * Markdown.tsx — Rendu markdown léger (sans librairie externe)
 * Gère : **gras**, *italique*, `code`, blocs ```code```, listes, titres, sauts de ligne
 */
import { useState } from 'react';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative my-2 group">
      <button onClick={copy}
        className="absolute top-2 right-2 text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-1 rounded transition-colors">
        {copied ? '✓ Copié' : '📋 Copier'}
      </button>
      <pre className="bg-[#1e1e1e] text-green-400 rounded-lg p-3 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Rendu inline : gras, italique, code inline
function renderInline(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  // Regex pour **gras**, *italique*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) parts.push(<strong key={`${keyPrefix}-b${i}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) parts.push(<code key={`${keyPrefix}-c${i}`} className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">{tok.slice(1, -1)}</code>);
    else parts.push(<em key={`${keyPrefix}-i${i}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length; i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Markdown({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = content.split('\n');
  let i = 0; let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bloc de code ```
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]); i++;
      }
      i++; // saute le ``` de fin
      blocks.push(<CodeBlock key={`cb-${key++}`} code={codeLines.join('\n')} />);
      continue;
    }

    // Liste à puces
    if (/^\s*[-•*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-•*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-•*]\s+/, '')); i++;
      }
      blocks.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 my-1.5 space-y-1">
          {items.map((it, j) => <li key={j}>{renderInline(it, `ul${key}-${j}`)}</li>)}
        </ul>
      );
      continue;
    }

    // Liste numérotée
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++;
      }
      blocks.push(
        <ol key={`ol-${key++}`} className="list-decimal pl-5 my-1.5 space-y-1">
          {items.map((it, j) => <li key={j}>{renderInline(it, `ol${key}-${j}`)}</li>)}
        </ol>
      );
      continue;
    }

    // Titre ###
    if (/^#{1,3}\s+/.test(line)) {
      const txt = line.replace(/^#{1,3}\s+/, '');
      blocks.push(<p key={`h-${key++}`} className="font-black text-gray-900 mt-2 mb-1">{renderInline(txt, `h${key}`)}</p>);
      i++; continue;
    }

    // Ligne vide
    if (line.trim() === '') { i++; continue; }

    // Paragraphe normal
    blocks.push(<p key={`p-${key++}`} className="my-1 leading-relaxed">{renderInline(line, `p${key}`)}</p>);
    i++;
  }

  return <div className="markdown-content">{blocks}</div>;
}
