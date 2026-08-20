export declare type AppendIfNotExists = "None" | "End" | "Start";

export declare type ComposeContext = {
    failOnCollision: boolean;
};

declare const deepJsonWriter: Writer;
export { deepJsonWriter as DeepJsonWriter }
export { deepJsonWriter }

declare type FileWriter = (path: string, content: string) => Promise<void>;

declare const lineUpsertWriter: Writer;
export { lineUpsertWriter as LineUpsertWriter }
export { lineUpsertWriter }

export declare class Patch {
    readonly target: string;
    readonly content: string;
    readonly options?: Readonly<PatchOptions>;
    constructor({ target, content, options, }: {
        target: string;
        content: string;
        options?: PatchOptions;
    });
}

export declare class PatchMerger {
    #private;
    constructor({ failOnCollision, parallelWriteMode, fileWriter, }?: PatchMergerOptions);
    registerWriter(key: string, writer: Writer): void;
    add(patch: Patch): void;
    apply(rootDir: string): Promise<string[]>;
}

export declare type PatchMergerOptions = {
    failOnCollision?: boolean;
    parallelWriteMode?: boolean;
    fileWriter?: FileWriter;
};

export declare type PatchOptions = {
    failIfExists?: boolean;
    jsonTarget?: string;
    sections?: string[];
    appendIfNotExists?: "None" | "End" | "Start";
};

declare const sectionWriter: Writer;
export { sectionWriter as SectionWriter }
export { sectionWriter }

export declare type Writer = (patches: Patch[], ctx: ComposeContext) => string | null;

export { }
