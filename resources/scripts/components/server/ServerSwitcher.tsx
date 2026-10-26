import { Check, ChevronDown } from '@gravity-ui/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';

import getServers from '@/api/getServers';
import getServerGroups from '@/api/serverGroups';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/elements/DropdownMenu';
import { useTranslation } from '@/i18n/I18nProvider';
import { ServerContext } from '@/state/server';

// Header dropdown that jumps to another server, listed under the user's groups.
const ServerSwitcher = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const id = ServerContext.useStoreState((state) => state.server.data?.id);
    const name = ServerContext.useStoreState((state) => state.server.data?.name);
    const clearServerState = ServerContext.useStoreActions((actions) => actions.clearServerState);

    // shortcut: only the first page (50) of servers is listed, add search if someone outgrows it.
    const { data: servers } = useSWR(open ? 'server-switcher:servers' : null, () => getServers({}));
    const { data: groups } = useSWR(open ? 'server-switcher:groups' : null, () => getServerGroups().catch(() => []));

    const sections = [...(groups ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((group) => ({
            key: `group-${group.id}`,
            label: group.name,
            items: (servers?.items ?? []).filter((server) => server.group?.id === group.id),
        }));
    const grouped = new Set(sections.flatMap((section) => section.items));
    sections.push({
        key: 'ungrouped',
        label: sections.length > 0 ? t('dashboard.groups.ungrouped') : '',
        items: (servers?.items ?? []).filter((server) => !grouped.has(server)),
    });
    const visible = sections.filter((section) => section.items.length > 0);

    const switchTo = (serverId: string) => {
        if (serverId === id) return;
        // Unmount the old server's pages and socket so nothing carries over to the new one.
        clearServerState();
        navigate(`/server/${serverId}`);
    };

    if (!name) return null;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type='button'
                    aria-label={t('server.switcher.label')}
                    className='flex h-8 min-w-0 max-w-56 items-center gap-2 rounded-full border border-[#ffffff12] px-3 text-sm font-semibold text-cream-50 hover:bg-[#ffffff11] cursor-pointer select-none'
                >
                    <span className='truncate'>{name}</span>
                    <ChevronDown width={16} height={16} fill='currentColor' className='shrink-0 opacity-60' />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align='start'
                sideOffset={6}
                className='z-99999 w-[268px] max-h-[60vh] overflow-y-auto select-none'
            >
                {!servers && (
                    <DropdownMenuLabel className='font-normal opacity-60'>{t('common.loading')}</DropdownMenuLabel>
                )}
                {visible.map((section, index) => (
                    <div key={section.key}>
                        {index > 0 && <DropdownMenuSeparator />}
                        {section.label && (
                            <DropdownMenuLabel className='text-xs font-medium uppercase tracking-wide opacity-50'>
                                {section.label}
                            </DropdownMenuLabel>
                        )}
                        {section.items.map((server) => (
                            <DropdownMenuItem
                                key={server.id}
                                onSelect={() => switchTo(server.id)}
                                className='justify-between gap-2'
                            >
                                <span className='truncate'>{server.name}</span>
                                {server.id === id && (
                                    <Check width={16} height={16} fill='currentColor' className='shrink-0' />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ServerSwitcher;
