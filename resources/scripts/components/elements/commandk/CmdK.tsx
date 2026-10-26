import {
    ArrowDownToLine,
    Box,
    BranchesDown,
    ClockArrowRotateLeft,
    CloudArrowUpIn,
    Database,
    File,
    FolderOpen,
    Gear,
    House,
    PencilToLine,
    Persons,
    Power,
    Terminal,
} from '@gravity-ui/icons';
import { Command, defaultFilter } from 'cmdk';
import { dirname, join } from 'pathe';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import loadDirectory, { type FileObject } from '@/api/server/files/loadDirectory';

import Can from '@/components/elements/Can';
import { encodePathSegments } from '@/helpers';
import { useTranslation } from '@/i18n/I18nProvider';
import { usePermissions } from '@/plugins/usePermissions';

import { ServerContext } from '@/state/server';

type IndexedFile = { path: string; file: FileObject };

// shortcut: crawls the tree client-side since the daemons expose no search endpoint; capped so huge servers stay responsive.
const MAX_DIRECTORIES = 300;
const MAX_DEPTH = 6;
const MAX_RESULTS = 50;

const crawlFiles = async (uuid: string, isCancelled: () => boolean): Promise<IndexedFile[]> => {
    const results: IndexedFile[] = [];
    let level = ['/'];
    let fetched = 0;

    for (let depth = 0; depth < MAX_DEPTH && level.length && !isCancelled(); depth++) {
        const batch = level.slice(0, MAX_DIRECTORIES - fetched);
        fetched += batch.length;
        const listings = await Promise.all(batch.map((dir) => loadDirectory(uuid, dir).catch(() => [])));

        level = [];
        listings.forEach((files, i) => {
            for (const file of files) {
                const path = join(batch[i] ?? '/', file.name);
                results.push({ path, file });
                if (!file.isFile && !file.isSymlink) level.push(path);
            }
        });
    }

    return results;
};

const CommandMenu = () => {
    const [open, setOpen] = useState(false);
    const id = ServerContext.useStoreState((state) => state.server.data?.id);
    const navigate = useNavigate();
    const { t } = useTranslation();
    // controls server power status
    const status = ServerContext.useStoreState((state) => state.status.value);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const [canReadFiles, canReadContents] = usePermissions(['file.read', 'file.read-content']);
    const [search, setSearch] = useState('');
    const [files, setFiles] = useState<IndexedFile[] | null>(null);

    // Re-index each time the menu opens so new files show up.
    useEffect(() => {
        if (!open || !uuid || !canReadFiles) return;

        let cancelled = false;
        crawlFiles(uuid, () => cancelled).then((indexed) => !cancelled && setFiles(indexed));

        return () => {
            cancelled = true;
        };
    }, [open, uuid, canReadFiles]);

    const fileMatches = useMemo(() => {
        if (!files || !search.trim()) return [];

        return files
            .map((entry) => ({ entry, score: defaultFilter(entry.path, search) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_RESULTS)
            .map(({ entry }) => entry);
    }, [files, search]);

    const fileUrl = ({ path, file }: IndexedFile) => {
        if (!file.isFile) return `/files#${encodePathSegments(path)}`;
        if (file.isEditable() && canReadContents) return `/files/edit${encodePathSegments(path)}`;

        return `/files#${encodePathSegments(dirname(path))}`;
    };

    const cmdkPowerAction = (action: string) => {
        if (instance) {
            if (action === 'start') {
                toast.success(t('server.console.power_starting'));
            } else if (action === 'restart') {
                toast.success(t('server.console.power_restarting'));
            } else {
                toast.success(t('server.console.power_stopping'));
            }
            setOpen(false);
            instance.send('set state', action === 'kill-confirmed' ? 'kill' : action);
        }
    };

    const cmdkNavigate = (url: string) => {
        navigate(`/server/${id}${url}`);
        setOpen(false);
    };

    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <Command.Dialog open={open} onOpenChange={setOpen} label={t('panel.command_menu')}>
            <Command.Input value={search} onValueChange={setSearch} />
            <Command.List>
                <Command.Empty>{t('common.no_results')}</Command.Empty>

                <Command.Group heading={t('common.pages')}>
                    <Command.Item onSelect={() => cmdkNavigate('')}>
                        <House fill='currentColor' />
                        {t('navigation.home')}
                    </Command.Item>
                    <Can action={'file.*'} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/files')}>
                            <FolderOpen fill='currentColor' />
                            {t('navigation.files')}
                        </Command.Item>
                    </Can>
                    <Can action={'database.*'} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/databases')}>
                            <Database fill='currentColor' />
                            {t('navigation.databases')}
                        </Command.Item>
                    </Can>
                    <Can action={'backup.*'} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/backups')}>
                            <CloudArrowUpIn fill='currentColor' />
                            {t('navigation.backups')}
                        </Command.Item>
                    </Can>
                    <Can action={'allocation.*'} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/network')}>
                            <BranchesDown fill='currentColor' />
                            {t('navigation.networking')}
                        </Command.Item>
                    </Can>
                    <Can action={'user.*'} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/users')}>
                            <Persons fill='currentColor' />
                            {t('navigation.users')}
                        </Command.Item>
                    </Can>
                    <Can action={['startup.*']} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/startup')}>
                            <Terminal fill='currentColor' />
                            {t('navigation.startup')}
                        </Command.Item>
                    </Can>
                    <Can action={['schedule.*']} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/schedules')}>
                            <ClockArrowRotateLeft fill='currentColor' />
                            {t('navigation.schedules')}
                        </Command.Item>
                    </Can>
                    <Can action={['settings.*', 'file.sftp']} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/settings')}>
                            <Gear fill='currentColor' />
                            {t('navigation.settings')}
                        </Command.Item>
                    </Can>
                    <Can action={['activity.*']} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/activity')}>
                            <PencilToLine fill='currentColor' />
                            {t('navigation.activity')}
                        </Command.Item>
                    </Can>
                    <Can action={['mod.download']} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/installer')}>
                            <ArrowDownToLine fill='currentColor' />
                            {t('navigation.installer')}
                        </Command.Item>
                    </Can>
                    <Can action={['software.*']} matchAny>
                        <Command.Item onSelect={() => cmdkNavigate('/shell')}>
                            <Box fill='currentColor' />
                            {t('navigation.software')}
                        </Command.Item>
                    </Can>
                </Command.Group>
                {fileMatches.length > 0 && (
                    <Command.Group heading={t('navigation.files')}>
                        {fileMatches.map((entry) => (
                            <Command.Item
                                key={entry.path}
                                value={entry.path}
                                onSelect={() => cmdkNavigate(fileUrl(entry))}
                            >
                                {entry.file.isFile ? <File fill='currentColor' /> : <FolderOpen fill='currentColor' />}
                                {entry.path}
                            </Command.Item>
                        ))}
                    </Command.Group>
                )}
                <Command.Group heading={t('common.server')}>
                    <Can action={'control.start'}>
                        <Command.Item disabled={status !== 'offline'} onSelect={() => cmdkPowerAction('start')}>
                            <Power fill='currentColor' />
                            {t('server.console.start_server')}
                        </Command.Item>
                    </Can>
                    <Can action={'control.restart'}>
                        <Command.Item disabled={!status} onSelect={() => cmdkPowerAction('restart')}>
                            <Power fill='currentColor' />
                            {t('server.console.restart_server')}
                        </Command.Item>
                    </Can>
                    <Can action={'control.restart'}>
                        <Command.Item disabled={status === 'offline'} onSelect={() => cmdkPowerAction('stop')}>
                            <Power fill='currentColor' />
                            {t('server.console.stop_server')}
                        </Command.Item>
                    </Can>
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
};

export default CommandMenu;
