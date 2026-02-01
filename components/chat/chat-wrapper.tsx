import { CHAT_PROFILE_QUERY } from '@/lib/sanity.queries';
import { sanityFetch } from '@/sanity/lib/live';
// import SidebarToggle from '../sidebar-toggle';
import Chat from './chat';

async function ChatWrapper() {
    const { data: profile } = await sanityFetch({ query: CHAT_PROFILE_QUERY });
    return (
        <div className="h-full w-full">
            <Chat profile={profile} />
        </div>
    )
}

export default ChatWrapper
