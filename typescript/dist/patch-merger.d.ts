/** Assemble every target from the persisted pieces in `patchesDir`: read all `*.json` pieces in emit order (filename sort), group by project-root-relative target, compose each with its filename-keyed writer, and write the result under `outRoot`. Pure composition — no target is read off disk. Returns the composed `{ file, contents }[]` so the run can record them without re-reading disk. */
export declare function assemblePatches({ patchesDir, outRoot, writeTextFile, settings, }: {
    patchesDir: string;
    outRoot: string;
    writeTextFile?: WriteTextFile;
    settings?: ComposeSettings;
}): Promise<{
    file: string;
    contents: string;
}[]>;

/** Compose a target file from its pieces — order-independent, no target read off disk. The filename-keyed writer identifies its own skeleton piece and fills/merges the rest; returns null when the pieces don't materialize the file (no owner/skeleton). `settings` is the run's resolved settings so a writer can derive the output layout (the root `.dockerignore` derives its per-lane ignore prefixes from the declared languages + tier); writers that don't need it ignore the second arg. */
export declare function composePatchTarget({ target, pieces, settings, }: {
    target: string;
    pieces: PatchEntry[];
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

export declare interface EnsureLinesInMarkedBlockArgs {
    filePath: string;
    startMarker: string;
    endMarker: string;
    lines: string[];
    contextLabel?: string;
}

export declare function formatPatchEntryLine(entry: PatchEntry): string;

/** Insert `COPY <src> <dest>` lines idempotently at the anchor section's marked region (or after the last COPY line). Unchanged when every line is already present. */
export declare function insertDockerfileCopies(content: string, copies: DockerfileCopy[], anchorSection?: string): string;

export declare function isPatchTarget(target: string): boolean;

export declare function isSharedPatchTarget(target: string): boolean;

export declare function makePatchEntry({ target, content, section, }: {
    target: string;
    content: string;
    section?: string;
}): PatchEntry;

export declare class MarkedFileEditor {
    writeTextFile: WriteTextFile;
    constructor({ writeTextFile }?: {
        writeTextFile?: WriteTextFile;
    });
    patchMarkedBlock({ filePath, startMarker, endMarker, block, missingFileOk, contextLabel, }: PatchMarkedBlockArgs): Promise<boolean>;
    ensureLinesInMarkedBlock({ filePath, startMarker, endMarker, lines, contextLabel, }: EnsureLinesInMarkedBlockArgs): Promise<boolean>;
}

export declare class MarkedSectionMissingError extends Error {
    constructor(message: string);
}

export declare function parsePatchEntryLine(line: string): PatchEntry | null;

export declare const PATCH_ENTRY_LINE_PREFIX = "DETERMINISTIC_PATCH ";

export declare type PatchEntry = {
    kind: "patch";
    target: string;
    content: string;
    section?: string;
};

export declare const PATCHES_DIR = "deterministic/patches";

export declare interface PatchMarkedBlockArgs {
    filePath: string;
    startMarker: string;
    endMarker: string;
    block: string;
    missingFileOk?: boolean;
    contextLabel?: string;
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
    hasEntries(): boolean;
    apply(rootDir: string): Promise<string[]>;
}

/** Deterministic piece filename: a zero-padded emit-order index (the assemble sort key, so shared-append upserts stay in emit order) plus the sanitized project-root-relative target for readability. Uniqueness comes from the index; the index owner (EmitPlan) makes it monotonic across steps. */
export declare function patchPieceFilename(index: number, target: string): string;

declare type PatchWriter = (pieces: PatchEntry[], settings?: ComposeSettings) => string | null;

/** The patch writer for a target file, dispatched by basename|extension. Null when none is registered. */
export declare function patchWriterFor(target: string): PatchWriter | null;

declare interface ReplaceMarkedBlockArgs {
    original: string;
    startMarker: string;
    endMarker: string;
    block: string;
}

export declare function replaceMarkedBlockText({ original, startMarker, endMarker, block, }: ReplaceMarkedBlockArgs): string;

declare interface SharedFileConvention {
    skeleton: string;
    indent: string;
    sectionPrefix: string;
}

declare type WriteTextFile = (path: string, content: string) => Promise<void>;

export { }
