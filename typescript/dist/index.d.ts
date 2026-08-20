export declare type AppendIfNotExists = "None" | "End" | "Start";

export declare type ComposeContext = {
    failOnCollision: boolean;
};

declare const deepJsonWriter: Writer;
export { deepJsonWriter as DeepJsonWriter }
export { deepJsonWriter }

declare const deepXmlWriter: Writer;
export { deepXmlWriter as DeepXmlWriter }
export { deepXmlWriter }

declare const deepYamlWriter: Writer;
export { deepYamlWriter as DeepYamlWriter }
export { deepYamlWriter }

export declare const defaultWriters: WriterBinding[];

export declare type IPatchApplyStrategy = {
    apply(target: string, contents: string, rootDir: string): Promise<void>;
};

export declare class IPatchFileSystemApplyStrategy implements IPatchApplyStrategy {
    #private;
    apply(target: string, contents: string, rootDir: string): Promise<void>;
}

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
    constructor({ failOnCollision, parallelWriteMode, writers, applyStrategy, }?: PatchMergerOptions);
    registerWriter(glob: string, writer: Writer): void;
    add(patch: Patch): void;
    apply(rootDir: string, strategy?: IPatchApplyStrategy): Promise<string[]>;
}

export declare type PatchMergerOptions = {
    failOnCollision?: boolean;
    parallelWriteMode?: boolean;
    writers?: Iterable<WriterBinding>;
    applyStrategy?: IPatchApplyStrategy;
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

export declare type WriterBinding = readonly [glob: string, writer: Writer];

export { }
