declare type IWriter = (path: string, content: string) => Promise<void>;

export declare class Patch {
    readonly target: string;
    readonly content: string;
    readonly section?: string;
    constructor({ target, content, section, }: {
        target: string;
        content: string;
        section?: string;
    });
}

export declare class PatchMerger {
    #private;
    private writer;
    constructor(writer?: IWriter);
    registerWriter(key: string, writer: Writer): void;
    add(patch: Patch): void;
    apply(rootDir: string): Promise<string[]>;
}

export declare type Writer = (patches: Patch[]) => string | null;

export { }
