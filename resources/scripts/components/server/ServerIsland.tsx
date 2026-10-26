import { ArrowUp01Icon, MinusSignIcon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import Console from '@/components/server/console/Console';
import PowerButtons from '@/components/server/header/PowerButtons';
import ServerDetailsHeader from '@/components/server/header/ServerDetailsHeader';
import { StatusPillHeader } from '@/components/server/header/StatusPillHeader';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { usePersistedState } from '@/plugins/usePersistedState';
import { ServerContext } from '@/state/server';

// Floating bar at the bottom of every server page except the console: status, name, live stats,
// power actions and a pop-out console.
const ServerIsland = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const reduceMotion = useReducedMotion();
    const id = ServerContext.useStoreState((state) => state.server.data?.id);
    const name = ServerContext.useStoreState((state) => state.server.data?.name);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const inConflictState = ServerContext.useStoreState((state) => state.server.inConflictState);
    const [minimized, setMinimized] = usePersistedState('server_island:minimized', false);
    const [consoleOpen, setConsoleOpen] = useState(false);

    if (!id || inConflictState || location.pathname.replace(/\/+$/, '') === `/server/${id}`) {
        return null;
    }

    const statusLabel =
        status === 'offline'
            ? t('server.status.offline')
            : status === 'running'
              ? t('server.status.online')
              : status === 'stopping'
                ? t('server.status.stopping')
                : status === 'starting'
                  ? t('server.status.starting')
                  : t('server.status.fetching');
    const transition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, bounce: 0.2, duration: 0.4 };

    return (
        <div className='pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] z-[9995] flex flex-col items-center gap-3 px-4 lg:bottom-6'>
            <AnimatePresence>
                {consoleOpen && !minimized && (
                    <motion.div
                        key='island-console'
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={transition}
                        className='pointer-events-auto flex h-[min(28rem,60vh)] w-full max-w-4xl rounded-3xl border border-mocha-400 bg-bg-lowered/95 p-2 shadow-2xl backdrop-blur'
                    >
                        <Console />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                layout
                transition={transition}
                className='pointer-events-auto flex max-w-full items-center gap-4 rounded-full border border-mocha-400 bg-bg-lowered/90 py-2 pr-2 pl-4 shadow-xl backdrop-blur'
            >
                <motion.div layout='position' className='flex min-w-0 items-center gap-3'>
                    <StatusPillHeader />
                    <div className='flex min-w-0 flex-col leading-tight'>
                        <span className='max-w-48 truncate text-sm font-semibold'>{name}</span>
                        <span className='text-xs font-bold uppercase text-cream-400/50'>{statusLabel}</span>
                    </div>
                </motion.div>

                {!minimized && (
                    <motion.div
                        layout='position'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className='flex items-center gap-4'
                    >
                        <ServerDetailsHeader className='hidden xl:flex' />
                        <PowerButtons className='flex items-center gap-2' />
                        <Button
                            variant='secondary'
                            size='sm'
                            className='size-8 rounded-full p-1'
                            aria-expanded={consoleOpen}
                            aria-label={
                                consoleOpen ? t('server.island.close_console') : t('server.island.open_console')
                            }
                            onClick={() => setConsoleOpen((open) => !open)}
                        >
                            <HugeiconsIcon
                                size={16}
                                icon={ArrowUp01Icon}
                                className={cn('transition-transform', consoleOpen && 'rotate-180')}
                            />
                        </Button>
                    </motion.div>
                )}

                <Button
                    variant='secondary'
                    size='sm'
                    className='size-8 rounded-full p-1'
                    aria-label={minimized ? t('server.island.expand') : t('server.island.minimize')}
                    onClick={() => setMinimized(!minimized)}
                >
                    <HugeiconsIcon size={16} icon={minimized ? PlusSignIcon : MinusSignIcon} />
                </Button>
            </motion.div>
        </div>
    );
};

export default ServerIsland;
