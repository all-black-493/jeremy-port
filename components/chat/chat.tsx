"use client"

import { type CHAT_PROFILE_QUERYResult } from "@/sanity.types";
import { useUser } from "@clerk/nextjs";
import type { Message } from "@langchain/langgraph-sdk";
import { Client } from "@langchain/langgraph-sdk";
import { useStream } from "@langchain/langgraph-sdk/react";
import {
    AlertCircle,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Copy,
    History,
    Loader2,
    MessageSquare,
    PanelLeft,
    Pencil,
    Plus,
    SendHorizontal,
    Sparkles,
    StopCircle,
    TerminalSquare,
    ThumbsDown,
    ThumbsUp,
    User as UserIcon,
    X
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { useSidebar } from "../ui/sidebar";
import { TECH_JOKES } from "@/constants";

const PROXY_PATH = "/api/stream/";



const client = new Client({
    apiUrl: typeof window !== "undefined" ? `${window.location.origin}${PROXY_PATH}` : PROXY_PATH,
});


type ToolCallGroup = {
    id: string;
    name: string;
    args: any;
    status: "pending" | "completed" | "error";
    result?: string;
};



const CodeRenderer = ({ language, value }: { language: string, value: string }) => {
    const [copied, setCopied] = useState(false);
    const onCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-md overflow-hidden my-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-mono">
                <span className="uppercase">{language || "text"}</span>
                <button onClick={onCopy} className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    {copied ? <CheckCircle2 size={12} className="text-green-600 dark:text-green-500" /> : <Copy size={12} />}
                </button>
            </div>
            <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: 0, fontSize: '12px' }}
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
};

function ToolCard({ tool }: { tool: ToolCallGroup }) {
    const [isOpen, setIsOpen] = useState(tool.status === "pending" || tool.status === "error");

    // FIXED: Robust URL extraction and validation
    const sources = useMemo(() => {
        if (!tool.result) return [];

        // 1. Capture potential URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = tool.result.match(urlRegex);

        if (!matches) return [];

        // 2. Clean and Validate
        const validUrls = matches.map(url => {
            // Remove trailing punctuation, quotes, or markdown/html closers
            return url.replace(/[.,;)"\]>]+$/, "");
        }).filter(url => {
            try {
                // Only keep it if it's a valid URL object
                new URL(url);
                return true;
            } catch {
                return false;
            }
        });

        // 3. Return unique set
        return Array.from(new Set(validUrls));
    }, [tool.result]);

    return (
        <div className="mb-2 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-sm text-xs">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
                {tool.status === 'pending' && <Loader2 size={12} className="animate-spin text-blue-500" />}
                {tool.status === 'completed' && <CheckCircle2 size={12} className="text-green-500" />}
                {tool.status === 'error' && <AlertCircle size={12} className="text-red-500" />}

                <span className="font-medium text-gray-700 dark:text-gray-200 font-mono">
                    {tool.name || "Task"}
                </span>

                {sources.length > 0 && (
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {sources.length} {sources.length === 1 ? 'Source' : 'Sources'}
                    </span>
                )}

                <div className="flex-1" />
                {isOpen ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
            </button>

            {isOpen && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 font-mono space-y-3">
                    {tool.args && Object.keys(tool.args).length > 0 && (
                        <div>
                            <div className="text-[10px] text-gray-400 uppercase mb-1">Input</div>
                            <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all bg-white dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800">
                                {JSON.stringify(tool.args, null, 2)}
                            </pre>
                        </div>
                    )}

                    {sources.length > 0 && (
                        <div>
                            <div className="text-[10px] text-gray-400 uppercase mb-1">References</div>
                            <div className="flex flex-wrap gap-2">
                                {sources.map((url, i) => {
                                    // Safe parsing now guaranteed by the filter above
                                    let hostname = "";
                                    try { hostname = new URL(url).hostname; } catch { hostname = "Link"; }

                                    return (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-blue-600 dark:text-blue-400 no-underline"
                                        >
                                            <History size={10} />
                                            <span className="truncate max-w-37.5">{hostname}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {tool.result && (
                        <div>
                            <div className="text-[10px] text-gray-400 uppercase mb-1">Result</div>
                            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto bg-white dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800">
                                {tool.result}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MessageActions({ content, onFeedback }: { content: string, onFeedback: (type: 'good' | 'bad') => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onClick={handleCopy} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md">
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            </button>
            <button onClick={() => onFeedback('good')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-green-600 dark:hover:text-green-500 rounded-md">
                <ThumbsUp size={13} />
            </button>
            <button onClick={() => onFeedback('bad')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-md">
                <ThumbsDown size={13} />
            </button>
        </div>
    );
}

const AgentMessage = memo(({ content, isLast }: { content: string, isLast: boolean }) => {
    if (!content && !isLast) return null;

    return (
        <div className="flex items-start gap-3 group mb-6">
            <div className="w-6 h-6 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </div>

            <div className="flex flex-col flex-1 max-w-[90%] min-w-0">
                <div className="relative">
                    <div className="prose prose-sm prose-gray dark:prose-invert max-w-none text-sm leading-relaxed text-gray-800 dark:text-gray-100 inline">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || "")
                                    return !inline && match ? (
                                        <CodeRenderer language={match[1]} value={String(children).replace(/\n$/, "")} />
                                    ) : (
                                        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono text-xs border border-gray-200 dark:border-gray-700" {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                        {isLast && (
                            <span className="inline-block w-1.5 h-3.75 bg-black dark:bg-white ml-1 animate-[pulse_1s_infinite] vertical-middle" />
                        )}
                    </div>
                    {content && <MessageActions content={content} onFeedback={(t) => console.log(t)} />}
                </div>
            </div>
        </div>
    );
});

const UserMessage = memo(({ content, userImage, onEdit }: { content: string, userImage?: string | null, onEdit: (txt: string) => void }) => {
    return (
        <div className="flex flex-row-reverse items-start gap-3 mb-6 group">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0 shadow-sm">
                {userImage ? (
                    <img src={userImage} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gray-900 dark:bg-gray-700 text-white flex items-center justify-center">
                        <UserIcon className="w-3.5 h-3.5" />
                    </div>
                )}
            </div>

            <div className="flex flex-col items-end max-w-[85%]">
                <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-2xl rounded-br-sm text-[14px] leading-relaxed shadow-sm">
                    {content}
                </div>
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(content)}
                        className="p-1 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                        title="Edit and Branch"
                    >
                        <Pencil size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
});

function HistoryPanel({
    isOpen,
    onClose,
    onSelectThread,
    activeThreadId
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelectThread: (id: string) => void;
    activeThreadId: string | null;
}) {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            client.threads.search({ limit: 20 })
                .then(res => setThreads(res))
                .catch(err => console.error("Failed to load history", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 h-full w-72 bg-white dark:bg-gray-950 border-l dark:border-gray-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="h-14 border-b dark:border-gray-800 flex items-center justify-between px-4 bg-gray-50/50 dark:bg-gray-900/50">
                <h2 className="font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">History</h2>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400">
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {loading && (
                    <div className="flex items-center justify-center py-10 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                )}

                {!loading && threads.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">No history found</div>
                )}

                {threads.map((thread) => {
                    const date = new Date(thread.created_at).toLocaleDateString();
                    const title = `Conversation ${thread.thread_id.slice(0, 8)}...`;

                    return (
                        <button
                            key={thread.thread_id}
                            onClick={() => onSelectThread(thread.thread_id)}
                            className={`w-full text-left p-3 rounded-lg text-sm mb-1 transition-all group flex items-start gap-3
                                ${activeThreadId === thread.thread_id
                                    ? 'bg-black dark:bg-gray-800 text-white shadow-md'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'}
                            `}
                        >
                            <MessageSquare size={14} className={`mt-0.5 ${activeThreadId === thread.thread_id ? 'text-gray-300' : 'text-gray-400'}`} />
                            <div className="min-w-0">
                                <div className="font-medium truncate">{title}</div>
                                <div className={`text-[10px] ${activeThreadId === thread.thread_id ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {date}
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

const getProxyUrl = () => {
    if (typeof window !== "undefined") {
        // window.location.origin will be "http://localhost:3000" or "https://your-app.com"
        // The trailing slash is MANDATORY for the SDK to append paths correctly
        return `${window.location.origin}/api/stream/`;
    }
    return "";
};

const ThinkingIndicator = () => {
    const [joke, setJoke] = useState(TECH_JOKES[0]);

    useEffect(() => {
        setJoke(TECH_JOKES[Math.floor(Math.random() * TECH_JOKES.length)]);
        const interval = setInterval(() => {
            setJoke(TECH_JOKES[Math.floor(Math.random() * TECH_JOKES.length)]);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-start gap-3 mb-6 animate-in fade-in duration-500">
            <div className="w-6 h-6 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex flex-col gap-2 max-w-[80%]">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-none w-fit shadow-sm">
                    <div className="flex items-center gap-1.5 h-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 italic ml-1">
                    <Sparkles size={10} className="text-yellow-500/50" />
                    <span className="animate-in fade-in slide-in-from-left-1 duration-500">
                        {joke}
                    </span>
                </div>
            </div>
        </div>
    );
};


function Chat({ profile }: { profile: CHAT_PROFILE_QUERYResult | null }) {
    const { user } = useUser();
    const [threadId, setThreadId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { toggleSidebar } = useSidebar();
    const proxyUrl = useMemo(() => getProxyUrl(), []);

    const thread = useStream<{ messages: Message[] }>({
        apiUrl: proxyUrl,
        assistantId: "agent",
        messagesKey: "messages",
        reconnectOnMount: true,
        fetchStateHistory: true,
        threadId,
        onThreadId: setThreadId,
    });


    const {
        messages,
        isLoading,
        // error 
    } = thread;

    // console.log(getToolCalls(messages[messages.length - 1]))
    // console.log('[THREAD.MESSAGES:]', thread.messages)

    // thread.messages.forEach((msg, index) => {
    //     if (msg.type === "tool" && msg.tool_calls! && msg.tool_calls.length > 0) {
    //         console.log(`Message ${index} (AI) requested tools:`, msg.tool_calls);
    //     }

    //     // If you want to see the RESULTS (the "tool" type messages):
    //     if (msg.type === "tool") {
    //         console.log(`Message ${index} (Tool Result) for ID ${msg.tool_call_id}:`, msg.content);
    //     }
    // });

    const hasMessages = thread.messages && thread.messages.length > 0;

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages?.length, thread.isLoading]); // Watch messages.length instead

    const isToolPending = (toolCallId: string) => {
        return !messages?.some(m => m.type === "tool" && (m as any).tool_call_id === toolCallId);
    };

    const handleSubmit = async (text: string) => {
        if (!text.trim()) return;
        setInputValue("");

        const newMessage: Message = {
            id: crypto.randomUUID(),
            type: "human",
            content: text
        };

        thread.submit(
            { messages: [newMessage] },
            {
                streamMode: ["messages", "values"],
                optimisticValues(prev) {
                    const prevMessages = prev?.messages ?? [];
                    return { ...prev, messages: [...prevMessages, newMessage] };
                },
            },
        );
    };

    const handleNewChat = () => {
        setThreadId(null);
        setIsHistoryOpen(false);
    };

    return (
        <div className="flex flex-col h-screen max-w-3xl mx-auto bg-white dark:bg-gray-950 border-x border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-200/50 dark:shadow-gray-950/50 relative overflow-hidden font-sans rounded-md">

            {/* Professional Header */}
            <header className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={toggleSidebar} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg text-gray-500 dark:text-gray-400 transition-colors">
                        <PanelLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
                            {profile?.firstName || "Agent"}
                            <span className="text-gray-400 font-normal ml-1">AI Twin</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleNewChat}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Chat</span>
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <button
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className={`p-2 rounded-lg transition-colors ${isHistoryOpen
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                            }`}
                    >
                        <History className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* History Overlay */}
            <HistoryPanel
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSelectThread={(id) => { setThreadId(id); setIsHistoryOpen(false); }}
                activeThreadId={threadId}
            />

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
                {!hasMessages ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 ">
                        <div className="w-12 h-12 bg-linear-to-tr from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-gray-100 dark:border-gray-800">
                            <TerminalSquare className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            How can I help you today?
                        </h2>
                        <div className="grid grid-cols-2 gap-3 max-w-md w-full mt-8">
                            {[
                                { l: "Professional Experience", q: "Tell me about your previous roles." },
                                { l: "Technical Skills", q: "What is your tech stack?" },
                                { l: "Recent Projects", q: "Show me what you've built recently." },
                                { l: "Contact Info", q: "How can I reach you?" },
                            ].map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSubmit(item.q)}
                                    className="p-3 text-left border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-gray-200 dark:border-gray-800"
                                >
                                    {item.l}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 pb-4">
                        {messages?.map((msg, index) => {
                            const isLast = index === messages.length - 1;

                            if (msg.type === "human") {
                                return (
                                    <UserMessage
                                        key={msg.id ?? `h-${index}`}
                                        content={typeof msg.content === "string" ? msg.content : ""}
                                        userImage={user?.imageUrl}
                                        onEdit={(txt) => setInputValue(txt)}
                                    />
                                );
                            }

                            if (msg.type === "ai") {
                                return (
                                    <div key={msg.id ?? `ai-${index}`} className="flex flex-col gap-2">
                                        {msg.content && (
                                            <AgentMessage
                                                content={msg.content as string}
                                                isLast={isLast && isLoading}
                                            />
                                        )}


                                        {msg.tool_calls?.map((tc: any) => {
                                            const hasResult = messages.some(
                                                m => m.type === "tool" && (m as any).tool_call_id === tc.id
                                            );

                                            if (!hasResult) {
                                                return (
                                                    <div key={tc.id} className="ml-9">
                                                        <ToolCard tool={{
                                                            id: tc.id,
                                                            name: tc.name,
                                                            args: tc.args || {},
                                                            status: "pending"
                                                        }} />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                );
                            }

                            if (msg.type === "tool") {
                                const toolCallId = (msg as any).tool_call_id;
                                const originalCall = messages.find(
                                    m => m.type === "ai" && m.tool_calls?.some((tc: any) => tc.id === toolCallId)
                                );
                                const toolName = (originalCall as any)?.tool_calls?.find((tc: any) => tc.id === toolCallId)?.name;

                                return (
                                    <div key={msg.id ?? `t-${index}`} className="ml-9 mb-6">
                                        <ToolCard
                                            tool={{
                                                id: toolCallId,
                                                name: toolName,
                                                args: {},
                                                status: "completed",
                                                result: typeof msg.content === "string"
                                                    ? msg.content
                                                    : JSON.stringify(msg.content, null, 2)
                                            }}
                                        />
                                    </div>
                                );
                            }
                            return null;
                        })}

                        {/* {error && (
                            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
                                <AlertCircle size={14} />
                                <span>
                                    {error instanceof Error ? error.message : typeof error === 'string' ? error : "An unexpected stream error occurred"}
                                </span>
                                <button onClick={() => thread.submit(null)} className="ml-auto font-bold underline">Retry</button>
                            </div>
                        )} */}

                        {isLoading && <ThinkingIndicator />}

                        <div ref={bottomRef} className="h-4" />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-10">
                <div className="max-w-2xl mx-auto relative group">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit(inputValue);
                        }}
                        className="relative flex items-center"
                    >
                        <input
                            autoFocus
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={thread.isLoading}
                            type="text"
                            placeholder="Message..."
                            className="w-full h-12 pl-4 pr-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-950 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 focus:border-gray-300 dark:focus:border-gray-700 transition-all outline-none text-sm shadow-sm dark:text-gray-100"
                        />

                        <div className="absolute right-2 flex items-center">
                            {thread.isLoading ? (
                                <button
                                    type="button"
                                    onClick={() => thread.stop()}
                                    className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    <StopCircle className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim()}
                                    className="p-2 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                                >
                                    <SendHorizontal className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            Disclaimer: This is my AI-powered twin. It may not be 100% accurate and should be verified for accuracy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Chat