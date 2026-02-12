import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "edge";

function getRemoteUrl(pathSegments: string[], searchParams: URLSearchParams) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL!;
    const remotePath = pathSegments.join("/");

    const absoluteBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const remoteUrl = new URL(remotePath, absoluteBase);

    searchParams.forEach((val, key) => remoteUrl.searchParams.set(key, val));

    return remoteUrl.toString();
}

const getHeaders = () => ({
    "X-Api-Key": process.env.LANGSMITH_API_KEY!,
    "X-Organization-Id": process.env.LANGSMITH_ORGANIZATION_ID!,
    "X-Tenant-Id": process.env.LANGSMITH_WORKSPACE_ID!,
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const { userId } = await auth();
    const { path } = await params
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const targetUrl = getRemoteUrl(path || [], req.nextUrl.searchParams);

    const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
            ...getHeaders(),
            "Content-Type": "application/json"
        },
        body: req.body,
        // @ts-ignore
        duplex: "half",
    });

    return new Response(response.body, {
        status: response.status,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const { userId } = await auth();
    const { path } = await params

    if (!userId) return new Response("Unauthorized", { status: 401 });

    const targetUrl = getRemoteUrl(path || [], req.nextUrl.searchParams);

    const response = await fetch(targetUrl, {
        method: "GET",
        headers: getHeaders(),
    });

    return new Response(response.body, { status: response.status });
}