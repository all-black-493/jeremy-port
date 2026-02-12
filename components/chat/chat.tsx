"use client"

import { type CHAT_PROFILE_QUERYResult } from "@/sanity.types"
import { useStream } from "@langchain/langgraph-sdk/react";
import { Client } from "@langchain/langgraph-sdk"
import type { Message } from "@langchain/langgraph-sdk";
import { useEffect, useRef, useState, useMemo, memo } from "react";
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useSidebar } from "../ui/sidebar";
import { useUser } from "@clerk/nextjs";
import {
    SendHorizontal,
    User as UserIcon,
    Bot,
    Loader2,
    ChevronDown,
    ChevronRight,
    TerminalSquare,
    PanelLeft,
    StopCircle,
    CheckCircle2,
    Copy,
    ThumbsUp,
    ThumbsDown,
    Plus,
    History,
    MessageSquare,
    X,
    AlertCircle,
    Pencil
} from "lucide-react"

const PROXY_PATH = "/api/stream/";

const client = new Client({
    // IMPORTANT: Trailing slash is mandatory here
    apiUrl: typeof window !== "undefined" ? `${window.location.origin}${PROXY_PATH}` : PROXY_PATH,
});

type ChatBlock =
    | { type: "user"; id: string; content: string }
    | {
        type: "agent";
        id: string;
        content: string;
        toolCalls: ToolCallGroup[];
        isStreaming: boolean;
    };

type ToolCallGroup = {
    id: string;
    name: string;
    args: any;
    status: "pending" | "complete" | "error";
    result?: string;
};

function groupMessages(messages: Message[]): ChatBlock[] {
    const blocks: ChatBlock[] = [];

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const msgType = msg.type.toLowerCase();

        if (msgType === "human") {
            blocks.push({
                type: "user",
                id: msg.id ?? `msg-${i}`,
                content: typeof msg.content === "string" ? msg.content : "",
            });
        } else if (msgType === "ai" || msgType === "aimessage") {
            const content = typeof msg.content === "string" ? msg.content : "";
            const toolCallsMap: ToolCallGroup[] = [];

            // CHANGED: Added support for camelCase 'toolCalls' and 'additional_kwargs' fallback
            const rawToolCalls =
                (msg as any).tool_calls ||
                (msg as any).toolCalls ||
                (msg as any).additional_kwargs?.tool_calls ||
                [];

            rawToolCalls.forEach((tc: any) => {
                let args = tc.args || tc.function?.arguments;
                if (typeof args === 'string') {
                    try { args = JSON.parse(args); } catch (e) { /* partial json */ }
                }

                toolCallsMap.push({
                    id: tc.id,
                    name: tc.name || tc.function?.name,
                    args: args,
                    status: "pending"
                });
            });

            // Look ahead for "Tool" messages matching these IDs
            let j = i + 1;
            while (j < messages.length && (messages[j].type === "tool")) {
                const toolMsg = messages[j] as any;
                // CHANGED: Support both snake_case and camelCase for ID matching
                const toolMsgId = toolMsg.tool_call_id || toolMsg.toolCallId;

                const toolCallIndex = toolCallsMap.findIndex(tc => tc.id === toolMsgId);

                if (toolCallIndex !== -1) {
                    toolCallsMap[toolCallIndex].status = toolMsg.status === "error" ? "error" : "complete";
                    // CHANGED: Stringify non-string content (like JSON artifacts)
                    toolCallsMap[toolCallIndex].result =
                        typeof toolMsg.content === "string"
                            ? toolMsg.content
                            : JSON.stringify(toolMsg.content);
                }
                j++;
            }

            blocks.push({
                type: "agent",
                id: msg.id ?? `ai-${i}`,
                content,
                toolCalls: toolCallsMap,
                isStreaming: false
            });
        }
    }
    return blocks;
}

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

    useEffect(() => {
        if (tool.status === "complete") {
            const t = setTimeout(() => setIsOpen(false), 2000);
            return () => clearTimeout(t);
        }
    }, [tool.status]);

    return (
        <div className="mb-2 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-sm text-xs">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
                {tool.status === 'pending' && <Loader2 size={12} className="animate-spin text-blue-500" />}
                {tool.status === 'complete' && <CheckCircle2 size={12} className="text-green-500" />}
                {tool.status === 'error' && <AlertCircle size={12} className="text-red-500" />}

                <span className="font-medium text-gray-700 dark:text-gray-200 font-mono">{tool.name}</span>
                <div className="flex-1" />
                {isOpen ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
            </button>

            {isOpen && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 font-mono space-y-2">
                    <div>
                        <div className="text-[10px] text-gray-400 uppercase mb-0.5">Input</div>
                        <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all">
                            {JSON.stringify(tool.args, null, 2)}
                        </div>
                    </div>
                    {tool.result && (
                        <div>
                            <div className="text-[10px] text-gray-400 uppercase mb-0.5">Result</div>
                            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
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

const AgentMessage = memo(({ block, isLast }: { block: ChatBlock & { type: "agent" }, isLast: boolean }) => {
    return (
        <div className="flex items-start gap-3 group mb-6">
            <div className="w-6 h-6 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </div>

            <div className="flex flex-col flex-1 max-w-[90%] min-w-0">
                {block.toolCalls.length > 0 && (
                    <div className="mb-2 w-full max-w-md">
                        {block.toolCalls.map(tool => <ToolCard key={tool.id} tool={tool} />)}
                    </div>
                )}

                {(block.content || isLast) && (
                    <div className="relative">
                        <div className="prose prose-sm prose-gray dark:prose-invert max-w-none text-sm leading-relaxed text-gray-800 dark:text-gray-100 inline">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
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
                                {block.content}
                            </ReactMarkdown>
                            {isLast && (
                                <span className="inline-block w-1.5 h-3.75 bg-black dark:bg-white ml-1 animate-[pulse_1s_infinite] vertical-middle" />
                            )}
                        </div>
                        <MessageActions content={block.content} onFeedback={(t) => console.log(t)} />
                    </div>
                )}
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

    const hasMessages = thread.messages && thread.messages.length > 0;
    const chatBlocks = useMemo(() => groupMessages(thread.messages), [thread.messages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatBlocks.length, thread.isLoading]);

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
                        {chatBlocks.map((block, index) => {
                            const isLast = index === chatBlocks.length - 1;
                            const key = block.id;
                            if (block.type === "user") {
                                return (
                                    <UserMessage
                                        key={key}
                                        content={block.content}
                                        userImage={user?.imageUrl}
                                        onEdit={(txt) => setInputValue(txt)}
                                    />
                                );
                            } else {
                                return <AgentMessage key={key} block={block} isLast={isLast && thread.isLoading} />;
                            }
                        })}
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