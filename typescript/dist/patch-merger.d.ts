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

export declare function conventionForTarget(target: string): SharedFileConvention | null;

declare interface DockerfileCopy {
    src: string;
    dest: string;
    workdirRelative?: boolean;
}

export declare const DOCKERIGNORE_TRIGGER = "# the root .dockerignore is composed from settings by the dockerignore writer";

export declare function dockerignoreSection(language: string): string;

export declare function formatPatchEntryLine(entry: PatchEntry): string;

export declare function insertDockerfileCopies(content: string, copies: DockerfileCopy[], anchorSection?: string): string;

export declare function isPatchTarget(target: string): boolean;

export declare function isSharedPatchTarget(target: string): boolean;

export declare function makePatchEntry(args: {
    target: string;
    content: string;
    section?: string;
}): PatchEntry;

export declare class MarkedSectionMissingError extends Error {
    constructor(message: string);
}

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
}

export declare const PATCHES_DIR = "deterministic/patches";

export declare class PatchMerger {
    writeTextFile: WriteTextFile;
    settings: ComposeSettings;
    entries: PatchEntry[];
    constructor({ writeTextFile, settings, }?: {
        writeTextFile?: WriteTextFile;
        settings?: ComposeSettings;
    });
    register(entry: PatchEntry): void;
    hasEntries(): boolean;
    apply(rootDir: string): Promise<string[]>;
}

export declare function patchPieceFilename(index: number, target: string): string;

declare type PatchWriter = (pieces: WriterPiece[], settings?: ComposeSettings) => string | null;

export declare function patchWriterFor(target: string): PatchWriter | null;

export declare function replaceMarkedBlockText({ original, startMarker, endMarker, block, }: {
    original: string;
    startMarker: string;
    endMarker: string;
    block: string;
}): string;

declare interface SharedFileConvention {
    skeleton: string;
    indent: string;
    sectionPrefix: string;
}

declare type WriterPiece = {
    target: string;
    content: string;
    section?: string;
};

declare type WriteTextFile = (path: string, content: string) => Promise<void>;

export { }
