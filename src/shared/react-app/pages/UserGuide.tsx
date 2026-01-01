import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Footer from "@/react-app/components/Footer";
import userGuideContent from "../../../UserGuide.md?raw";

export default function UserGuide() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1e2639]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1f2e] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white">User Guide</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Everything you need to know about UltraPlan
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-8 border border-gray-200 dark:border-gray-800">
          <article className="prose prose-invert prose-blue max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Customize heading styles
                h1: ({ children }) => (
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-6 mt-8 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => {
                  // Generate ID from heading text for anchor links
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  return (
                    <h2 id={id} className="text-3xl font-bold text-gray-900 dark:text-white mb-4 mt-8 border-b border-gray-200 dark:border-gray-700 pb-2">
                      {children}
                    </h2>
                  );
                },
                h3: ({ children }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  return (
                    <h3 id={id} className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">
                      {children}
                    </h3>
                  );
                },
                h4: ({ children }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  return (
                    <h4 id={id} className="text-xl font-semibold text-gray-900 dark:text-white mb-2 mt-4">
                      {children}
                    </h4>
                  );
                },
                // Customize paragraph styles
                p: ({ children }) => (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                // Customize list styles
                ul: ({ children }) => (
                  <ul className="text-gray-700 dark:text-gray-300 space-y-2 mb-4 ml-6 list-disc">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="text-gray-700 dark:text-gray-300 space-y-2 mb-4 ml-6 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700 dark:text-gray-300">{children}</li>
                ),
                // Customize link styles
                a: ({ href, children }) => {
                  // Internal anchor links should not open in new tab
                  const isInternalAnchor = href?.startsWith('#');
                  return (
                    <a
                      href={href}
                      className="text-blue-400 hover:text-blue-300 underline transition-colors"
                      {...(!isInternalAnchor && {
                        target: "_blank",
                        rel: "noopener noreferrer"
                      })}
                    >
                      {children}
                    </a>
                  );
                },
                // Customize code styles
                code: ({ className, children }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-200 dark:bg-gray-800 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className={`${className} block bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 p-4 rounded-lg overflow-x-auto text-sm font-mono`}>
                      {children}
                    </code>
                  );
                },
                // Customize blockquote styles
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-500/10 text-gray-700 dark:text-gray-300 italic">
                    {children}
                  </blockquote>
                ),
                // Customize strong/bold styles
                strong: ({ children }) => (
                  <strong className="text-gray-900 dark:text-white font-semibold">{children}</strong>
                ),
                // Customize table styles
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {children}
                  </td>
                ),
                // Customize horizontal rule
                hr: () => (
                  <hr className="border-gray-200 dark:border-gray-700 my-8" />
                ),
              }}
            >
              {userGuideContent}
            </ReactMarkdown>
          </article>
        </div>
      </div>

      <Footer />
    </div>
  );
}

