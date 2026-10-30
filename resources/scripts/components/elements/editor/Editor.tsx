import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import * as monaco from 'monaco-editor';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAppearance } from '@/contexts/AppearanceContext';

function findLanguageByFilename(filename: string): LanguageDescription | undefined {
    const language = LanguageDescription.matchFilename(languages, filename);
    if (language !== null) {
        return language;
    }

    return undefined;
}

// The language picker still lists CodeMirror's language descriptions; map one to a Monaco
// language by name or alias first, then by file extension.
function toMonacoLanguage(language: LanguageDescription | undefined): string {
    if (language === undefined) {
        return 'plaintext';
    }

    const names = [language.name, ...language.alias].map((name) => name.toLowerCase());
    const extensions = language.extensions.map((extension) => `.${extension}`);
    const monacoLanguages = monaco.languages.getLanguages();

    return (
        monacoLanguages.find(
            (l) => names.includes(l.id) || l.aliases?.some((alias) => names.includes(alias.toLowerCase())),
        )?.id ??
        monacoLanguages.find((l) => l.extensions?.some((extension) => extensions.includes(extension)))?.id ??
        'plaintext'
    );
}

export interface EditorProps {
    // DOM
    className?: string;
    style?: CSSProperties;

    // Language
    language?: LanguageDescription;

    // Options
    filename?: string;
    initialContent?: string;

    // ?
    fetchContent?: (callback: () => Promise<string>) => void;

    // Events
    onContentSaved?: () => void;
    onLanguageChanged?: (language: LanguageDescription | undefined) => void;
}

export default function Editor(props: EditorProps) {
    const { theme } = useAppearance();
    const ref = useRef<HTMLDivElement>(null);

    const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();

    // The save command is registered once, so it reads the latest callback through a ref.
    const onContentSaved = useRef(props.onContentSaved);
    onContentSaved.current = props.onContentSaved;

    // biome-ignore lint/correctness/useExhaustiveDependencies: the editor is created once; theme changes go through setTheme.
    useEffect(() => {
        if (ref.current === null) {
            return;
        }

        const __editor = monaco.editor.create(ref.current, {
            theme: theme === 'dark' ? 'vs-dark' : 'vs',
            automaticLayout: true,
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            // Spaces, not a literal tab. Game configs (yaml, json, properties) almost all want this,
            // and files that already use tabs are detected and left alone.
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            renderWhitespace: 'none',
        });
        __editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onContentSaved.current?.());
        setEditor(__editor);

        return () => {
            __editor.dispose();
            setEditor(undefined);
        };
    }, []);

    useEffect(() => {
        monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
    }, [theme]);

    useEffect(() => {
        // setValue clears undo history and moves the cursor, so skip it when a save hands back the same content.
        const content = props.initialContent ?? '';
        if (editor !== undefined && editor.getValue() !== content) {
            editor.setValue(content);
        }
    }, [editor, props.initialContent]);

    useEffect(() => {
        if (editor === undefined) {
            return;
        }

        const language = props.language ?? findLanguageByFilename(props.filename ?? '');
        const model = editor.getModel();
        if (model !== null) {
            monaco.editor.setModelLanguage(model, toMonacoLanguage(language));
        }

        if (language !== undefined && props.onLanguageChanged !== undefined) {
            props.onLanguageChanged(language);
        }
    }, [editor, props.filename, props.language, props.onLanguageChanged]);

    // Runs on every render: callers keep the callback in a plain variable that is reset each render.
    useEffect(() => {
        if (props.fetchContent === undefined) {
            return;
        }

        if (!editor) {
            props.fetchContent(async () => {
                throw new Error('no editor session has been configured');
            });
            return;
        }

        props.fetchContent(async () => editor.getValue());
    }, [editor, props]);

    return <div ref={ref} className={props.className} style={props.style} />;
}
