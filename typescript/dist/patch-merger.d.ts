export declare function assemblePatches({ patchesDir, outRoot, writeTextFile, settings, }: {
    patchesDir: string;
    outRoot: string;
    writeTextFile?: WriteTextFile;
    settings?: ComposeSettings;
}): Promise<{
    file: string;
    contents: string;
}[]>;

export declare function composePatchTarget({ target, pieces, settings, }: {
    target: string;
    pieces: WriterPiece[];
    settings?: ComposeSettings;
}): string | null;

declare type ComposeSettings = {
    backend?: {
        languages?: string[];
    };
    applicationTier?: string;
} | null | undefined;

export declare function formatPatchEntryLine(entry: PatchEntry): string;

export declare function isPatchTarget(target: string): boolean;

export declare function makePatchEntry(args: {
    target: string;
    content: string;
    section?: string;
}): PatchEntry;

export declare function parsePatchEntryLine(line: string): PatchEntry | null;

export declare const PATCH_ENTRY_LINE_PREFIX = "DETERMINISTIC_PATCH ";

export declare class PatchEntry {
    readonly kind: "patch";
    readonly target: string;
    readonly content: string;
    readonly section?: string;
    constructor({ target, content, section, }: {
        target: string;
        content: string;
        section?: string;
    });
    static parse(value: unknown): PatchEntry;
    static readDir(dir: string): Promise<PatchEntry[]>;
}

export declare class PatchMerger {
    writeTextFile: WriteTextFile;
    settings: ComposeSettings;
    entries: PatchEntry[];
    constructor({ writeTextFile, settings, }?: {
        writeTextFile?: WriteTextFile;
        settings?: ComposeSettings;
    });
    register(entry: PatchEntry): void;
    apply(rootDir: string): Promise<string[]>;
}

declare type WriterPiece = {
    target: string;
    content: string;
    section?: string;
};

declare type WriteTextFile = (path: string, content: string) => Promise<void>;

export { }
